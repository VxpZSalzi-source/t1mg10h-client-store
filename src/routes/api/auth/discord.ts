import { createFileRoute } from "@tanstack/react-router";
import {
  createStateCookie,
  discordConfig,
  randomState,
  redirectUri,
  safeReturnTo,
} from "@/lib/session.server";

// Startet den Discord-Login: /api/auth/discord?returnTo=/konto
export const Route = createFileRoute("/api/auth/discord")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cfg = discordConfig();
        if (!cfg)
          return new Response("Discord-Login ist noch nicht eingerichtet.", { status: 503 });
        const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
        const state = randomState();
        const url = new URL("https://discord.com/oauth2/authorize");
        url.searchParams.set("client_id", cfg.clientId);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("redirect_uri", redirectUri(request));
        url.searchParams.set("scope", "identify");
        url.searchParams.set("state", state);
        url.searchParams.set("prompt", "none");
        return new Response(null, {
          status: 302,
          headers: { Location: url.toString(), "Set-Cookie": createStateCookie(state, returnTo) },
        });
      },
    },
  },
});
