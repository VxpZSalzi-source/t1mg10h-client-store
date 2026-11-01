// Discord-Bot über "Interactions Endpoint" – läuft direkt auf der Website, kein eigener Server nötig.
// Secrets: DISCORD_CLIENT_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_CUSTOMER_ROLE_ID

import type { Purchase } from "./purchases.server";

const API = "https://discord.com/api/v10";
export const SITE = () =>
  (process.env["SITE_URL"] ?? "https://t1mg10hclientstore.lovable.app").replace(/\/$/, "");

export function botConfig() {
  const c = {
    appId: process.env["DISCORD_CLIENT_ID"],
    publicKey: process.env["DISCORD_PUBLIC_KEY"],
    botToken: process.env["DISCORD_BOT_TOKEN"],
    guildId: process.env["DISCORD_GUILD_ID"],
    roleId: process.env["DISCORD_CUSTOMER_ROLE_ID"],
  };
  return c.appId && c.publicKey && c.botToken && c.guildId && c.roleId
    ? (c as Record<keyof typeof c, string>)
    : null;
}

const hex = (h: string) => Uint8Array.from(h.match(/.{2}/g) ?? [], (b) => parseInt(b, 16));

/** Prüft die Ed25519-Signatur von Discord – ohne gültige Signatur wird nichts ausgeführt. */
export async function verifyDiscordRequest(
  request: Request,
  body: string,
  publicKey: string,
): Promise<boolean> {
  const sig = request.headers.get("x-signature-ed25519");
  const ts = request.headers.get("x-signature-timestamp");
  if (!sig || !ts || !/^[0-9a-f]{128}$/i.test(sig) || !/^[0-9a-f]{64}$/i.test(publicKey))
    return false;
  try {
    const key = await crypto.subtle.importKey("raw", hex(publicKey), { name: "Ed25519" }, false, [
      "verify",
    ]);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hex(sig),
      new TextEncoder().encode(ts + body),
    );
  } catch {
    return false;
  }
}

async function discord(path: string, init: RequestInit = {}) {
  const cfg = botConfig()!;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${cfg.botToken}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": "T1mg10h Lizenz-Verifizierung",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Discord [${res.status}]: ${await res.text()}`);
  }
  return res;
}

export const addCustomerRole = (userId: string) => {
  const c = botConfig()!;
  return discord(`/guilds/${c.guildId}/members/${userId}/roles/${c.roleId}`, { method: "PUT" });
};

export const removeCustomerRole = (userId: string) => {
  const c = botConfig()!;
  return discord(`/guilds/${c.guildId}/members/${userId}/roles/${c.roleId}`, { method: "DELETE" });
};

/** Slash-Befehle auf dem Server registrieren (einmalig, über das Admin-Panel). */
export async function registerCommands() {
  const c = botConfig();
  if (!c) {
    const names = [
      "DISCORD_CLIENT_ID",
      "DISCORD_PUBLIC_KEY",
      "DISCORD_BOT_TOKEN",
      "DISCORD_GUILD_ID",
      "DISCORD_CUSTOMER_ROLE_ID",
    ];
    const missing = names.filter((n) => !process.env[n]);
    throw new Error(`Diese Secrets fehlen in Lovable: ${missing.join(", ")}`);
  }
  const commands = [
    {
      name: "verify",
      description: "Lizenz prüfen und Kunden-Rolle erhalten",
      options: [
        {
          type: 3,
          name: "token",
          description:
            "Dein Token (T1MG-XXXX-XXXX-XXXX), falls noch nicht auf der Website verknüpft",
          required: false,
          min_length: 19,
          max_length: 19,
        },
      ],
    },
    { name: "lizenz", description: "Zeigt deine Lizenz und deinen Token (nur für dich sichtbar)" },
  ];
  await discord(`/applications/${c.appId}/guilds/${c.guildId}/commands`, {
    method: "PUT",
    body: JSON.stringify(commands),
  });
  return commands.map((x) => `/${x.name}`);
}

const MONTH_MS = 30 * 864e5;

/** Lizenzstatus: Lifetime schlägt Monatlich, sonst jüngster Monatskauf (30 Tage). */
export function licenseStatus(purchases: Purchase[]) {
  const life = purchases.find((p) => p.plan === "lifetime");
  if (life) return { active: true, label: "Lifetime", until: null as number | null, best: life };
  const monthly = purchases
    .filter((p) => p.plan === "monthly")
    .map((p) => ({ p, until: new Date(p.purchasedAt).getTime() + MONTH_MS }))
    .sort((a, b) => b.until - a.until)[0];
  if (!monthly) return { active: false, label: "Keine Lizenz", until: null, best: null };
  return {
    active: monthly.until > Date.now(),
    label: "Monatlich",
    until: monthly.until,
    best: monthly.p,
  };
}

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
