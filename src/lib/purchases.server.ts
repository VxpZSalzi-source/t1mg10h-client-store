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
});

const memory: Purchase[] = [];

function cfg() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function rest(path: string, init: RequestInit = {}) {
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
export async function redeem(token: string): Promise<Purchase | null> {
  const now = new Date().toISOString();
  if (!cfg()) {
    const p = memory.find((x) => x.token === token);
    if (!p || p.redeemedAt) return null;
    p.redeemedAt = now;
    return p;
  }
  // Nur Zeilen updaten, die noch nicht eingelöst sind → kein doppeltes Einlösen möglich
  const rows: Row[] = await rest(
    `purchases?token=eq.${encodeURIComponent(token)}&redeemed_at=is.null`,
    { method: "PATCH", body: JSON.stringify({ redeemed_at: now }) },
  );
  return rows[0] ? toPurchase(rows[0]) : null;
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
