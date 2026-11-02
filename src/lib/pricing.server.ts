// Preise, Rabatt-Aktionen und Gutscheincodes. Gerechnet wird NUR hier auf dem Server.
// Reihenfolge: Grundpreis → Aktion (%) → Gutscheincode (%), nach jedem Schritt auf Cent gerundet.

import { getConfig } from "./config.server";
import { cfg, rest } from "./purchases.server";
import type { PlanId } from "./telegram.functions";

export interface Promotion {
  id: string;
  plan: "all" | PlanId;
  percent: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
  created_by?: string | null;
  start_notified?: boolean;
  end_notified?: boolean;
}

export interface Coupon {
  code: string;
  percent: number;
  plans: "all" | PlanId;
  max_uses: number | null;
  uses: number;
  once_per_account: boolean;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  created_by?: string | null;
}

const memPromos: Promotion[] = [];
const memCoupons: Coupon[] = [];
const memRedemptions: {
  code: string;
  discord_id: string | null;
  token: string | null;
  at: string;
}[] = [];

export const applyPercent = (cents: number, percent: number) =>
  Math.max(0, Math.round((cents * (100 - percent)) / 100));

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : null);

function isRunning(p: Promotion, at: number) {
  const s = ms(p.starts_at);
  const e = ms(p.ends_at);
  return p.active && (s === null || s <= at) && (e === null || e > at);
}

const appliesTo = (target: "all" | PlanId, plan: PlanId) => target === "all" || target === plan;

/* ---------------- Aktionen ---------------- */

export async function listPromotions(): Promise<Promotion[]> {
  if (!cfg()) return [...memPromos].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rest("promotions?select=*&order=created_at.desc&limit=200");
}

export async function createPromotion(p: {
  plan: "all" | PlanId;
  percent: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
}): Promise<Promotion> {
  if (!cfg()) {
    const row: Promotion = {
      id: crypto.randomUUID(),
      active: true,
      created_at: new Date().toISOString(),
      ...p,
    };
    memPromos.push(row);
    return row;
  }
  const rows: Promotion[] = await rest("promotions", { method: "POST", body: JSON.stringify(p) });
  return rows[0]!;
}

export async function updatePromotion(id: string, patch: Partial<Promotion>): Promise<void> {
  if (!cfg()) {
    const p = memPromos.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return;
  }
  await rest(`promotions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

/** Beste laufende Aktion für einen Plan zu einem Zeitpunkt. */
function bestPromo(promos: Promotion[], plan: PlanId, at: number) {
  return promos
    .filter((p) => appliesTo(p.plan, plan) && isRunning(p, at))
    .sort((a, b) => b.percent - a.percent)[0];
}

/** Niedrigster Preis der letzten 30 Tage vor Beginn der aktuellen Aktion (Preisangabenverordnung). */
function lowest30(promos: Promotion[], plan: PlanId, base: number, current?: Promotion) {
  const until = current?.starts_at ? ms(current.starts_at)! : Date.now();
  const from = until - 30 * 864e5;
  let lowest = base;
  for (const p of promos) {
    if (p === current || !appliesTo(p.plan, plan)) continue;
    const s = ms(p.starts_at) ?? ms(p.created_at)!;
    const e = ms(p.ends_at) ?? (p.active ? Infinity : s);
    if (s < until && e > from) lowest = Math.min(lowest, applyPercent(base, p.percent));
  }
  return lowest;
}

export interface PlanPricing {
  plan: PlanId;
  enabled: boolean;
  base: number;
  final: number;
  promo: { percent: number; endsAt: string | null; startsAt: string | null } | null;
  upcoming: { percent: number; startsAt: string } | null;
  lowest30: number; // Vergleichspreis bei Rabatt
}

export async function getPublicPricing(): Promise<{ shopOpen: boolean; plans: PlanPricing[] }> {
  const [config, promos] = await Promise.all([getConfig(), listPromotions()]);
  const now = Date.now();
  const plans = (["monthly", "lifetime"] as PlanId[]).map((plan) => {
    const base = config.prices[plan];
    const promo = bestPromo(promos, plan, now);
    const upcoming = promos
      .filter((p) => p.active && appliesTo(p.plan, plan) && p.starts_at && ms(p.starts_at)! > now)
      .sort((a, b) => ms(a.starts_at)! - ms(b.starts_at)!)[0];
    return {
      plan,
      enabled: config.plansEnabled[plan],
      base,
      final: promo ? applyPercent(base, promo.percent) : base,
      promo: promo
        ? { percent: promo.percent, endsAt: promo.ends_at, startsAt: promo.starts_at }
        : null,
      upcoming: upcoming ? { percent: upcoming.percent, startsAt: upcoming.starts_at! } : null,
      lowest30: promo ? lowest30(promos, plan, base, promo) : base,
    };
  });
  return { shopOpen: config.shopOpen, plans };
}

/* ---------------- Gutscheincodes ---------------- */

export const normalizeCode = (c: string) =>
  c
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");

export async function getCoupon(code: string): Promise<Coupon | null> {
  const c = normalizeCode(code);
  if (!c) return null;
  if (!cfg()) return memCoupons.find((x) => x.code === c) ?? null;
  const rows: Coupon[] = await rest(`coupons?select=*&code=eq.${encodeURIComponent(c)}&limit=1`);
  return rows[0] ?? null;
}

export async function listCoupons(): Promise<Coupon[]> {
  if (!cfg()) return [...memCoupons].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return rest("coupons?select=*&order=created_at.desc&limit=500");
}

export async function createCoupon(
  c: Omit<Coupon, "uses" | "created_at" | "active">,
): Promise<Coupon> {
  const row = { ...c, code: normalizeCode(c.code) };
  if (!row.code || row.code.length < 3) throw new Error("Code zu kurz (mind. 3 Zeichen)");
  if (await getCoupon(row.code)) throw new Error("Diesen Code gibt es schon");
  if (!cfg()) {
    const full: Coupon = { ...row, uses: 0, active: true, created_at: new Date().toISOString() };
    memCoupons.push(full);
    return full;
  }
  const rows: Coupon[] = await rest("coupons", { method: "POST", body: JSON.stringify(row) });
  return rows[0]!;
}

export async function updateCoupon(code: string, patch: Partial<Coupon>): Promise<void> {
  if (!cfg()) {
    const c = memCoupons.find((x) => x.code === code);
    if (c) Object.assign(c, patch);
    return;
  }
  await rest(`coupons?code=eq.${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

export async function deleteCoupon(code: string): Promise<void> {
  if (!cfg()) {
    const i = memCoupons.findIndex((x) => x.code === code);
    if (i >= 0) memCoupons.splice(i, 1);
    return;
  }
  await rest(`coupons?code=eq.${encodeURIComponent(code)}`, { method: "DELETE" });
}

export async function listRedemptions(code?: string) {
  if (!cfg()) return memRedemptions.filter((r) => !code || r.code === code);
  const f = code ? `&code=eq.${encodeURIComponent(code)}` : "";
  return rest(`coupon_redemptions?select=*${f}&order=at.desc&limit=500`) as Promise<
    { code: string; discord_id: string | null; token: string | null; at: string }[]
  >;
}

async function hasRedeemed(code: string, discordId: string) {
  if (!cfg()) return memRedemptions.some((r) => r.code === code && r.discord_id === discordId);
  const rows: unknown[] = await rest(
    `coupon_redemptions?select=id&code=eq.${encodeURIComponent(code)}&discord_id=eq.${encodeURIComponent(discordId)}&limit=1`,
  );
  return rows.length > 0;
}

export type CouponCheck = { ok: true; coupon: Coupon } | { ok: false; error: string };

export async function checkCoupon(
  code: string,
  plan: PlanId,
  discordId: string | null,
): Promise<CouponCheck> {
  const c = await getCoupon(code);
  if (!c || !c.active) return { ok: false, error: "Dieser Gutscheincode ist ungültig." };
  if (c.expires_at && ms(c.expires_at)! <= Date.now()) {
    return { ok: false, error: "Dieser Gutscheincode ist abgelaufen." };
  }
  if (c.max_uses !== null && c.uses >= c.max_uses) {
    return { ok: false, error: "Dieser Gutscheincode ist aufgebraucht." };
  }
  if (!appliesTo(c.plans, plan)) {
    return {
      ok: false,
      error: `Dieser Code gilt nur für ${c.plans === "lifetime" ? "Lifetime" : "Monatlich"}.`,
    };
  }
  if (c.once_per_account) {
    if (!discordId)
      return { ok: false, error: "Für diesen Code musst du mit Discord angemeldet sein." };
    if (await hasRedeemed(c.code, discordId)) {
      return { ok: false, error: "Du hast diesen Code bereits benutzt." };
    }
  }
  return { ok: true, coupon: c };
}

/** Einlösung zählen (atomar). false = in der Zwischenzeit aufgebraucht. */
export async function consumeCoupon(code: string, discordId: string | null, token: string | null) {
  let ok: boolean;
  if (!cfg()) {
    const c = memCoupons.find((x) => x.code === code);
    ok = !!c && c.active && (c.max_uses === null || c.uses < c.max_uses);
    if (ok) c!.uses++;
  } else {
    ok = await rest("rpc/coupon_consume", {
      method: "POST",
      body: JSON.stringify({ p_code: code }),
    });
  }
  if (ok) {
    if (!cfg())
      memRedemptions.unshift({ code, discord_id: discordId, token, at: new Date().toISOString() });
    else
      await rest("coupon_redemptions", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ code, discord_id: discordId, token }),
      });
  }
  return ok;
}

/* ---------------- Endpreis ---------------- */

export interface PriceQuote {
  plan: PlanId;
  base: number;
  promoPercent: number;
  afterPromo: number;
  couponCode: string | null;
  couponPercent: number;
  final: number;
}

export async function quote(plan: PlanId, coupon: Coupon | null): Promise<PriceQuote> {
  const [config, promos] = await Promise.all([getConfig(), listPromotions()]);
  const base = config.prices[plan];
  const promo = bestPromo(promos, plan, Date.now());
  const afterPromo = promo ? applyPercent(base, promo.percent) : base;
  const final = coupon ? applyPercent(afterPromo, coupon.percent) : afterPromo;
  return {
    plan,
    base,
    promoPercent: promo?.percent ?? 0,
    afterPromo,
    couponCode: coupon?.code ?? null,
    couponPercent: coupon?.percent ?? 0,
    final,
  };
}

export const euro = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;
