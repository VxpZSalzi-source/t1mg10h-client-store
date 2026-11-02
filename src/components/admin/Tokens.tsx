import { useCallback, useEffect, useState } from "react";
import { IGN_PATTERN } from "@/lib/plans";
import {
  ago,
  api,
  Badge,
  btnBlue,
  Card,
  ConfirmButton,
  CopyButton,
  euro,
  fmtDate,
  fmtDateTime,
  input,
  type AdminPurchase,
  type Role,
} from "./shared";

function CreateToken({ onCreated }: { onCreated: () => void }) {
  const [ign, setIgn] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ token: string; ign: string } | null>(null);
  const valid = IGN_PATTERN.test(ign.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await api<{ token: string; ign: string }>("createToken", { ign: ign.trim(), note }),
      );
      setIgn("");
      setNote("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Admin-/Owner-Token erstellen">
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Lifetime, kostenlos – funktioniert nur für den eingetragenen Ingame-Namen.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={ign}
          onChange={(e) => setIgn(e.target.value)}
          placeholder="Ingame-Name (Pflicht)"
          maxLength={16}
          className={input}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz, z. B. Owner / Admin (optional)"
          maxLength={60}
          className={input}
        />
        <button disabled={busy || !valid} className={`${btnBlue} whitespace-nowrap`}>
          {busy ? "Erstelle…" : "Token erstellen"}
        </button>
      </form>
      {ign && !valid && (
        <p className="mt-2 text-xs text-destructive">3–16 Zeichen: Buchstaben, Zahlen und _</p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <span className="text-success">Token für {result.ign}:</span>
          <code className="font-mono font-semibold">{result.token}</code>
          <CopyButton text={result.token} />
        </div>
      )}
    </Card>
  );
}

/** Ingame-Name ändern/zurücksetzen (nur Owner) */
function IgnCell({ p, owner, onSaved }: { p: AdminPurchase; owner: boolean; onSaved: () => void }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState("");
  const [err, setErr] = useState("");
  const current = p.ign ?? p.redeemedIgn ?? null;
  const save = async (v: string) => {
    setErr("");
    try {
      await api("setIgn", { token: p.token, ign: v });
      setEdit(false);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    }
  };
  if (edit) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={16}
            className={`${input} !py-1 !text-xs`}
            placeholder={p.source === "admin" ? "Neuer Name" : "Leer = zurücksetzen"}
          />
          <button
            onClick={() => save(value.trim())}
            className="rounded border border-white/10 px-2 text-xs hover:bg-white/5"
          >
            OK
          </button>
          <button onClick={() => setEdit(false)} className="px-1 text-xs text-muted-foreground">
            ✕
          </button>
        </div>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    );
  }
  return (
    <div>
      {current ? (
        <span className="font-mono text-xs">{current}</span>
      ) : (
        <span className="text-muted-foreground">–</span>
      )}
      {owner && (p.source === "admin" || p.redeemedAt) && (
        <button
          onClick={() => {
            setValue(current ?? "");
            setEdit(true);
          }}
          className="ml-2 text-xs text-muted-foreground underline hover:text-white"
        >
          ändern
        </button>
      )}
      {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
    </div>
  );
}

export function Tokens({ role }: { role: Role }) {
  const owner = role === "owner";
  const [list, setList] = useState<AdminPurchase[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "monthly" | "lifetime" | "admin" | "test" | "active" | "expired"
  >("all");

  const load = useCallback(
    () =>
      api<{ purchases: AdminPurchase[] }>("list")
        .then((r) => setList(r.purchases))
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const now = Date.now();
  const expired = (p: AdminPurchase) => !!p.expiresAt && new Date(p.expiresAt).getTime() <= now;
  const q = search.toLowerCase();
  const filtered = (list ?? []).filter((p) => {
    const hit =
      !q ||
      p.token.toLowerCase().includes(q) ||
      (p.ign ?? "").toLowerCase().includes(q) ||
      (p.redeemedIgn ?? "").toLowerCase().includes(q) ||
      (p.discordUsername ?? "").toLowerCase().includes(q) ||
      (p.couponCode ?? "").toLowerCase().includes(q);
    const f =
      filter === "all" ||
      (filter === "monthly" && p.plan === "monthly") ||
      (filter === "lifetime" && p.plan === "lifetime") ||
      (filter === "admin" && p.source === "admin") ||
      (filter === "test" && p.livemode === false) ||
      (filter === "active" && !expired(p)) ||
      (filter === "expired" && expired(p));
    return hit && f;
  });

  return (
    <div className="space-y-4">
      <CreateToken onCreated={load} />
      <Card
        title={
          owner
            ? `Alle Tokens (${list?.length ?? 0})`
            : `Deine erstellten Tokens (${list?.length ?? 0})`
        }
        right={<span className="text-xs text-muted-foreground">aktualisiert sich automatisch</span>}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Token, Ingame-Name, Discord oder Code suchen…"
            className={`${input} min-w-48 flex-1`}
          />
          {owner && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className={`${input} !w-auto`}
            >
              <option value="all">Alle</option>
              <option value="active">Aktiv</option>
              <option value="expired">Abgelaufen</option>
              <option value="monthly">Monatlich</option>
              <option value="lifetime">Lifetime</option>
              <option value="admin">Admin-Tokens</option>
              <option value="test">Testkäufe</option>
            </select>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!list ? (
          <div className="h-24 animate-pulse rounded-lg bg-white/[0.03]" />
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Keine Tokens gefunden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Token</th>
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Ingame-Name</th>
                  {owner && <th className="px-2 py-2">Betrag</th>}
                  <th className="px-2 py-2">Erstellt</th>
                  {owner && <th className="px-2 py-2">Gültig bis</th>}
                  <th className="px-2 py-2">Im Client</th>
                  {owner && <th className="px-2 py-2">Discord</th>}
                  {owner && <th className="px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.token} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-primary">{p.token}</code>
                        <CopyButton text={p.token} />
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {p.plan === "monthly" ? "Monatlich" : "Lifetime"}
                        {p.source === "admin" && <Badge tone="blue">Admin</Badge>}
                        {p.livemode === false && <Badge>Test</Badge>}
                        {p.couponCode && <Badge tone="green">{p.couponCode}</Badge>}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <IgnCell p={p} owner={owner} onSaved={load} />
                    </td>
                    {owner && (
                      <td className="px-2 py-2.5 font-semibold">
                        {p.amountCents != null ? euro(p.amountCents) : p.price}
                      </td>
                    )}
                    <td className="px-2 py-2.5 text-muted-foreground">
                      {fmtDateTime(p.purchasedAt)}
                    </td>
                    {owner && (
                      <td className="px-2 py-2.5">
                        {!p.expiresAt ? (
                          <span className="text-muted-foreground">für immer</span>
                        ) : expired(p) ? (
                          <Badge tone="red">abgelaufen {fmtDate(p.expiresAt)}</Badge>
                        ) : (
                          fmtDate(p.expiresAt)
                        )}
                      </td>
                    )}
                    <td className="px-2 py-2.5">
                      {p.redeemedAt ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            {now - new Date(p.redeemedAt).getTime() < 10 * 60000 && (
                              <Badge tone="green">Neu</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {fmtDateTime(p.redeemedAt)}
                            {p.lastSeenAt && <> · zuletzt {ago(p.lastSeenAt)}</>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Noch nicht</span>
                      )}
                    </td>
                    {owner && (
                      <td className="px-2 py-2.5 text-xs">
                        {p.discordUsername ?? <span className="text-muted-foreground">–</span>}
                      </td>
                    )}
                    {owner && (
                      <td className="px-2 py-2.5 text-right">
                        <ConfirmButton
                          label="Löschen"
                          onConfirm={async () => {
                            await api("deleteToken", { token: p.token });
                            await load();
                          }}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
