import { createFileRoute } from "@tanstack/react-router";
import { linkToken } from "@/lib/purchases.server";
import { getSessionUser } from "@/lib/session.server";

const MESSAGES = {
  linked: "Token wurde mit deinem Discord-Account verknüpft.",
  "already-yours": "Dieser Token gehört bereits zu deinem Account.",
  taken: "Dieser Token ist bereits mit einem anderen Account verknüpft.",
  invalid: "Token ungültig.",
} as const;

// Token mit dem eingeloggten Discord-Account verknüpfen
export const Route = createFileRoute("/api/account/link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(request).catch(() => null);
        if (!user) return Response.json({ ok: false, error: "Nicht eingeloggt" }, { status: 401 });
        const body = await request.json().catch(() => ({}));
        const token = String(body?.token ?? "")
          .trim()
          .toUpperCase();
        if (!/^T1MG-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token)) {
          return Response.json({ ok: false, result: "invalid", message: MESSAGES.invalid });
        }
        const result = await linkToken(token, user.id, user.username);
        return Response.json({
          ok: result === "linked" || result === "already-yours",
          result,
          message: MESSAGES[result],
        });
      },
    },
  },
});
