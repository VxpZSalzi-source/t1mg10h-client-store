import { createFileRoute } from "@tanstack/react-router";
import { roleOf } from "@/lib/admin.server";
import { getConfig } from "@/lib/config.server";
import { isActive, listByDiscord } from "@/lib/purchases.server";
import { discordConfig, getSessionUser, refreshSessionCookie } from "@/lib/session.server";

// Aktueller Login + eigene Käufe
export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const enabled = !!discordConfig();
        const user = enabled ? await getSessionUser(request).catch(() => null) : null;
        const purchases = user ? await listByDiscord(user.id) : [];
        const config = await getConfig().catch(() => null);
        const resetMs = (config?.ignResetDays ?? 7) * 864e5;
        const role = user ? await roleOf(user.id).catch(() => null) : null;
        const fresh = await refreshSessionCookie(user).catch(() => null);
        const headers: Record<string, string> = { "Cache-Control": "no-store" };
        if (fresh) headers["Set-Cookie"] = fresh;
        return Response.json(
          {
            enabled,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            role,
            requireLoginToBuy: config?.requireLoginToBuy ?? true,
            ignResetDays: config?.ignResetDays ?? 7,
            purchases: purchases.map((p) => ({
              token: p.token,
              plan: p.plan,
              price: p.price,
              purchasedAt: p.purchasedAt,
              redeemedAt: p.redeemedAt,
              expiresAt: p.expiresAt ?? null,
              active: isActive(p),
              admin: p.source === "admin",
              boundTo: p.ign ?? p.redeemedIgn ?? null,
              canResetIgn: !p.ign && !!p.redeemedIgn,
              nextIgnReset: p.ignResetAt
                ? new Date(new Date(p.ignResetAt).getTime() + resetMs).toISOString()
                : null,
            })),
          },
          { headers },
        );
      },
    },
  },
});
