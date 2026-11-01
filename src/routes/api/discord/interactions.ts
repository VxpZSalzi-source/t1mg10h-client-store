import { createFileRoute } from "@tanstack/react-router";
import {
  addCustomerRole,
  botConfig,
  fmtDate,
  licenseStatus,
  removeCustomerRole,
  SITE,
  verifyDiscordRequest,
} from "@/lib/discord-bot.server";
import { linkToken, listByDiscord } from "@/lib/purchases.server";

// Farben: Blau = Info, Grün = Erfolg, Rot = Fehler
const BLUE = 0x3b82f6;
const GREEN = 0x22c55e;
const RED = 0xef4444;
const EPHEMERAL = 64; // nur für den Nutzer sichtbar

type Embed = {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
};

const reply = (embed: Embed, withButton = false) =>
  Response.json({
    type: 4,
    data: {
      flags: EPHEMERAL,
      embeds: [{ ...embed, footer: { text: "T1mg10h Client" } }],
      components: withButton
        ? [
            {
              type: 1,
              components: [
                { type: 2, style: 5, label: "Mein Konto", url: `${SITE()}/konto` },
                { type: 2, style: 5, label: "Client holen", url: `${SITE()}/#preise` },
              ],
            },
          ]
        : [],
    },
  });

const LINK_ERRORS: Record<"invalid" | "taken", string> = {
  invalid: "Dieser Token existiert nicht. Prüfe die Schreibweise (`T1MG-XXXX-XXXX-XXXX`).",
  taken: "Dieser Token ist bereits mit einem **anderen** Discord-Account verknüpft.",
};

async function handleVerify(userId: string, username: string, tokenOpt?: string) {
  // Optional: Token direkt im Befehl verknüpfen
  if (tokenOpt) {
    const token = tokenOpt.trim().toUpperCase();
    if (!/^T1MG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token)) {
      return reply({ title: "❌ Ungültiges Format", description: LINK_ERRORS.invalid, color: RED });
    }
    const r = await linkToken(token, userId, username);
    if (r === "invalid" || r === "taken") {
      return reply({ title: "❌ Token abgelehnt", description: LINK_ERRORS[r], color: RED }, true);
    }
  }

  const purchases = await listByDiscord(userId);
  const status = licenseStatus(purchases);

  if (!status.best) {
    return reply(
      {
        title: "Keine Lizenz gefunden",
        description:
          "Mit deinem Discord-Account ist noch kein Kauf verknüpft.\n\n" +
          "**So geht's:**\n" +
          `1. Auf der Website mit Discord anmelden (Mein Konto)\n` +
          "2. Token dort verknüpfen – oder hier `/verify token:DEIN-TOKEN` eingeben\n" +
          "3. Danach nochmal `/verify`",
        color: BLUE,
      },
      true,
    );
  }

  if (!status.active) {
    await removeCustomerRole(userId).catch(() => {});
    return reply(
      {
        title: "⏳ Lizenz abgelaufen",
        description: `Deine Monatslizenz ist am **${fmtDate(status.until!)}** abgelaufen. Verlängere sie auf der Website, dann bekommst du die Rolle wieder.`,
        color: RED,
      },
      true,
    );
  }

  let roleNote = "Du hast die **Kunden-Rolle** erhalten.";
  try {
    await addCustomerRole(userId);
  } catch {
    roleNote = "⚠️ Die Rolle konnte nicht vergeben werden – bitte melde dich beim Support.";
  }

  return reply({
    title: "✅ Verifiziert",
    description: roleNote,
    color: GREEN,
    fields: [
      { name: "Plan", value: status.label, inline: true },
      {
        name: "Gültig bis",
        value: status.until ? fmtDate(status.until) : "Für immer",
        inline: true,
      },
      { name: "Dein Token (zum Anzeigen klicken)", value: `||\`${status.best.token}\`||` },
    ],
  });
}

async function handleLizenz(userId: string) {
  const purchases = await listByDiscord(userId);
  if (purchases.length === 0) {
    return reply(
      {
        title: "Keine Lizenz gefunden",
        description: "Nutze `/verify`, um deinen Kauf zu verknüpfen.",
        color: BLUE,
      },
      true,
    );
  }
  const status = licenseStatus(purchases);
  return reply(
    {
      title: status.active ? "🛡️ Deine Lizenz" : "⏳ Lizenz abgelaufen",
      color: status.active ? GREEN : RED,
      fields: purchases.slice(0, 10).map((p) => ({
        name: `${p.plan === "lifetime" ? "Lifetime" : "Monatlich"} · gekauft am ${fmtDate(new Date(p.purchasedAt).getTime())}`,
        value: `||\`${p.token}\`|| · ${p.redeemedAt ? "im Client aktiviert" : "noch nicht aktiviert"}`,
      })),
    },
    true,
  );
}

export const Route = createFileRoute("/api/discord/interactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cfg = botConfig();
        if (!cfg) return new Response("Bot nicht eingerichtet", { status: 503 });

        const body = await request.text();
        if (!(await verifyDiscordRequest(request, body, cfg.publicKey))) {
          return new Response("Ungültige Signatur", { status: 401 });
        }
        const i = JSON.parse(body);

        if (i.type === 1) return Response.json({ type: 1 }); // PING von Discord

        if (i.type === 2) {
          // Nur auf deinem Server, nicht in DMs
          if (i.guild_id !== cfg.guildId) {
            return reply({ title: "Nur auf dem T1mg10h-Server verfügbar", color: BLUE });
          }
          const user = i.member?.user ?? i.user;
          const name: string = i.data?.name;
          try {
            if (name === "verify") {
              const tokenOpt = i.data?.options?.find(
                (o: { name: string }) => o.name === "token",
              )?.value;
              return await handleVerify(user.id, user.global_name || user.username, tokenOpt);
            }
            if (name === "lizenz") return await handleLizenz(user.id);
          } catch {
            return reply({
              title: "❌ Fehler",
              description: "Bitte versuche es gleich nochmal.",
              color: RED,
            });
          }
        }
        return new Response("Unbekannte Anfrage", { status: 400 });
      },
    },
  },
});
