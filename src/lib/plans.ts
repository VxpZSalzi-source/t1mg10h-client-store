// Gemeinsame Plan-Daten (Browser + Server). Echte Preise kommen aus der Config (/api/pricing).
export const PLANS = {
  monthly: { name: "Monatlich", price: "9.99€" },
  lifetime: { name: "Lifetime", price: "26.99€" },
} as const;
export type PlanId = keyof typeof PLANS;

export const IGN_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export const euro = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;
