// Stripe-Bezahlung (Checkout + Webhook) ohne SDK – läuft auf Cloudflare Workers.
// Secrets: STRIPE_SECRET_KEY (sk_test_… / sk_live_…), STRIPE_WEBHOOK_SECRET (whsec_…)

import { audit, getConfig } from "./config.server";
import { PLANS, type PlanId } from "./plans";
import { consumeCoupon, euro, type PriceQuote } from "./pricing.server";
import {
  createPurchaseFromStripe,
  findBySessionId,
  savePurchase,
  type Purchase,
} from "./purchases.server";
import { esc, generateToken, sendTelegram } from "./telegram.functions";

export const SITE = () =>
  (process.env["SITE_URL"] ?? "https://t1mg10hclientstore.lovable.app").replace(/\/$/, "");

export function stripeKey() {
  const k = process.env["STRIPE_SECRET_KEY"];
  return k && /^(sk|rk)_(test|live)_/.test(k) ? k : null;
}

/** Stripe erwartet Formular-Daten mit verschachtelten Schlüsseln, z. B. line_items[0][quantity]. */
function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe(path: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  const key = stripeKey();
  if (!key) throw new Error("STRIPE_SECRET_KEY fehlt");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? form(body).toString() : null,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${json?.error?.message ?? res.status}`);
  return json;
}

export interface StripeSession {
  id: string;
  url?: string;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  livemode: boolean;
  metadata: Record<string, string>;
}

type Buyer = { id: string; username: string } | null;

export async function createCheckoutSession(q: PriceQuote, user: Buyer): Promise<StripeSession> {
  const parts = [
    q.promoPercent ? `Aktion −${q.promoPercent} %` : "",
    q.couponCode ? `Code ${q.couponCode} −${q.couponPercent} %` : "",
  ].filter(Boolean);
  return stripe("checkout/sessions", "POST", {
    mode: "payment",
    locale: "de",
    success_url: `${SITE()}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE()}/#preise`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: q.final,
          product_data: {
            name: `T1mg10h Client – ${PLANS[q.plan].name}`,
            description:
              (q.plan === "lifetime" ? "Einmalig, Updates für immer" : "30 Tage Zugriff") +
              (parts.length ? ` · ${parts.join(" · ")}` : ""),
          },
        },
      },
    ],
    metadata: {
      plan: q.plan,
      coupon: q.couponCode ?? "",
      promo_percent: String(q.promoPercent),
      discord_id: user?.id ?? "",
      discord_username: user?.username ?? "",
    },
  });
}

export const retrieveSession = (id: string): Promise<StripeSession> =>
  stripe(`checkout/sessions/${encodeURIComponent(id)}`, "GET");

async function expiresFor(plan: PlanId) {
  if (plan === "lifetime") return null;
  const { monthlyDays } = await getConfig();
  return new Date(Date.now() + monthlyDays * 864e5).toISOString();
}

async function notifyPurchase(p: Purchase, test: boolean, amount: number) {
  const config = await getConfig();
  if (!config.telegram.purchase) return;
  await sendTelegram(
    `💰 <b>Neuer Kauf${test ? " (TEST)" : ""}</b>\n\n` +
      `📦 Plan: <b>${PLANS[p.plan].name}</b>\n` +
      `💶 Betrag: <b>${euro(amount)}</b>` +
      (p.couponCode ? ` · Code <code>${esc(p.couponCode)}</code>` : "") +
      `\n` +
      (p.discordUsername ? `👤 Discord: ${esc(p.discordUsername)}\n` : "") +
      `🔑 Token: <code>${p.token}</code>\n` +
      `🕒 ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
  ).catch(() => {});
}

async function notifyCoupon(code: string, user: string | null, plan: PlanId) {
  const config = await getConfig();
  if (!config.telegram.coupons) return;
  await sendTelegram(
    `🎟️ <b>Gutscheincode eingelöst</b>\n\nCode: <code>${esc(code)}</code>\nPlan: ${PLANS[plan].name}` +
      (user ? `\nDiscord: ${esc(user)}` : ""),
  ).catch(() => {});
}

/**
 * Bezahlte Session → Token. Idempotent: Webhook und Success-Seite dürfen beide aufrufen,
 * es entsteht trotzdem nur ein Token pro Zahlung.
 */
export async function fulfillSession(session: StripeSession): Promise<Purchase | null> {
  const existing = await findBySessionId(session.id);
  if (existing) return existing;
  if (session.status !== "complete" || session.payment_status !== "paid") return null;

  const plan = session.metadata?.["plan"] as PlanId;
  if (!(plan in PLANS)) throw new Error("Unbekannter Plan in Stripe-Session");

  const amount = session.amount_total ?? 0;
  const coupon = session.metadata?.["coupon"] || null;
  const discordId = session.metadata?.["discord_id"] || null;
  const discordUsername = session.metadata?.["discord_username"] || null;
  const created = await createPurchaseFromStripe({
    token: generateToken(),
    plan,
    price: `${(amount / 100).toFixed(2)}€`,
    purchasedAt: new Date().toISOString(),
    stripeSessionId: session.id,
    livemode: session.livemode,
    amountCents: amount,
    discordId,
    discordUsername,
    expiresAt: await expiresFor(plan),
    couponCode: coupon,
  });
  // Zeitgleicher zweiter Aufruf? Dann gibt es den Eintrag schon.
  if (!created) return findBySessionId(session.id);

  if (coupon) {
    // Bezahlt ist bezahlt: Auch wenn der Code inzwischen aufgebraucht wäre, bekommt der Käufer den Token.
    await consumeCoupon(coupon, discordId, created.token).catch(() => false);
    await notifyCoupon(coupon, discordUsername, plan);
  }
  await audit({
    kind: "shop",
    action: session.livemode ? "purchase" : "purchase_test",
    actor_id: discordId,
    actor_name: discordUsername,
    target: created.token,
    details: { plan, amount, coupon },
  });
  await notifyPurchase(created, !session.livemode, amount);
  return created;
}

/** 0 € (durch 100 %-Code oder 100 %-Aktion): Token ohne Zahlung. null = Code gerade aufgebraucht. */
export async function fulfillFree(q: PriceQuote, user: Buyer): Promise<Purchase | null> {
  const token = generateToken();
  if (q.couponCode && !(await consumeCoupon(q.couponCode, user?.id ?? null, token))) return null;
  const purchasedAt = new Date().toISOString();
  const p: Purchase = {
    token,
    plan: q.plan,
    price: "0.00€",
    purchasedAt,
    redeemedAt: null,
    source: "shop",
    amountCents: 0,
    couponCode: q.couponCode,
    expiresAt: await expiresFor(q.plan),
    discordId: user?.id ?? null,
    discordUsername: user?.username ?? null,
  };
  await savePurchase(p);
  await audit({
    kind: "shop",
    action: "purchase_free",
    actor_id: user?.id ?? null,
    actor_name: user?.username ?? null,
    target: token,
    details: { plan: q.plan, coupon: q.couponCode, promoPercent: q.promoPercent },
  });
  if (q.couponCode) await notifyCoupon(q.couponCode, user?.username ?? null, q.plan);
  await notifyPurchase(p, false, 0);
  return p;
}

/** Prüft die Stripe-Signatur (HMAC-SHA256, max. 5 Minuten alt). */
export async function verifyStripeWebhook(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const items = header.split(",").map((p) => p.trim());
  const t = items.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = items.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => {
    if (s.length !== expected.length) return false;
    let d = 0;
    for (let i = 0; i < s.length; i++) d |= s.charCodeAt(i) ^ expected.charCodeAt(i);
    return d === 0;
  });
}
