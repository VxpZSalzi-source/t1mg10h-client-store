import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie } from "@/lib/session.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () =>
        new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } }),
    },
  },
});
