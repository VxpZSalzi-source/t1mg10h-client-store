const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export { PLANS, IGN_PATTERN } from "./plans";
export type { PlanId } from "./plans";

export type { Purchase } from "./purchases.server";

export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const c = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `T1MG-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

export async function tg(method: string, body: unknown) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const tgKey = process.env["TELEGRAM_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!tgKey) throw new Error("TELEGRAM_API_KEY is not configured");
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tgKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Telegram [${res.status}]: ${text}`);
  const json = JSON.parse(text);
  if (!json.ok) throw new Error(`Telegram: ${json.description ?? text}`);
  return json.result;
}

async function resolveChatId(): Promise<string | number> {
  const fixed = process.env["TELEGRAM_CHAT_ID"];
  if (fixed) return fixed;
  const updates: any[] = await tg("getUpdates", {});
  for (let i = updates.length - 1; i >= 0; i--) {
    const chat = (updates[i].message ?? updates[i].edited_message)?.chat;
    if (chat?.id) return chat.id;
  }
  throw new Error(
    "Kein Telegram-Chat gefunden. Schreibe deinem Bot zuerst eine Nachricht (z.B. /start) und versuche es erneut.",
  );
}

/** Telegram-Nachricht an dich senden (für Server-Routen). */
export async function sendTelegram(text: string) {
  const chatId = await resolveChatId();
  await tg("sendMessage", { chat_id: chatId, parse_mode: "HTML", text });
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
