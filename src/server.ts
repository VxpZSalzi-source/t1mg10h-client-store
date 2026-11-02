import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/* ---------------- Sicherheit ---------------- */

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.gpteng.co https://*.lovable.app https://*.lovable.dev",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.discordapp.com",
  "font-src 'self'",
  "connect-src 'self' https://*.lovable.app https://*.lovable.dev",
  "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function withSecurityHeaders(response: Response, path: string): Response {
  const res = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  if (path.startsWith("/api/") && !res.headers.has("Cache-Control")) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

// Diese Routen werden von fremden Servern aufgerufen und prüfen selbst eine Signatur
const EXTERNAL_POST = [
  "/api/stripe/webhook",
  "/api/discord/interactions",
  "/api/cron/",
  "/api/validate",
];

/** POST-Anfragen von fremden Websites abweisen (Schutz vor Cross-Site-Request-Forgery). */
function foreignOrigin(request: Request, path: string): boolean {
  if (request.method !== "POST" || !path.startsWith("/api/")) return false;
  if (EXTERNAL_POST.some((p) => path.startsWith(p))) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false; // z. B. Server-zu-Server, kein Browser
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return true;
  }
  const allowed = new Set([
    request.headers.get("host") ?? "",
    new URL(request.url).host,
    "t1mg10hclientstore.lovable.app",
  ]);
  const site = process.env["SITE_URL"];
  if (site) {
    try {
      allowed.add(new URL(site).host);
    } catch {
      /* ignorieren */
    }
  }
  return !allowed.has(host);
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const path = new URL(request.url).pathname;
    try {
      if (foreignOrigin(request, path)) {
        return withSecurityHeaders(new Response("Fremde Herkunft", { status: 403 }), path);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), path);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
