// Discord-Login: signiertes Session-Cookie (HMAC-SHA256) + Discord-OAuth-Konfiguration.
// Benötigte Secrets in Lovable: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SESSION_SECRET

export interface SessionUser {
  id: string;
  username: string;
  avatar: string | null; // fertige Bild-URL
}

const SESSION_COOKIE = "t1_session";
const STATE_COOKIE = "t1_oauth_state";
const SESSION_DAYS = 30;

export function discordConfig() {
  const clientId = process.env["DISCORD_CLIENT_ID"];
  const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function secret(): string {
  const s = process.env["SESSION_SECRET"];
  if (!s || s.length < 16) throw new Error("SESSION_SECRET fehlt (mind. 16 Zeichen)");
  return s;
}

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function createSessionCookie(user: SessionUser): Promise<string> {
  const payload = b64url(
    enc.encode(JSON.stringify({ ...user, exp: Date.now() + SESSION_DAYS * 864e5 })),
  );
  return cookie(SESSION_COOKIE, `${payload}.${await hmac(payload)}`, SESSION_DAYS * 86400);
}

export const clearSessionCookie = () => cookie(SESSION_COOKIE, "", 0);

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(sig, await hmac(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { id: data.id, username: data.username, avatar: data.avatar ?? null };
  } catch {
    return null;
  }
}

/** OAuth-State (Schutz gegen CSRF) + Rücksprungziel im Cookie. */
export function createStateCookie(state: string, returnTo: string) {
  return cookie(STATE_COOKIE, JSON.stringify({ state, returnTo }), 600);
}
export const clearStateCookie = () => cookie(STATE_COOKIE, "", 0);
export function readState(request: Request): { state: string; returnTo: string } | null {
  try {
    const raw = readCookie(request, STATE_COOKIE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Nur interne Pfade als Rücksprungziel erlauben (kein Open Redirect). */
export function safeReturnTo(v: string | null | undefined): string {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/konto";
}

export function redirectUri(request: Request) {
  // SITE_URL optional setzen, falls die Seite hinter einem Proxy läuft
  const origin = (process.env["SITE_URL"] ?? new URL(request.url).origin).replace(/\/$/, "");
  return `${origin}/api/auth/callback`;
}

export function randomState() {
  return b64url(crypto.getRandomValues(new Uint8Array(24)));
}
