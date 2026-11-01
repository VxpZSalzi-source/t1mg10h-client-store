import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listPurchases, type Purchase } from "@/lib/telegram.functions";

export const Route = createFileRoute("/panel-mubl2polsx")({
  head: () => ({
    meta: [{ title: "Admin – T1mg10h Client" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const fetchPurchases = useServerFn(listPurchases);
  const [password, setPassword] = useState("");
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | "monthly" | "lifetime">("all");
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await fetchPurchases({ data: { password } });
      setPurchases(result.purchases);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  const filtered =
    purchases?.filter((p) => {
      const matchSearch =
        !search ||
        p.token.toLowerCase().includes(search.toLowerCase()) ||
        p.plan.includes(search.toLowerCase());
      const matchPlan = filterPlan === "all" || p.plan === filterPlan;
      return matchSearch && matchPlan;
    }) ?? [];

  if (!purchases) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-8">
          <h1 className="text-2xl font-bold text-center">Admin Login</h1>
          <form onSubmit={login} className="mt-6 space-y-4">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full rounded-lg border bg-input/30 px-4 py-3 outline-none focus:border-primary"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Wird geprüft…" : "Einloggen"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            Admin <span className="text-primary">Übersicht</span>
          </h1>
          <button
            onClick={() => setPurchases(null)}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            Ausloggen
          </button>
        </div>

        <div className="mt-2 text-sm text-muted-foreground">{purchases.length} Verkäufe gesamt</div>

        {/* Filter */}
        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Token oder Plan suchen…"
            className="flex-1 min-w-48 rounded-lg border bg-input/30 px-4 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value as any)}
            className="rounded-lg border bg-input/30 px-4 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="all">Alle Pläne</option>
            <option value="monthly">Monatlich</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            {purchases.length === 0
              ? "Noch keine Käufe vorhanden."
              : "Keine Ergebnisse für diese Suche."}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Token</th>
                  <th className="px-4 py-3 text-left font-semibold">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold">Betrag</th>
                  <th className="px-4 py-3 text-left font-semibold">Datum & Uhrzeit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.token}
                    className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-primary font-mono text-xs">{p.token}</code>
                        <button
                          onClick={() => copyToken(p.token)}
                          className="rounded px-2 py-0.5 text-xs border hover:bg-muted transition"
                        >
                          {copiedToken === p.token ? "✓" : "Kopieren"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {p.plan === "monthly" ? "Monatlich" : "Lifetime"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{p.price}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.purchasedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
