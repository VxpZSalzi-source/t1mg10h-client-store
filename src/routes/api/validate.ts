import { createFileRoute } from "@tanstack/react-router";
import { audit, clientIp, getConfig, rateLimited, tooMany } from "@/lib/config.server";
import {
  findByToken,
  isActive,
  patchPurchase,
  redeem,
  touchLastSeen,
} from "@/lib/purchases.server";
import { esc, sendTelegram } from "@/lib/telegram.functions";

const deny = (error: string, extra: Record<string, unknown> = {}) =>
  Response.json({ valid: false, error, ...extra });

// Lizenzprüfung für den Minecraft-Client
export const Route = createFileRoute("/api/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (await rateLimited("validate", request)) return tooMany();
          const config = await getConfig();
          const body = await request.json();
          const token = String(body?.token ?? "")
            .trim()
            .toUpperCase();
          const doRedeem = body?.redeem === true; // Client schickt redeem:true beim ersten Aktivieren
          const ign = String(body?.ign ?? "")
            .trim()
            .replace(/[^A-Za-z0-9_]/g, "");

          if (!token) {
            return Response.json({ valid: false, error: "Kein Token angegeben" }, { status: 400 });
          }

          let match = await findByToken(token);
          if (!match) return deny("Token ungültig");

          // Admin-Tokens sind fest an einen Ingame-Namen gebunden
          if (match.ign && match.ign.toLowerCase() !== ign.toLowerCase()) {
            await audit({
              kind: "security",
              action: "token_wrong_player",
              target: token,
              ip: clientIp(request),
              details: { ign, expected: match.ign },
            });
            return deny("Dieser Token gehört zu einem anderen Spieler");
          }

          // Monatslizenz abgelaufen?
          if (!isActive(match)) {
            if (config.discordAutoRole && match.discordId && !match.roleRemovedAt) {
              const { botConfig, removeCustomerRole } = await import("@/lib/discord-bot.server");
              if (botConfig()) {
                await removeCustomerRole(match.discordId).catch(() => {});
                await patchPurchase(token, { role_removed_at: new Date().toISOString() });
              }
            }
            return deny("Lizenz abgelaufen – kauf eine neue Lizenz und gib den neuen Token ein", {
              expired: true,
              expiresAt: match.expiresAt,
            });
          }

          // Gekaufte Tokens nach der Aktivierung an den Ingame-Namen binden
          if (config.bindToIgn && !match.ign && match.redeemedAt && !doRedeem) {
            if (!match.redeemedIgn && ign) {
              // Name wurde zurückgesetzt → beim nächsten Start neu binden
              await patchPurchase(token, { redeemed_ign: ign });
              match = { ...match, redeemedIgn: ign };
            } else if (match.redeemedIgn && match.redeemedIgn.toLowerCase() !== ign.toLowerCase()) {
              await audit({
                kind: "security",
                action: "token_wrong_player",
                target: token,
                ip: clientIp(request),
                details: { ign, expected: match.redeemedIgn },
              });
              return deny(
                `Dieser Token ist an ${match.redeemedIgn} gebunden. Neuer Name? Unter „Mein Konto“ zurücksetzen.`,
                { boundTo: match.redeemedIgn },
              );
            }
          }

          if (doRedeem) {
            // Atomar einlösen – schlägt fehl, wenn schon eingelöst
            const r = await redeem(token, ign);
            if (!r) return deny("Token wurde bereits eingelöst");
            match = r;
            await audit({
              kind: "shop",
              action: "activation",
              target: token,
              actor_name: ign || null,
              ip: clientIp(request),
            });

            if (config.telegram.activation) {
              await sendTelegram(
                `🎮 <b>Token im Client aktiviert</b>\n\n` +
                  `👤 Ingame-Name: <b>${esc(ign || "unbekannt")}</b>\n` +
                  `📦 Plan: <b>${match.plan === "lifetime" ? "Lifetime" : "Monatlich"}</b>` +
                  (match.source === "admin" ? " (Admin)" : "") +
                  `\n🔑 Token: <code>${token}</code>\n` +
                  `🕒 ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
              ).catch(() => {});
            }
          } else {
            await touchLastSeen(token).catch(() => {});
          }

          return Response.json({
            valid: true,
            plan: match.plan,
            purchasedAt: match.purchasedAt,
            redeemedAt: match.redeemedAt,
            expiresAt: match.expiresAt ?? null,
            daysLeft: match.expiresAt
              ? Math.max(0, Math.ceil((new Date(match.expiresAt).getTime() - Date.now()) / 864e5))
              : null,
            offlineDays: config.offlineDays,
            boundTo: match.ign ?? match.redeemedIgn ?? null,
          });
        } catch {
          return Response.json(
            { valid: false, error: "Fehler bei der Validierung" },
            { status: 500 },
          );
        }
      },
    },
  },
});
