import { createFileRoute } from "@tanstack/react-router";
import { audit, clientIp, getConfig, rateLimited, tooMany } from "@/lib/config.server";
import { findByToken, patchPurchase } from "@/lib/purchases.server";
import { getSessionUser } from "@/lib/session.server";

const fmt = (ms: number) =>
  new Date(ms).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

// Spieler setzt den gebundenen Ingame-Namen seines Tokens selbst zurück (mit Wartezeit)
export const Route = createFileRoute("/api/account/reset-ign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (await rateLimited("link", request)) return tooMany();
        const user = await getSessionUser(request).catch(() => null);
        if (!user) return Response.json({ ok: false, error: "Nicht eingeloggt" }, { status: 401 });
        const body = await request.json().catch(() => ({}));
        const token = String(body?.token ?? "")
          .trim()
          .toUpperCase();
        const p = await findByToken(token);
        if (!p || p.discordId !== user.id) {
          return Response.json({
            ok: false,
            error: "Dieser Token gehört nicht zu deinem Account.",
          });
        }
        if (p.ign) {
          return Response.json({
            ok: false,
            error: "Admin-Tokens können nur vom Owner geändert werden.",
          });
        }
        if (!p.redeemedIgn) {
          return Response.json({ ok: false, error: "Der Token ist an keinen Namen gebunden." });
        }
        const { ignResetDays } = await getConfig();
        if (p.ignResetAt) {
          const next = new Date(p.ignResetAt).getTime() + ignResetDays * 864e5;
          if (next > Date.now()) {
            return Response.json({
              ok: false,
              error: `Nächster Reset möglich ab ${fmt(next)} Uhr.`,
            });
          }
        }
        await patchPurchase(token, { redeemed_ign: null, ign_reset_at: new Date().toISOString() });
        await audit({
          kind: "shop",
          action: "ign_reset_self",
          actor_id: user.id,
          actor_name: user.username,
          target: token,
          details: { previous: p.redeemedIgn },
          ip: clientIp(request),
        });
        return Response.json({
          ok: true,
          message: "Zurückgesetzt. Beim nächsten Start im Client wird dein neuer Name gebunden.",
        });
      },
    },
  },
});
