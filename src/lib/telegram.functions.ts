import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export const PLANS = {
  monthly: { name: "Monatlich", price: "9.99€" },
  lifetime: { name: "Lifetime", price: "26.99€" },
} as const;
export type PlanId = keyof typeof PLANS;

async function tg(method: string, body: unknown) {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const tgKey = process.env['TELEGRAM_API_KEY'];
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
  const fixed = process.env['TELEGRAM_CHAT_ID'];
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

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const sendTestMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { text?: string }) => ({
    text: String(input?.text ?? "").slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const chatId = await resolveChatId();
    await tg("sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      text: `🧪 <b>T1mg10h Client – Test</b>\n${esc(data.text || "Telegram funktioniert!")}`,
    });
    return { ok: true };
  });

export const notifyPurchase = createServerFn({ method: "POST" })
  .inputValidator((input: { plan: PlanId; ign: string; email: string }) => {
    if (!(input?.plan in PLANS)) throw new Error("Ungültiger Plan");
    const ign = String(input.ign ?? "").trim().slice(0, 32);
    const email = String(input.email ?? "").trim().slice(0, 120);
    if (!ign) throw new Error("Minecraft-Name fehlt");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Ungültige E-Mail");
    return { plan: input.plan, ign, email };
  })
  .handler(async ({ data }) => {
    const plan = PLANS[data.plan];
    const chatId = await resolveChatId();
    await tg("sendMessage", {
      chat_id: chatId,
      parse_mode: "HTML",
      text:
        `💰 <b>Neuer Kauf – T1mg10h Client</b>\n\n` +
        `📦 Plan: <b>${plan.name}</b> (${plan.price})\n` +
        `🎮 Minecraft: <code>${esc(data.ign)}</code>\n` +
        `📧 E-Mail: ${esc(data.email)}\n` +
        `🕒 ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
    });
    return { ok: true };
  });
