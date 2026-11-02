import { createFileRoute } from "@tanstack/react-router";
import { rateLimited, tooMany } from "@/lib/config.server";
import { PLANS, type PlanId } from "@/lib/plans";
import { checkCoupon, quote } from "@/lib/pricing.server";
import { getSessionUser } from "@/lib/session.server";

// Gutscheincode vor dem Kauf prüfen und den neuen Preis zurückgeben
export const Route = createFileRoute("/api/checkout/coupon")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (await rateLimited("coupon", request)) return tooMany();
        const body = await request.json().catch(() => ({}));
        const plan = String(body?.plan ?? "") as PlanId;
        if (!(plan in PLANS))
          return Response.json({ ok: false, error: "Ungültiger Plan" }, { status: 400 });
        const user = await getSessionUser(request).catch(() => null);
        const check = await checkCoupon(String(body?.code ?? ""), plan, user?.id ?? null);
        if (!check.ok) return Response.json({ ok: false, error: check.error });
        return Response.json({ ok: true, quote: await quote(plan, check.coupon) });
      },
    },
  },
});
