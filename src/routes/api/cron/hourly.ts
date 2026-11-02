import { createFileRoute } from "@tanstack/react-router";
import { audit, getConfig, getCronSecret } from "@/lib/config.server";
import { botConfig, removeCustomerRole } from "@/lib/discord-bot.server";
import { listPromotions, updatePromotion } from "@/lib/pricing.server";
import { listExpiredWithRole, patchPurchase } from "@/lib/purchases.server";
import { sendTelegram } from "@/lib/telegram.functions";

const fmt = (iso: string) => new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
const planName = (p: string) =>
  p === "all" ? "alle Pläne" : p === "lifetime" ? "Lifetime" : "Monatlich";

// Wird stündlich von der Datenbank (pg_cron) aufgerufen
export const Route = createFileRoute("/api/cron/hourly")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = await getCronSecret();
        const given = request.headers.get("x-cron-secret") ?? "";
        if (!secret || given.length !== secret.length || given !== secret) {
          return new Response("Nein", { status: 401 });
        }
        const config = await getConfig();
        const result = { rolesRemoved: 0, promoStarts: 0, promoEnds: 0 };

        // 1) Abgelaufene Lizenzen: Discord-Rolle entfernen
        if (config.discordAutoRole && botConfig()) {
          for (const p of await listExpiredWithRole()) {
            try {
              await removeCustomerRole(p.discordId!);
              await patchPurchase(p.token, { role_removed_at: new Date().toISOString() });
              result.rolesRemoved++;
            } catch {
              /* nächste Stunde nochmal */
            }
          }
          if (result.rolesRemoved) {
            await audit({
              kind: "system",
              action: "roles_removed",
              details: { count: result.rolesRemoved },
            });
          }
        }

        // 2) Aktionen: Start und Ende melden
        const now = Date.now();
        for (const p of await listPromotions()) {
          const started = !p.starts_at || new Date(p.starts_at).getTime() <= now;
          const ended = !!p.ends_at && new Date(p.ends_at).getTime() <= now;
          if (p.active && started && !ended && !p.start_notified) {
            await updatePromotion(p.id, { start_notified: true });
            result.promoStarts++;
            if (config.telegram.promotions) {
              await sendTelegram(
                `🏷️ <b>Aktion gestartet</b>\n\n−${p.percent} % auf ${planName(p.plan)}` +
                  (p.ends_at ? `\nEndet: ${fmt(p.ends_at)}` : ""),
              ).catch(() => {});
            }
          }
          if (p.active && ended && !p.end_notified) {
            await updatePromotion(p.id, { end_notified: true });
            result.promoEnds++;
            if (config.telegram.promotions) {
              await sendTelegram(
                `🏁 <b>Aktion beendet</b>\n\n−${p.percent} % auf ${planName(p.plan)}`,
              ).catch(() => {});
            }
          }
        }
        return Response.json(result);
      },
    },
  },
});
