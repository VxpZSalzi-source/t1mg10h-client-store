import { createFileRoute } from "@tanstack/react-router";
import { getPublicPricing } from "@/lib/pricing.server";

// Öffentliche Preise inkl. laufender/geplanter Aktionen (für die Preis-Karten)
export const Route = createFileRoute("/api/pricing")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json(await getPublicPricing(), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          return Response.json({ error: "Preise nicht verfügbar" }, { status: 500 });
        }
      },
    },
  },
});
