import { createFileRoute } from "@tanstack/react-router";
import { roleOf } from "@/lib/admin.server";
import { audit, clientIp, getConfig } from "@/lib/config.server";
import { esc, sendTelegram } from "@/lib/telegram.functions";
import {
  clearStateCookie,
  createSessionCookie,
  discordConfig,
  readState,
  redirectUri,
  safeReturnTo,
} from "@/lib/session.server";

const fail = (reason: string) =>
  new Response(null, {
    status: 302,
    headers: [
      ["Location", `/konto?fehler=${encodeURIComponent(reason)}`],
      ["Set-Cookie", clearStateCookie()],
    ],
  });

// Discord leitet nach der Anmeldung hierher zurück
export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cfg = discordConfig();
        if (!cfg) return fail("nicht-eingerichtet");
        const params = new URL(request.url).searchParams;
        const code = params.get("code");
        const saved = readState(request);
        if (!code || !saved || saved.state !== params.get("state")) return fail("abgebrochen");

        try {
          const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: cfg.clientId,
              client_secret: cfg.clientSecret,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri(request),
            }),
          });
          if (!tokenRes.ok) return fail("discord");
          const { access_token } = (await tokenRes.json()) as { access_token: string };

          const meRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (!meRes.ok) return fail("discord");
          const me = (await meRes.json()) as {
            id: string;
            username: string;
            global_name?: string | null;
            avatar?: string | null;
          };

          const avatar = me.avatar
            ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128`
            : null;
          const session = await createSessionCookie({
            id: me.id,
            username: me.global_name || me.username,
            avatar,
          });

          // Admin-Login melden
          const role = await roleOf(me.id).catch(() => null);
          if (role) {
            const ip = clientIp(request);
            const name = me.global_name || me.username;
            await audit({
              kind: "admin",
              action: "admin_login",
              actor_id: me.id,
              actor_name: name,
              ip,
            });
            const config = await getConfig().catch(() => null);
            if (config?.telegram.adminLogin) {
              const ua = request.headers.get("user-agent") ?? "";
              const device = /mobile|android|iphone/i.test(ua) ? "Handy" : "PC/Laptop";
              await sendTelegram(
                `🔐 <b>Admin-Login</b>\n\n👤 ${esc(name)} (${role === "owner" ? "Owner" : "Admin"})\n` +
                  `💻 ${device} · IP <code>${esc(ip)}</code>\n` +
                  `🕒 ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}\n\n` +
                  `Warst du das nicht? Sofort Discord-Passwort ändern!`,
              ).catch(() => {});
            }
          }

          return new Response(null, {
            status: 302,
            headers: [
              ["Location", safeReturnTo(saved.returnTo)],
              ["Set-Cookie", session],
              ["Set-Cookie", clearStateCookie()],
            ],
          });
        } catch {
          return fail("discord");
        }
      },
    },
  },
});
