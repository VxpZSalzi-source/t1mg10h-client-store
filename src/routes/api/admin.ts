import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin, type AdminUser } from "@/lib/admin.server";
import {
  audit,
  clientIp,
  getConfig,
  readLog,
  rotateAdminPath,
  saveConfig,
  type AppConfig,
} from "@/lib/config.server";
import { IGN_PATTERN, PLANS, type PlanId } from "@/lib/plans";
import {
  createCoupon,
  createPromotion,
  deleteCoupon,
  listCoupons,
  listPromotions,
  listRedemptions,
  normalizeCode,
  updateCoupon,
  updatePromotion,
} from "@/lib/pricing.server";
import {
  deletePurchase,
  findByToken,
  isActive,
  listAll,
  listByCreator,
  patchPurchase,
  savePurchase,
  type Purchase,
} from "@/lib/purchases.server";
import { esc, generateToken, sendTelegram } from "@/lib/telegram.functions";

type Body = Record<string, unknown>;
const ok = (data: Record<string, unknown> = {}) => Response.json({ ok: true, ...data });
const fail = (error: string, status = 400) => Response.json({ ok: false, error }, { status });
const str = (v: unknown, max = 200) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const isoOrNull = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Ungültiges Datum");
  return d.toISOString();
};

const berlinDay = (ms: number) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(ms));

async function notifyAdminAction(text: string) {
  const config = await getConfig();
  if (config.telegram.adminActions) await sendTelegram(text).catch(() => {});
}

/** Was ein Admin (nicht Owner) über einen Token sehen darf */
const adminView = (p: Purchase) => ({
  token: p.token,
  plan: p.plan,
  purchasedAt: p.purchasedAt,
  ign: p.ign,
  note: p.note,
  redeemedAt: p.redeemedAt,
  lastSeenAt: p.lastSeenAt,
  source: p.source,
});

/* ---------------- Dashboard ---------------- */

function dashboard(all: Purchase[]) {
  const now = Date.now();
  const today = berlinDay(now);
  const monthKey = today.slice(0, 7);
  const real = all.filter(
    (p) => p.source !== "admin" && p.livemode !== false && p.amountCents !== null,
  );
  const sum = (list: Purchase[]) => list.reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const inDays = (p: Purchase, d: number) => now - new Date(p.purchasedAt).getTime() < d * 864e5;

  const days: { day: string; sales: number; revenue: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = berlinDay(now - i * 864e5);
    const list = real.filter((p) => berlinDay(new Date(p.purchasedAt).getTime()) === day);
    days.push({ day, sales: list.length, revenue: sum(list) });
  }

  return {
    revenue: {
      today: sum(real.filter((p) => berlinDay(new Date(p.purchasedAt).getTime()) === today)),
      week: sum(real.filter((p) => inDays(p, 7))),
      month: sum(
        real.filter((p) => berlinDay(new Date(p.purchasedAt).getTime()).startsWith(monthKey)),
      ),
      total: sum(real),
    },
    sales: {
      monthly: real.filter((p) => p.plan === "monthly").length,
      lifetime: real.filter((p) => p.plan === "lifetime").length,
      test: all.filter((p) => p.livemode === false).length,
      free: all.filter((p) => p.source !== "admin" && p.amountCents === 0).length,
    },
    licenses: {
      active: all.filter((p) => isActive(p)).length,
      expired: all.filter((p) => !isActive(p)).length,
      activated: all.filter((p) => p.redeemedAt).length,
      admin: all.filter((p) => p.source === "admin").length,
    },
    days,
  };
}

/* ---------------- Config prüfen ---------------- */

function sanitizeConfig(input: unknown, current: AppConfig): AppConfig {
  const c = (input ?? {}) as Partial<AppConfig>;
  const int = (v: unknown, min: number, max: number, def: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
  const rl = (k: keyof AppConfig["rateLimits"]) => ({
    limit: int(c.rateLimits?.[k]?.limit, 0, 10000, current.rateLimits[k].limit),
    windowSec: int(c.rateLimits?.[k]?.windowSec, 10, 86400, current.rateLimits[k].windowSec),
  });
  const t = (k: keyof AppConfig["telegram"]) => bool(c.telegram?.[k], current.telegram[k]);
  return {
    shopOpen: bool(c.shopOpen, current.shopOpen),
    prices: {
      monthly: int(c.prices?.monthly, 50, 100000, current.prices.monthly),
      lifetime: int(c.prices?.lifetime, 50, 100000, current.prices.lifetime),
    },
    plansEnabled: {
      monthly: bool(c.plansEnabled?.monthly, current.plansEnabled.monthly),
      lifetime: bool(c.plansEnabled?.lifetime, current.plansEnabled.lifetime),
    },
    monthlyDays: int(c.monthlyDays, 1, 3650, current.monthlyDays),
    requireLoginToBuy: bool(c.requireLoginToBuy, current.requireLoginToBuy),
    bindToIgn: bool(c.bindToIgn, current.bindToIgn),
    ignResetDays: int(c.ignResetDays, 0, 365, current.ignResetDays),
    offlineDays: int(c.offlineDays, 0, 365, current.offlineDays),
    discordAutoRole: bool(c.discordAutoRole, current.discordAutoRole),
    rateLimits: {
      validate: rl("validate"),
      link: rl("link"),
      adminAccess: rl("adminAccess"),
      checkout: rl("checkout"),
      discordLogin: rl("discordLogin"),
      coupon: rl("coupon"),
    },
    telegram: {
      purchase: t("purchase"),
      activation: t("activation"),
      adminActions: t("adminActions"),
      adminLogin: t("adminLogin"),
      warnings: t("warnings"),
      coupons: t("coupons"),
      promotions: t("promotions"),
    },
    admins: Array.isArray(c.admins)
      ? c.admins
          .map((a) => ({ id: str(a?.id, 30).replace(/\D/g, ""), name: str(a?.name, 40) }))
          .filter((a) => a.id.length >= 15)
          .slice(0, 50)
      : current.admins,
  };
}

/* ---------------- Aktionen ---------------- */

type Handler = (admin: AdminUser, body: Body, request: Request) => Promise<Response>;

const OWNER_ONLY = new Set([
  "dashboard",
  "deleteToken",
  "setIgn",
  "log",
  "getConfig",
  "saveConfig",
  "promotions",
  "createPromotion",
  "endPromotion",
  "coupons",
  "createCoupon",
  "toggleCoupon",
  "deleteCoupon",
  "registerCommands",
  "testTelegram",
  "rotatePath",
]);

const actions: Record<string, Handler> = {
  me: async (a) => ok({ user: { id: a.id, username: a.username, avatar: a.avatar }, role: a.role }),

  list: async (a) => {
    if (a.role === "owner") return ok({ purchases: await listAll() });
    return ok({ purchases: (await listByCreator(a.id)).map(adminView) });
  },

  createToken: async (a, b, req) => {
    const ign = str(b["ign"], 16);
    const note = str(b["note"], 60);
    if (!IGN_PATTERN.test(ign))
      return fail("Ungültiger Ingame-Name (3–16 Zeichen: Buchstaben, Zahlen, _)");
    const token = generateToken();
    const purchasedAt = new Date().toISOString();
    await savePurchase({
      token,
      plan: "lifetime",
      price: "0€",
      purchasedAt,
      ign,
      source: "admin",
      note: note || null,
      createdBy: a.id,
      expiresAt: null,
    });
    await audit({
      kind: "admin",
      action: "token_create",
      actor_id: a.id,
      actor_name: a.username,
      target: token,
      details: { ign, note },
      ip: clientIp(req),
    });
    await notifyAdminAction(
      `🛡️ <b>Admin-Token erstellt</b>\n\n👤 Ingame-Name: <b>${esc(ign)}</b>\n` +
        (note ? `📝 Notiz: ${esc(note)}\n` : "") +
        `✍️ Von: ${esc(a.username)} (${a.role === "owner" ? "Owner" : "Admin"})\n🔑 <code>${token}</code>`,
    );
    return ok({ token, ign });
  },

  deleteToken: async (a, b, req) => {
    const token = str(b["token"], 19).toUpperCase();
    if (!(await deletePurchase(token))) return fail("Token nicht gefunden", 404);
    await audit({
      kind: "admin",
      action: "token_delete",
      actor_id: a.id,
      actor_name: a.username,
      target: token,
      ip: clientIp(req),
    });
    await notifyAdminAction(
      `🗑️ <b>Token gelöscht</b>\n\n🔑 <code>${token}</code>\n✍️ Von: ${esc(a.username)}`,
    );
    return ok();
  },

  setIgn: async (a, b, req) => {
    const token = str(b["token"], 19).toUpperCase();
    const ign = str(b["ign"], 16);
    const p = await findByToken(token);
    if (!p) return fail("Token nicht gefunden", 404);
    if (ign && !IGN_PATTERN.test(ign)) return fail("Ungültiger Ingame-Name");
    if (p.source === "admin") {
      if (!ign) return fail("Admin-Tokens brauchen einen Ingame-Namen");
      await patchPurchase(token, { ign });
    } else {
      // Leer = zurücksetzen (wird beim nächsten Start neu gebunden), sonst fest setzen
      await patchPurchase(token, { redeemed_ign: ign || null });
    }
    await audit({
      kind: "admin",
      action: "ign_set",
      actor_id: a.id,
      actor_name: a.username,
      target: token,
      details: { from: p.ign ?? p.redeemedIgn, to: ign || null },
      ip: clientIp(req),
    });
    return ok();
  },

  dashboard: async () => {
    const [all, recent] = await Promise.all([listAll(), readLog({ limit: 15 })]);
    return ok({ stats: dashboard(all), recent });
  },

  log: async (_a, b) =>
    ok({ entries: await readLog({ kind: str(b["kind"], 20) || undefined, limit: 300 }) }),

  getConfig: async () =>
    ok({ config: await getConfig(), owner: process.env["OWNER_DISCORD_ID"] ?? null }),

  saveConfig: async (a, b, req) => {
    const current = await getConfig();
    const next = sanitizeConfig(b["config"], current);
    await saveConfig(next);
    const changed = Object.keys(next).filter(
      (k) =>
        JSON.stringify(next[k as keyof AppConfig]) !==
        JSON.stringify(current[k as keyof AppConfig]),
    );
    await audit({
      kind: "admin",
      action: "config_save",
      actor_id: a.id,
      actor_name: a.username,
      details: { changed },
      ip: clientIp(req),
    });
    if (changed.length) {
      await notifyAdminAction(
        `⚙️ <b>Einstellungen geändert</b>\n\n${esc(changed.join(", "))}\n✍️ Von: ${esc(a.username)}`,
      );
    }
    return ok({ config: next });
  },

  promotions: async () => ok({ promotions: await listPromotions() }),

  createPromotion: async (a, b, req) => {
    const plan = str(b["plan"]) as "all" | PlanId;
    if (plan !== "all" && !(plan in PLANS)) return fail("Ungültiger Plan");
    const percent = Math.round(Number(b["percent"]));
    if (!(percent >= 1 && percent <= 100)) return fail("Rabatt muss zwischen 1 und 100 % liegen");
    const starts_at = isoOrNull(b["startsAt"]);
    const ends_at = isoOrNull(b["endsAt"]);
    if (ends_at && new Date(ends_at).getTime() <= Date.now())
      return fail("Das Ende liegt in der Vergangenheit");
    if (starts_at && ends_at && starts_at >= ends_at)
      return fail("Ende muss nach dem Start liegen");
    const promo = await createPromotion({ plan, percent, starts_at, ends_at, created_by: a.id });
    await audit({
      kind: "admin",
      action: "promo_create",
      actor_id: a.id,
      actor_name: a.username,
      target: promo.id,
      details: { plan, percent, starts_at, ends_at },
      ip: clientIp(req),
    });
    return ok({ promotion: promo });
  },

  endPromotion: async (a, b, req) => {
    const id = str(b["id"], 40);
    await updatePromotion(id, { active: false });
    await audit({
      kind: "admin",
      action: "promo_end",
      actor_id: a.id,
      actor_name: a.username,
      target: id,
      ip: clientIp(req),
    });
    return ok();
  },

  coupons: async () => ok({ coupons: await listCoupons(), redemptions: await listRedemptions() }),

  createCoupon: async (a, b, req) => {
    const percent = Math.round(Number(b["percent"]));
    if (!(percent >= 1 && percent <= 100)) return fail("Rabatt muss zwischen 1 und 100 % liegen");
    const plans = str(b["plans"]) as "all" | PlanId;
    if (plans !== "all" && !(plans in PLANS)) return fail("Ungültiger Plan");
    const maxRaw = str(b["maxUses"]);
    const max_uses = maxRaw ? Math.max(1, Math.round(Number(maxRaw))) : null;
    let code = normalizeCode(str(b["code"], 32));
    if (!code) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      code = Array.from(
        crypto.getRandomValues(new Uint8Array(8)),
        (x) => chars[x % chars.length],
      ).join("");
    }
    try {
      const coupon = await createCoupon({
        code,
        percent,
        plans,
        max_uses,
        once_per_account: b["oncePerAccount"] !== false,
        expires_at: isoOrNull(b["expiresAt"]),
        created_by: a.id,
      });
      await audit({
        kind: "admin",
        action: "coupon_create",
        actor_id: a.id,
        actor_name: a.username,
        target: coupon.code,
        details: { percent, plans, max_uses },
        ip: clientIp(req),
      });
      return ok({ coupon });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Fehler");
    }
  },

  toggleCoupon: async (a, b, req) => {
    const code = normalizeCode(str(b["code"], 32));
    const active = b["active"] === true;
    await updateCoupon(code, { active });
    await audit({
      kind: "admin",
      action: active ? "coupon_on" : "coupon_off",
      actor_id: a.id,
      actor_name: a.username,
      target: code,
      ip: clientIp(req),
    });
    return ok();
  },

  deleteCoupon: async (a, b, req) => {
    const code = normalizeCode(str(b["code"], 32));
    await deleteCoupon(code);
    await audit({
      kind: "admin",
      action: "coupon_delete",
      actor_id: a.id,
      actor_name: a.username,
      target: code,
      ip: clientIp(req),
    });
    return ok();
  },

  registerCommands: async () => {
    const { registerCommands } = await import("@/lib/discord-bot.server");
    try {
      return ok({ commands: await registerCommands() });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Fehler");
    }
  },

  rotatePath: async (a, _b, req) => {
    const path = await rotateAdminPath();
    await audit({
      kind: "admin",
      action: "admin_path_rotate",
      actor_id: a.id,
      actor_name: a.username,
      ip: clientIp(req),
    });
    await notifyAdminAction(
      `🔁 <b>Admin-Adresse geändert</b>\n\nNeue Adresse: <code>/${path}</code>\n✍️ Von: ${esc(a.username)}`,
    );
    return ok({ path });
  },

  testTelegram: async (a) => {
    try {
      await sendTelegram(
        `🧪 <b>Test</b>\n\nTelegram funktioniert! (ausgelöst von ${esc(a.username)})`,
      );
      return ok();
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Telegram-Fehler");
    }
  },
};

const REASONS = {
  setup: "OWNER_DISCORD_ID ist in Lovable noch nicht gesetzt.",
  login: "Bitte mit Discord anmelden.",
  expired: "Deine Admin-Sitzung ist abgelaufen (12 Std.). Bitte neu anmelden.",
  forbidden: "Kein Zugriff.",
  rate: "Zu viele Versuche.",
  notfound: "Nicht gefunden.",
};

// Eine geschützte Schnittstelle für das ganze Admin-Panel: POST { action, ... }
export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireAdmin(request);
        if (!auth.ok) {
          return Response.json(
            { ok: false, reason: auth.reason, error: REASONS[auth.reason] },
            { status: auth.status },
          );
        }
        const body = (await request.json().catch(() => ({}))) as Body;
        const action = str(body["action"], 40);
        const handler = actions[action];
        if (!handler) return fail("Unbekannte Aktion", 404);
        if (OWNER_ONLY.has(action) && auth.admin.role !== "owner") {
          await audit({
            kind: "security",
            action: "admin_forbidden_action",
            actor_id: auth.admin.id,
            actor_name: auth.admin.username,
            target: action,
            ip: clientIp(request),
          });
          return fail("Nur der Owner darf das.", 403);
        }
        try {
          return await handler(auth.admin, body, request);
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Fehler", 500);
        }
      },
    },
  },
});
