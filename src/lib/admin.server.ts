// Admin-Zugang über Discord: OWNER_DISCORD_ID (Secret) = Owner, weitere Admins in der Config.

import { audit, clientIp, getConfig, rateLimited } from "./config.server";
import { getSessionUser, type SessionUser } from "./session.server";

export type AdminRole = "owner" | "admin";
export interface AdminUser extends SessionUser {
  role: AdminRole;
}

/** Admin-Sitzungen gelten 12 Stunden ab Discord-Anmeldung. */
const ADMIN_SESSION_MS = 12 * 3600 * 1000;

export const ownerId = () => process.env["OWNER_DISCORD_ID"]?.trim() || null;

export async function roleOf(discordId: string): Promise<AdminRole | null> {
  if (discordId === ownerId()) return "owner";
  const config = await getConfig();
  return config.admins.some((a) => a.id === discordId) ? "admin" : null;
}

export type AdminCheck =
  | { ok: true; admin: AdminUser }
  | { ok: false; status: number; reason: "setup" | "login" | "expired" | "forbidden" | "rate" };

export async function requireAdmin(request: Request): Promise<AdminCheck> {
  if (!ownerId()) return { ok: false, status: 503, reason: "setup" };
  const user = await getSessionUser(request).catch(() => null);
  if (!user) return { ok: false, status: 401, reason: "login" };
  const role = await roleOf(user.id);
  if (!role) {
    // Fremde Zugriffsversuche zählen und protokollieren
    if (await rateLimited("adminAccess", request))
      return { ok: false, status: 429, reason: "rate" };
    await audit({
      kind: "security",
      action: "admin_denied",
      actor_id: user.id,
      actor_name: user.username,
      ip: clientIp(request),
    });
    return { ok: false, status: 403, reason: "forbidden" };
  }
  if (!user.iat || Date.now() - user.iat > ADMIN_SESSION_MS) {
    return { ok: false, status: 401, reason: "expired" };
  }
  return { ok: true, admin: { ...user, role } };
}
