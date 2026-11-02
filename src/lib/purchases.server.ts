// Speicherung der Käufe in Lovable Cloud (Supabase/PostgREST, Tabelle public.purchases).
// Fallback auf In-Memory, falls die Cloud-Variablen fehlen (z.B. lokal).

export type PlanId = "monthly" | "lifetime";

export interface Purchase {
  token: string;
  plan: PlanId;
  price: string;
  purchasedAt: string;
  redeemedAt: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  linkedAt?: string | null;
  ign?: string | null; // nur bei Admin-Tokens: fester Ingame-Name
  source?: "shop" | "admin";
  note?: string | null;
  redeemedIgn?: string | null; // Ingame-Name, mit dem der Token aktiviert wurde
  lastSeenAt?: string | null; // letzter Client-Start
  livemode?: boolean | null; // Stripe: false = Testkauf, null = ohne Stripe
  amountCents?: number | null;
  expiresAt?: string | null; // null = Lifetime
  createdBy?: string | null; // Discord-ID des Admins (bei Admin-Tokens)
  couponCode?: string | null;
  ignResetAt?: string | null;
  roleRemovedAt?: string | null;
}

interface Row {
  token: string;
  plan: PlanId;
  price: string;
  purchased_at: string;
  redeemed_at: string | null;
  discord_id?: string | null;
  discord_username?: string | null;
  linked_at?: string | null;
  ign?: string | null;
  source?: "shop" | "admin";
  note?: string | null;
  redeemed_ign?: string | null;
  last_seen_at?: string | null;
  stripe_session_id?: string | null;
  livemode?: boolean | null;
  amount_cents?: number | null;
  expires_at?: string | null;
  created_by?: string | null;
  coupon_code?: string | null;
  ign_reset_at?: string | null;
  role_removed_at?: string | null;
}

const toPurchase = (r: Row): Purchase => ({
  token: r.token,
  plan: r.plan,
  price: r.price,
  purchasedAt: r.purchased_at,
  redeemedAt: r.redeemed_at,
  discordId: r.discord_id ?? null,
  discordUsername: r.discord_username ?? null,
  linkedAt: r.linked_at ?? null,
  ign: r.ign ?? null,
  source: r.source ?? "shop",
  note: r.note ?? null,
  redeemedIgn: r.redeemed_ign ?? null,
  lastSeenAt: r.last_seen_at ?? null,
  livemode: r.livemode ?? null,
  amountCents: r.amount_cents ?? null,
  expiresAt: r.expires_at ?? null,
  createdBy: r.created_by ?? null,
  couponCode: r.coupon_code ?? null,
  ignResetAt: r.ign_reset_at ?? null,
  roleRemovedAt: r.role_removed_at ?? null,
});

const memory: Purchase[] = [];

export function cfg() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export async function rest(path: string, init: RequestInit = {}) {
  const c = cfg()!;
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DB [${res.status}]: ${text}`);
  return text ? JSON.parse(text) : [];
}

export async function savePurchase(p: Omit<Purchase, "redeemedAt">): Promise<void> {
  if (!cfg()) {
    memory.push({ source: "shop", ...p, redeemedAt: null });
    return;
  }
  await rest("purchases", {
    method: "POST",
    body: JSON.stringify({
      token: p.token,
      plan: p.plan,
      price: p.price,
      purchased_at: p.purchasedAt,
      ign: p.ign ?? null,
      source: p.source ?? "shop",
      note: p.note ?? null,
      expires_at: p.expiresAt ?? null,
      created_by: p.createdBy ?? null,
      coupon_code: p.couponCode ?? null,
      amount_cents: p.amountCents ?? null,
      discord_id: p.discordId ?? null,
      discord_username: p.discordUsername ?? null,
      linked_at: p.discordId ? p.purchasedAt : null,
    }),
  });
}

export async function listAll(): Promise<Purchase[]> {
  if (!cfg()) {
    return [...memory].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }
  const rows: Row[] = await rest("purchases?select=*&order=purchased_at.desc");
  return rows.map(toPurchase);
}

export async function findByToken(token: string): Promise<Purchase | null> {
  if (!cfg()) return memory.find((p) => p.token === token) ?? null;
  const rows: Row[] = await rest(
    `purchases?select=*&token=eq.${encodeURIComponent(token)}&limit=1`,
  );
  return rows[0] ? toPurchase(rows[0]) : null;
}

/** Löst Token atomar ein. Gibt null zurück, wenn er nicht existiert oder schon eingelöst ist. */
export async function redeem(token: string, ign = ""): Promise<Purchase | null> {
  const now = new Date().toISOString();
  if (!cfg()) {
    const p = memory.find((x) => x.token === token);
    if (!p || p.redeemedAt) return null;
    Object.assign(p, { redeemedAt: now, redeemedIgn: ign || null, lastSeenAt: now });
    return p;
  }
  // Nur Zeilen updaten, die noch nicht eingelöst sind → kein doppeltes Einlösen möglich
  const rows: Row[] = await rest(
    `purchases?token=eq.${encodeURIComponent(token)}&redeemed_at=is.null`,
    {
      method: "PATCH",
      body: JSON.stringify({ redeemed_at: now, redeemed_ign: ign || null, last_seen_at: now }),
    },
  );
  return rows[0] ? toPurchase(rows[0]) : null;
}

/** Merkt sich den letzten Client-Start (für "zuletzt gesehen" im Admin-Panel). */
export async function touchLastSeen(token: string): Promise<void> {
  const now = new Date().toISOString();
  if (!cfg()) {
    const p = memory.find((x) => x.token === token);
    if (p) p.lastSeenAt = now;
    return;
  }
  await rest(`purchases?token=eq.${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_seen_at: now }),
  });
}

/** Alle Käufe eines Discord-Accounts. */
export async function listByDiscord(discordId: string): Promise<Purchase[]> {
  if (!cfg()) {
    return memory
      .filter((p) => p.discordId === discordId)
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }
  const rows: Row[] = await rest(
    `purchases?select=*&discord_id=eq.${encodeURIComponent(discordId)}&order=purchased_at.desc`,
  );
  return rows.map(toPurchase);
}

export type LinkResult = "linked" | "already-yours" | "taken" | "invalid";

/** Verknüpft einen Token mit einem Discord-Account – nur wenn er noch keinem gehört. */
export async function linkToken(
  token: string,
  discordId: string,
  discordUsername: string,
): Promise<LinkResult> {
  const now = new Date().toISOString();
  if (!cfg()) {
    const p = memory.find((x) => x.token === token);
    if (!p) return "invalid";
    if (p.discordId === discordId) return "already-yours";
    if (p.discordId) return "taken";
    Object.assign(p, { discordId, discordUsername, linkedAt: now });
    return "linked";
  }
  // Atomar: nur Zeilen ohne Besitzer werden verknüpft
  const rows: Row[] = await rest(
    `purchases?token=eq.${encodeURIComponent(token)}&discord_id=is.null`,
    {
      method: "PATCH",
      body: JSON.stringify({
        discord_id: discordId,
        discord_username: discordUsername,
        linked_at: now,
      }),
    },
  );
  if (rows[0]) return "linked";
  const existing = await findByToken(token);
  if (!existing) return "invalid";
  return existing.discordId === discordId ? "already-yours" : "taken";
}

/** Token endgültig löschen. Gibt false zurück, wenn es ihn nicht gab. */
export async function deletePurchase(token: string): Promise<boolean> {
  if (!cfg()) {
    const i = memory.findIndex((p) => p.token === token);
    if (i < 0) return false;
    memory.splice(i, 1);
    return true;
  }
  const rows: Row[] = await rest(`purchases?token=eq.${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  return rows.length > 0;
}

const memorySessions = new Map<string, string>(); // stripe_session_id → token (nur lokal)

export async function findBySessionId(sessionId: string): Promise<Purchase | null> {
  if (!cfg()) {
    const token = memorySessions.get(sessionId);
    return token ? (memory.find((p) => p.token === token) ?? null) : null;
  }
  const rows: Row[] = await rest(
    `purchases?select=*&stripe_session_id=eq.${encodeURIComponent(sessionId)}&limit=1`,
  );
  return rows[0] ? toPurchase(rows[0]) : null;
}

/** Kauf aus einer bezahlten Stripe-Session speichern. null = gab es schon (doppelter Aufruf). */
export async function createPurchaseFromStripe(p: {
  token: string;
  plan: PlanId;
  price: string;
  purchasedAt: string;
  stripeSessionId: string;
  livemode: boolean;
  amountCents: number;
  discordId: string | null;
  discordUsername: string | null;
  expiresAt: string | null;
  couponCode: string | null;
}): Promise<Purchase | null> {
  const linkedAt = p.discordId ? p.purchasedAt : null;
  if (!cfg()) {
    if (memorySessions.has(p.stripeSessionId)) return null;
    const purchase: Purchase = {
      token: p.token,
      plan: p.plan,
      price: p.price,
      purchasedAt: p.purchasedAt,
      redeemedAt: null,
      source: "shop",
      livemode: p.livemode,
      amountCents: p.amountCents,
      discordId: p.discordId,
      discordUsername: p.discordUsername,
      linkedAt,
      expiresAt: p.expiresAt,
      couponCode: p.couponCode,
    };
    memory.push(purchase);
    memorySessions.set(p.stripeSessionId, p.token);
    return purchase;
  }
  try {
    const rows: Row[] = await rest("purchases", {
      method: "POST",
      body: JSON.stringify({
        token: p.token,
        plan: p.plan,
        price: p.price,
        purchased_at: p.purchasedAt,
        source: "shop",
        stripe_session_id: p.stripeSessionId,
        livemode: p.livemode,
        amount_cents: p.amountCents,
        discord_id: p.discordId,
        discord_username: p.discordUsername,
        linked_at: linkedAt,
        expires_at: p.expiresAt,
        coupon_code: p.couponCode,
      }),
    });
    return rows[0] ? toPurchase(rows[0]) : null;
  } catch (e) {
    // 409 = stripe_session_id existiert schon (Webhook und Success-Seite gleichzeitig)
    if (e instanceof Error && e.message.includes("[409]")) return null;
    throw e;
  }
}

/** Felder eines Tokens ändern (z. B. Ingame-Name binden/zurücksetzen). */
export async function patchPurchase(token: string, patch: Record<string, unknown>): Promise<void> {
  if (!cfg()) {
    const p = memory.find((x) => x.token === token);
    if (!p) return;
    const map: Record<string, keyof Purchase> = {
      redeemed_ign: "redeemedIgn",
      ign_reset_at: "ignResetAt",
      role_removed_at: "roleRemovedAt",
      last_seen_at: "lastSeenAt",
    };
    for (const [k, v] of Object.entries(patch))
      (p as unknown as Record<string, unknown>)[map[k] ?? k] = v;
    return;
  }
  await rest(`purchases?token=eq.${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

/** Tokens, die ein bestimmter Admin erstellt hat. */
export async function listByCreator(discordId: string): Promise<Purchase[]> {
  if (!cfg()) return memory.filter((p) => p.createdBy === discordId);
  const rows: Row[] = await rest(
    `purchases?select=*&created_by=eq.${encodeURIComponent(discordId)}&order=purchased_at.desc`,
  );
  return rows.map(toPurchase);
}

/** Abgelaufene Lizenzen mit Discord-Konto, deren Rolle noch nicht entfernt wurde. */
export async function listExpiredWithRole(): Promise<Purchase[]> {
  const now = new Date().toISOString();
  if (!cfg()) {
    return memory.filter(
      (p) => p.discordId && p.expiresAt && p.expiresAt < now && !p.roleRemovedAt,
    );
  }
  const rows: Row[] = await rest(
    `purchases?select=*&discord_id=not.is.null&expires_at=lt.${encodeURIComponent(now)}&role_removed_at=is.null&limit=200`,
  );
  return rows.map(toPurchase);
}

/** true, wenn eine Lizenz gerade gültig ist (Lifetime oder noch nicht abgelaufen). */
export const isActive = (p: Purchase, at = Date.now()) =>
  !p.expiresAt || new Date(p.expiresAt).getTime() > at;
