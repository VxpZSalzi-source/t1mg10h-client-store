import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  createAdminToken,
  IGN_PATTERN,
  listPurchases,
  registerDiscordCommands,
  type Purchase,
} from "@/lib/telegram.functions";

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
        p.plan.includes(search.toLowerCase()) ||
        (p.ign ?? "").toLowerCase().includes(search.toLowerCase());
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

        <div className="mt-2 text-sm text-muted-foreground">
          {purchases.filter((p) => p.source !== "admin").length} Verkäufe ·{" "}
          {purchases.filter((p) => p.source === "admin").length} Admin-Tokens
        </div>

        <BotSetup password={password} />

        <AdminTokenForm
          password={password}
          onCreated={(p) => setPurchases((list) => [p, ...(list ?? [])])}
        />

        {/* Filter */}
        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Token, Plan oder Ingame-Name suchen…"
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
                  <th className="px-4 py-3 text-left font-semibold">Ingame-Name</th>
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
                    <td className="px-4 py-3">
                      {p.plan === "monthly" ? "Monatlich" : "Lifetime"}
                      {p.source === "admin" && (
                        <span className="ml-2 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.ign ? (
                        <span className="font-mono text-xs">{p.ign}</span>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                      {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
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

function AdminTokenForm({
  password,
  onCreated,
}: {
  password: string;
  onCreated: (p: Purchase) => void;
}) {
  const create = useServerFn(createAdminToken);
  const [ign, setIgn] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ token: string; ign: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const valid = IGN_PATTERN.test(ign.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await create({ data: { password, ign: ign.trim(), note } });
      setResult(r);
      onCreated({
        token: r.token,
        plan: "lifetime",
        price: "0€",
        purchasedAt: new Date().toISOString(),
        redeemedAt: null,
        ign: r.ign,
        source: "admin",
        note: note || null,
      });
      setIgn("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Admin-/Owner-Token erstellen</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Lifetime, kostenlos – funktioniert nur für den eingetragenen Ingame-Namen.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={ign}
          onChange={(e) => setIgn(e.target.value)}
          placeholder="Ingame-Name (Pflicht)"
          maxLength={16}
          required
          className="flex-1 rounded-lg border bg-input/30 px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz, z. B. Owner / Admin (optional)"
          maxLength={60}
          className="flex-1 rounded-lg border bg-input/30 px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={busy || !valid}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Erstelle…" : "Token erstellen"}
        </button>
      </div>
      {ign && !valid && (
        <p className="mt-2 text-xs text-destructive">3–16 Zeichen: Buchstaben, Zahlen und _</p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <span className="text-success">Token für {result.ign}:</span>
          <code className="font-mono font-semibold">{result.token}</code>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(result.token).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
            className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
          >
            {copied ? "✓" : "Kopieren"}
          </button>
        </div>
      )}
    </form>
  );
}

function BotSetup({ password }: { password: string }) {
  const register = useServerFn(registerDiscordCommands);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await register({ data: { password } });
      setMsg({ ok: true, text: `Registriert: ${r.commands.join(", ")}` });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
      <div>
        <h2 className="font-semibold">Discord-Bot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Einmalig klicken, damit /verify und /lizenz auf deinem Server erscheinen.
        </p>
        {msg && (
          <p className={`mt-2 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
            {msg.text}
          </p>
        )}
      </div>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
      >
        {busy ? "Registriere…" : "Befehle registrieren"}
      </button>
    </div>
  );
}
