import { createFileRoute } from "@tanstack/react-router";
import { fulfillSession, verifyStripeWebhook, type StripeSession } from "@/lib/stripe.server";

// Stripe meldet hier bezahlte Käufe – auch wenn der Käufer den Tab schon geschlossen hat.
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook nicht eingerichtet", { status: 503 });

        const payload = await request.text();
        const ok = await verifyStripeWebhook(
          payload,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!ok) return new Response("Ungültige Signatur", { status: 400 });

        const event = JSON.parse(payload) as { type: string; data: { object: StripeSession } };
        if (
          event.type === "checkout.session.completed" ||
          event.type === "checkout.session.async_payment_succeeded"
        ) {
          try {
            await fulfillSession(event.data.object);
          } catch {
            return new Response("Fehler", { status: 500 }); // Stripe versucht es später erneut
          }
        }
        return Response.json({ received: true });
      },
    },
  },
});
