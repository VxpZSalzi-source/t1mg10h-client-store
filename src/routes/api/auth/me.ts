import { createFileRoute } from "@tanstack/react-router";
import { listByDiscord } from "@/lib/purchases.server";
import { discordConfig, getSessionUser } from "@/lib/session.server";

// Aktueller Login + eigene Käufe
export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const enabled = !!discordConfig();
        const user = enabled ? await getSessionUser(request).catch(() => null) : null;
        const purchases = user ? await listByDiscord(user.id) : [];
        return Response.json(
          {
            enabled,
            user,
            purchases: purchases.map((p) => ({
              token: p.token,
              plan: p.plan,
              price: p.price,
              purchasedAt: p.purchasedAt,
              redeemedAt: p.redeemedAt,
            })),
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
