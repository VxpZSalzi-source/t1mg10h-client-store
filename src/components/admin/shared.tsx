import { useState, type ReactNode } from "react";

export type Role = "owner" | "admin";

export interface AdminPurchase {
  token: string;
  plan: "monthly" | "lifetime";
  price?: string;
  purchasedAt: string;
  redeemedAt: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  ign?: string | null;
  source?: "shop" | "admin";
  note?: string | null;
  redeemedIgn?: string | null;
  lastSeenAt?: string | null;
  livemode?: boolean | null;
  amountCents?: number | null;
  expiresAt?: string | null;
  couponCode?: string | null;
}

export class AdminError extends Error {
  constructor(
    message: string,
    public reason?: string,
    public status?: number,
  ) {
    super(message);
  }
}

/** Ruft die geschützte Admin-Schnittstelle auf. */
export async function api<T = Record<string, unknown>>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new AdminError(json.error ?? `Fehler ${res.status}`, json.reason, res.status);
  }
  return json as T;
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

export const euro = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tg.`;
}

/** datetime-local (Ortszeit des Browsers) → ISO */
export const localToIso = (v: string) => (v ? new Date(v).toISOString() : "");

export const input =
  "w-full rounded-lg border border-white/10 bg-[#0a0a0f] px-3 py-2 text-sm outline-none transition focus:border-primary";
export const btn =
  "rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50";
export const btnBlue =
  "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f74e8] disabled:opacity-50";

export function Card({
  title,
  children,
  right,
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/[0.06] bg-card p-5">
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-semibold">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "red" | "muted";
}) {
  const cls = {
    blue: "border-primary/30 bg-primary/10 text-primary",
    green: "border-success/30 bg-success/10 text-success",
    red: "border-destructive/30 bg-destructive/10 text-destructive",
    muted: "border-white/15 bg-white/5 text-muted-foreground",
  }[tone];
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`mt-3 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>
  );
}

/** Zwei-Klick-Bestätigung ohne Browser-Dialog */
export function ConfirmButton({
  label,
  confirmLabel = "Wirklich?",
  onConfirm,
  danger = true,
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  danger?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const click = async () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };
  const base = danger
    ? armed
      ? "border-destructive bg-destructive text-white"
      : "border-destructive/40 text-destructive hover:bg-destructive/10"
    : armed
      ? "border-primary bg-primary text-white"
      : "border-white/15 hover:bg-white/5";
  return (
    <button
      onClick={click}
      disabled={busy}
      className={`rounded border px-2 py-0.5 text-xs transition disabled:opacity-50 ${base}`}
    >
      {busy ? "…" : armed ? confirmLabel : label}
    </button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="rounded border border-white/10 px-2 py-0.5 text-xs transition hover:bg-white/5"
    >
      {done ? "✓" : "Kopieren"}
    </button>
  );
}
