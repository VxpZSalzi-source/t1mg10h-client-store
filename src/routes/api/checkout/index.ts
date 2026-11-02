import { createFileRoute } from "@tanstack/react-router";
import { getConfig, rateLimited, tooMany } from "@/lib/config.server";
import { PLANS, type PlanId } from "@/lib/plans";
import { checkCoupon, quote, type Coupon } from "@/lib/pricing.server";
import { discordConfig, getSessionUser } from "@/lib/session.server";
import { createCheckoutSession, stripeKey } from "@/lib/stripe.server";

const err = (error: string, status = 400) => Response.json({ error }, { status });

// Kauf starten: Preis serverseitig berechnen → Stripe-Zahlungsseite (oder direkt Token bei 0 €)
export const Route = createFileRoute("/api/checkout/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (await rateLimited("checkout", request)) return tooMany();
        const config = await getConfig();
        const body = await request.json().catch(() => ({}));
        const plan = String(body?.plan ?? "") as PlanId;
        if (!(plan in PLANS)) return err("Ungültiger Plan");
        if (!config.shopOpen) return err("Der Shop ist gerade im Wartungsmodus.", 503);
        if (!config.plansEnabled[plan]) return err("Dieser Plan ist gerade nicht verfügbar.", 503);
        if (body?.consent !== true) {
          return err("Bitte bestätige den Hinweis zum Widerrufsrecht.");
        }

        const user = await getSessionUser(request).catch(() => null);
        if (config.requireLoginToBuy && discordConfig() && !user) {
          return err("Bitte melde dich zuerst mit Discord an.", 401);
        }

        let coupon: Coupon | null = null;
        if (body?.coupon) {
          const check = await checkCoupon(String(body.coupon), plan, user?.id ?? null);
          if (!check.ok) return err(check.error);
          coupon = check.coupon;
        }
        const q = await quote(plan, coupon);
        const buyer = user ? { id: user.id, username: user.username } : null;

        if (!stripeKey()) return err("Der Shop ist gerade nicht verfügbar.", 503);
        try {
          const session = await createCheckoutSession(q, buyer);
          return Response.json({ url: session.url });
        } catch {
          return err(
            "Zahlung konnte nicht gestartet werden. Bitte versuche es gleich nochmal.",
            502,
          );
        }
      },
    },
  },
});
