import { createFileRoute } from "@tanstack/react-router";
import { audit, clientIp, getConfig, rateLimited, tooMany } from "@/lib/config.server";
import {
  deleteOwnReview,
  findByDiscordId,
  isCustomer,
  listApproved,
  upsertReview,
} from "@/lib/reviews.server";
import { getSessionUser } from "@/lib/session.server";
import { esc, sendTelegram } from "@/lib/telegram.functions";

const fail = (error: string, status = 200) => Response.json({ ok: false, error }, { status });

// GET: freigegebene Bewertungen (öffentlich). POST: eigene Bewertung lesen/speichern/löschen.
export const Route = createFileRoute("/api/reviews")({
  server: {
    handlers: {
      GET: async () => {
        const reviews = await listApproved().catch(() => []);
        return Response.json({ reviews }, { headers: { "Cache-Control": "no-store" } });
      },

      POST: async ({ request }) => {
        const user = await getSessionUser(request).catch(() => null);
        if (!user) return fail("Bitte zuerst mit Discord anmelden.", 401);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const action = String(body["action"] ?? "mine");

        if (action === "mine") {
          const [review, customer] = await Promise.all([
            findByDiscordId(user.id),
            isCustomer(user.id),
          ]);
          return Response.json({ ok: true, customer, review });
        }

        if (action === "delete") {
          await deleteOwnReview(user.id);
          return Response.json({ ok: true });
        }

        if (action !== "save") return fail("Unbekannte Aktion", 400);
        if (await rateLimited("link", request)) return tooMany();
        if (!(await isCustomer(user.id))) {
          return fail("Nur Käufer können bewerten. Verknüpfe zuerst deinen Token im Konto.");
        }
        const stars = Math.round(Number(body["stars"]));
        const text = String(body["text"] ?? "")
          .replace(/\s+/g, " ")
          .trim();
        if (!(stars >= 1 && stars <= 5)) return fail("Bitte 1 bis 5 Sterne wählen.");
        if (text.length < 10) return fail("Bitte mindestens 10 Zeichen schreiben.");
        if (text.length > 400) return fail("Maximal 400 Zeichen.");
        if (/https?:\/\/|discord\.gg|www\./i.test(text)) return fail("Links sind nicht erlaubt.");

        const review = await upsertReview({
          discordId: user.id,
          username: user.username,
          avatar: user.avatar,
          stars,
          text,
        });
        await audit({
          kind: "shop",
          action: "review_submit",
          actor_id: user.id,
          actor_name: user.username,
          target: review.id,
          details: { stars },
          ip: clientIp(request),
        });
        const config = await getConfig();
        if (config.telegram.reviews) {
          await sendTelegram(
            `⭐ <b>Neue Bewertung (wartet auf Freigabe)</b>\n\n` +
              `👤 ${esc(user.username)}\n` +
              `${"★".repeat(stars)}${"☆".repeat(5 - stars)}\n\n` +
              `<i>${esc(text)}</i>`,
          ).catch(() => {});
        }
        return Response.json({
          ok: true,
          review,
          message: "Danke! Deine Bewertung erscheint nach der Freigabe auf der Startseite.",
        });
      },
    },
  },
});
