import { createFileRoute } from "@tanstack/react-router";
import { findBySessionId } from "@/lib/purchases.server";
import { fulfillSession, retrieveSession, stripeKey } from "@/lib/stripe.server";

// Success-Seite fragt hier nach: Ist die Zahlung durch? Dann gibt es den Token.
export const Route = createFileRoute("/api/checkout/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("session_id") ?? "";
        if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) {
          return Response.json({ status: "invalid" }, { status: 400 });
        }
        const noStore = { headers: { "Cache-Control": "no-store" } };
        try {
          let purchase = await findBySessionId(id);
          if (!purchase && stripeKey()) {
            // Falls der Webhook noch nicht da war: direkt bei Stripe nachsehen
            const session = await retrieveSession(id);
            if (session.status === "expired") return Response.json({ status: "expired" }, noStore);
            purchase = await fulfillSession(session);
          }
          if (!purchase) return Response.json({ status: "pending" }, noStore);
          return Response.json(
            {
              status: "paid",
              token: purchase.token,
              plan: purchase.plan,
              test: purchase.livemode === false,
              linked: !!purchase.discordId,
            },
            noStore,
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("checkout/status", id, message);
          return Response.json({ status: "error", message }, { status: 500 });
        }
      },
    },
  },
});
