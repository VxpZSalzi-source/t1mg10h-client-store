import { createFileRoute } from "@tanstack/react-router";
import { findByToken, redeem, touchLastSeen } from "@/lib/purchases.server";
import { esc, sendTelegram } from "@/lib/telegram.functions";

export const Route = createFileRoute("/api/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const token = String(body?.token ?? "")
            .trim()
            .toUpperCase();
          const doRedeem = body?.redeem === true; // Client schickt redeem:true beim ersten Aktivieren
          const ign = String(body?.ign ?? "").trim(); // Ingame-Name des Spielers (vom Client)

          if (!token) {
            return Response.json({ valid: false, error: "Kein Token angegeben" }, { status: 400 });
          }

          let match = await findByToken(token);
          if (!match) {
            return Response.json({ valid: false, error: "Token ungültig" });
          }

          // Admin-Tokens sind an einen Ingame-Namen gebunden
          if (match.ign && match.ign.toLowerCase() !== ign.toLowerCase()) {
            return Response.json({
              valid: false,
              error: "Dieser Token gehört zu einem anderen Spieler",
            });
          }

          if (doRedeem) {
            // Atomar einlösen – schlägt fehl, wenn schon eingelöst
            const r = await redeem(token, ign);
            if (!r) return Response.json({ valid: false, error: "Token wurde bereits eingelöst" });
            match = r;

            // Benachrichtigung: Token wurde gerade im Spiel aktiviert
            await sendTelegram(
              `🎮 <b>Token im Client aktiviert</b>\n\n` +
                `👤 Ingame-Name: <b>${esc(ign || "unbekannt")}</b>\n` +
                `📦 Plan: <b>${match.plan === "lifetime" ? "Lifetime" : "Monatlich"}</b>` +
                (match.source === "admin" ? " (Admin)" : "") +
                `\n🔑 Token: <code>${token}</code>\n` +
                `🕒 ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
            ).catch(() => {});
          } else {
            await touchLastSeen(token).catch(() => {});
          }

          // Schon eingelöst aber nur Prüfung (kein redeem): gültig für denjenigen der ihn hat
          return Response.json({
            valid: true,
            plan: match.plan,
            price: match.price,
            purchasedAt: match.purchasedAt,
            redeemedAt: match.redeemedAt,
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
