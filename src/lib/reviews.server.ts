// Echte Bewertungen: nur Käufer (Discord-Login + Lizenz) können bewerten, der Owner gibt frei.
import { cfg, listByDiscord, rest } from "./purchases.server";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  discord_id: string;
  username: string;
  avatar: string | null;
  stars: number;
  text: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface PublicReview {
  name: string;
  avatar: string | null;
  stars: number;
  text: string;
  date: string;
}

const memory: Review[] = [];

export const toPublic = (r: Review): PublicReview => ({
  name: r.username,
  avatar: r.avatar,
  stars: r.stars,
  text: r.text,
  date: r.created_at,
});

export async function listApproved(): Promise<PublicReview[]> {
  if (!cfg()) return memory.filter((r) => r.status === "approved").map(toPublic);
  const rows: Review[] = await rest(
    "reviews?select=*&status=eq.approved&order=created_at.desc&limit=60",
  );
  return rows.map(toPublic);
}

export async function listAllReviews(): Promise<Review[]> {
  if (!cfg()) return [...memory];
  return rest("reviews?select=*&order=updated_at.desc&limit=500");
}

export async function findByDiscordId(discordId: string): Promise<Review | null> {
  if (!cfg()) return memory.find((r) => r.discord_id === discordId) ?? null;
  const rows: Review[] = await rest(
    `reviews?select=*&discord_id=eq.${encodeURIComponent(discordId)}&limit=1`,
  );
  return rows[0] ?? null;
}

/** Nur wer mindestens einen gekauften Token mit seinem Account verknüpft hat, darf bewerten. */
export async function isCustomer(discordId: string) {
  const list = await listByDiscord(discordId);
  return list.some((p) => p.source !== "admin");
}

/** Anlegen oder ändern. Jede Änderung muss neu freigegeben werden. */
export async function upsertReview(input: {
  discordId: string;
  username: string;
  avatar: string | null;
  stars: number;
  text: string;
}): Promise<Review> {
  const now = new Date().toISOString();
  const row = {
    discord_id: input.discordId,
    username: input.username,
    avatar: input.avatar,
    stars: input.stars,
    text: input.text,
    status: "pending" as const,
    updated_at: now,
  };
  if (!cfg()) {
    const i = memory.findIndex((r) => r.discord_id === input.discordId);
    const r: Review = {
      id: i >= 0 ? memory[i]!.id : crypto.randomUUID(),
      created_at: i >= 0 ? memory[i]!.created_at : now,
      ...row,
    };
    if (i >= 0) memory[i] = r;
    else memory.push(r);
    return r;
  }
  const rows: Review[] = await rest("reviews?on_conflict=discord_id", {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
  return rows[0]!;
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  if (!cfg()) {
    const r = memory.find((x) => x.id === id);
    if (r) r.status = status;
    return;
  }
  await rest(`reviews?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteReview(id: string) {
  if (!cfg()) {
    const i = memory.findIndex((x) => x.id === id);
    if (i >= 0) memory.splice(i, 1);
    return;
  }
  await rest(`reviews?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function deleteOwnReview(discordId: string) {
  if (!cfg()) {
    const i = memory.findIndex((x) => x.discord_id === discordId);
    if (i >= 0) memory.splice(i, 1);
    return;
  }
  await rest(`reviews?discord_id=eq.${encodeURIComponent(discordId)}`, { method: "DELETE" });
}
