// Zentrale Einstellungen (im Admin-Panel änderbar), Protokoll und Rate-Limits.

import { cfg, rest } from "./purchases.server";

export interface RateRule {
  limit: number;
  windowSec: number;
}

export interface AppConfig {
  shopOpen: boolean;
  prices: { monthly: number; lifetime: number }; // in Cent
  plansEnabled: { monthly: boolean; lifetime: boolean };
  monthlyDays: number;
  requireLoginToBuy: boolean;
  bindToIgn: boolean;
  ignResetDays: number;
  offlineDays: number;
  discordAutoRole: boolean;
  rateLimits: {
    validate: RateRule;
    link: RateRule;
    adminAccess: RateRule;
    checkout: RateRule;
    discordLogin: RateRule;
    coupon: RateRule;
  };
  telegram: {
    purchase: boolean;
    activation: boolean;
    adminActions: boolean;
    adminLogin: boolean;
    warnings: boolean;
    coupons: boolean;
    promotions: boolean;
  };
  admins: { id: string; name: string }[];
}

export const DEFAULT_CONFIG: AppConfig = {
  shopOpen: true,
  prices: { monthly: 999, lifetime: 2699 },
  plansEnabled: { monthly: true, lifetime: true },
  monthlyDays: 30,
  requireLoginToBuy: true,
  bindToIgn: true,
  ignResetDays: 7,
  offlineDays: 3,
  discordAutoRole: true,
  rateLimits: {
    validate: { limit: 30, windowSec: 60 },
    link: { limit: 10, windowSec: 60 },
    adminAccess: { limit: 5, windowSec: 900 },
    checkout: { limit: 5, windowSec: 600 },
    discordLogin: { limit: 10, windowSec: 60 },
    coupon: { limit: 10, windowSec: 60 },
  },
  telegram: {
    purchase: true,
    activation: true,
    adminActions: true,
    adminLogin: true,
    warnings: true,
    coupons: true,
    promotions: true,
  },
  admins: [],
};

/** Tiefes Zusammenführen: fehlende Felder kommen aus den Standardwerten. */
function merge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(base)) {
    return (over ?? base) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] =
      b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object"
        ? merge(b, v)
        : v;
  }
  return out as T;
}

let memoryConfig: AppConfig = DEFAULT_CONFIG;
let cache: { at: number; value: AppConfig } | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (!cfg()) return memoryConfig;
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  const rows: { value: unknown }[] = await rest("settings?select=value&key=eq.config&limit=1");
  const value = merge(DEFAULT_CONFIG, rows[0]?.value);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveConfig(next: AppConfig): Promise<AppConfig> {
  const value = merge(DEFAULT_CONFIG, next);
  if (!cfg()) {
    memoryConfig = value;
    return value;
  }
  await rest("settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: "config", value, updated_at: new Date().toISOString() }),
  });
  cache = { at: Date.now(), value };
  return value;
}

export async function getCronSecret(): Promise<string | null> {
  if (!cfg()) return process.env["CRON_SECRET"] ?? null;
  const rows: { value: { secret?: string } }[] = await rest(
    "settings?select=value&key=eq.cron&limit=1",
  );
  return rows[0]?.value?.secret ?? null;
}

/* ---------------- Protokoll ---------------- */

export interface AuditEntry {
  id?: number;
  at?: string;
  kind: "admin" | "security" | "shop" | "system";
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  target?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
}

const memoryLog: AuditEntry[] = [];

export async function audit(e: AuditEntry): Promise<void> {
  try {
    if (!cfg()) {
      memoryLog.unshift({ ...e, at: new Date().toISOString(), id: memoryLog.length + 1 });
      return;
    }
    await rest("audit_log", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(e),
    });
  } catch {
    // Protokoll darf nie eine Aktion verhindern
  }
}

export async function readLog(opts: {
  kind?: string | undefined;
  limit?: number;
}): Promise<AuditEntry[]> {
  const limit = Math.min(opts.limit ?? 200, 500);
  if (!cfg()) {
    return memoryLog.filter((e) => !opts.kind || e.kind === opts.kind).slice(0, limit);
  }
  const kind = opts.kind ? `&kind=eq.${encodeURIComponent(opts.kind)}` : "";
  return rest(`audit_log?select=*${kind}&order=at.desc&limit=${limit}`);
}

/* ---------------- Rate-Limits ---------------- */

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unbekannt"
  );
}

const memoryHits = new Map<string, number>();

/**
 * Zählt einen Zugriff. Gibt true zurück, wenn das Limit überschritten ist.
 * Fehler in der Zählung sperren niemanden aus.
 */
export async function rateLimited(
  bucket: keyof AppConfig["rateLimits"],
  request: Request,
): Promise<boolean> {
  try {
    const config = await getConfig();
    const rule = config.rateLimits[bucket];
    if (!rule || rule.limit <= 0) return false;
    const ip = clientIp(request);
    const key = `${bucket}:${ip}`;
    let count: number;
    if (!cfg()) {
      const w = Math.floor(Date.now() / 1000 / rule.windowSec);
      const k = `${key}:${w}`;
      count = (memoryHits.get(k) ?? 0) + 1;
      memoryHits.set(k, count);
    } else {
      count = await rest("rpc/rl_hit", {
        method: "POST",
        body: JSON.stringify({ p_key: key, p_window_sec: rule.windowSec }),
      });
    }
    if (count === rule.limit + 1) {
      // Nur einmal pro Zeitfenster protokollieren und melden
      await audit({
        kind: "security",
        action: "rate_limit",
        target: bucket,
        ip,
        details: { limit: rule.limit, windowSec: rule.windowSec },
      });
      if (config.telegram.warnings) {
        const { sendTelegram, esc } = await import("./telegram.functions");
        await sendTelegram(
          `⚠️ <b>Rate-Limit ausgelöst</b>\n\nBereich: <b>${esc(bucket)}</b>\nIP: <code>${esc(ip)}</code>\n` +
            `Limit: ${rule.limit} pro ${rule.windowSec} s`,
        ).catch(() => {});
      }
    }
    return count > rule.limit;
  } catch {
    return false;
  }
}

export const tooMany = () =>
  Response.json(
    { valid: false, ok: false, error: "Zu viele Anfragen – versuch es gleich nochmal." },
    { status: 429 },
  );

/* ---------------- Geheime Admin-Adresse ---------------- */

let memoryAdminPath = process.env["ADMIN_PATH"] ?? "cp-lokal-test";

export async function getAdminPath(): Promise<string> {
  if (!cfg()) return memoryAdminPath;
  const rows: { value: { path?: string } }[] = await rest(
    "settings?select=value&key=eq.admin&limit=1",
  );
  return rows[0]?.value?.path ?? process.env["ADMIN_PATH"] ?? "";
}

export async function rotateAdminPath(): Promise<string> {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  const path =
    "cp-" + Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => a[b % a.length]).join("");
  if (!cfg()) {
    memoryAdminPath = path;
    return path;
  }
  await rest("settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: "admin", value: { path }, updated_at: new Date().toISOString() }),
  });
  return path;
}
