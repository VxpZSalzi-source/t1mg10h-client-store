import { Fragment, useCallback, useEffect, useState } from "react";
import {
  api,
  Badge,
  btnBlue,
  Card,
  ConfirmButton,
  CopyButton,
  euro,
  fmtDateTime,
  input,
  localToIso,
  Msg,
} from "./shared";

type PlanSel = "all" | "monthly" | "lifetime";
const planLabel = (p: PlanSel) =>
  p === "all" ? "Alle Pläne" : p === "lifetime" ? "Lifetime" : "Monatlich";

interface Promotion {
  id: string;
  plan: PlanSel;
  percent: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
}
interface Coupon {
  code: string;
  percent: number;
  plans: PlanSel;
  max_uses: number | null;
  uses: number;
  once_per_account: boolean;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}
interface Redemption {
  code: string;
  discord_id: string | null;
  token: string | null;
  at: string;
}

const pct = (cents: number, p: number) => Math.max(0, Math.round((cents * (100 - p)) / 100));

function promoState(p: Promotion) {
  const now = Date.now();
  if (!p.active) return { label: "Beendet", tone: "muted" as const };
  if (p.ends_at && new Date(p.ends_at).getTime() <= now)
    return { label: "Abgelaufen", tone: "muted" as const };
  if (p.starts_at && new Date(p.starts_at).getTime() > now)
    return { label: "Geplant", tone: "blue" as const };
  return { label: "Läuft", tone: "green" as const };
}

/* ---------------- Aktionen ---------------- */

export function Promotions() {
  const [list, setList] = useState<Promotion[] | null>(null);
  const [prices, setPrices] = useState({ monthly: 999, lifetime: 2699 });
  const [plan, setPlan] = useState<PlanSel>("lifetime");
  const [percent, setPercent] = useState(10);
  const [now, setNow] = useState(true);
  const [start, setStart] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [end, setEnd] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api<{ promotions: Promotion[] }>("promotions").then((r) => setList(r.promotions)),
    [],
  );
  useEffect(() => {
    load();
    api<{ config: { prices: { monthly: number; lifetime: number } } }>("getConfig")
      .then((r) => setPrices(r.config.prices))
      .catch(() => {});
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("createPromotion", {
        plan,
        percent,
        startsAt: now ? "" : localToIso(start),
        endsAt: unlimited ? "" : localToIso(end),
      });
      setMsg({ ok: true, text: "Aktion angelegt." });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  };

  const previewPlan = plan === "monthly" ? "monthly" : "lifetime";
  const base = prices[previewPlan];
  const valid = percent >= 1 && percent <= 100 && (now || start) && (unlimited || end);

  return (
    <div className="space-y-4">
      <Card title="Neue Rabatt-Aktion">
        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Plan</span>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanSel)}
                  className={input}
                >
                  <option value="lifetime">Lifetime</option>
                  <option value="monthly">Monatlich</option>
                  <option value="all">Beide</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Rabatt in %</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className={input}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Start</span>
                <label className="mb-2 flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={now} onChange={(e) => setNow(e.target.checked)} />{" "}
                  Sofort
                </label>
                {!now && (
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className={input}
                  />
                )}
              </div>
              <div className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Ende</span>
                <label className="mb-2 flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={unlimited}
                    onChange={(e) => setUnlimited(e.target.checked)}
                  />{" "}
                  Unbegrenzt
                </label>
                {!unlimited && (
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className={input}
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Alle Zeiten in deutscher Zeit. Start und Ende kommen per Telegram.
            </p>
            <button disabled={busy || !valid} className={btnBlue}>
              {busy ? "Speichere…" : "Aktion anlegen"}
            </button>
            <Msg msg={msg} />
          </div>
          {/* Vorschau der Preis-Karte */}
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">Vorschau</span>
            <div className="relative rounded-2xl border border-primary/50 bg-[#0a0a0f] p-5">
              <span className="absolute right-4 top-4 rounded-full bg-success px-2.5 py-1 text-[11px] font-bold uppercase text-black">
                Rabatt {percent || 0} %
              </span>
              <div className="font-semibold">
                {previewPlan === "lifetime" ? "Lifetime" : "Monatlich"}
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground line-through">{euro(base)}</span>
                <span className="text-3xl font-extrabold">{euro(pct(base, percent || 0))}</span>
              </div>
              {!unlimited && end && (
                <div className="mt-3 text-xs text-muted-foreground">
                  ⏱ Angebot bis{" "}
                  {new Date(end).toLocaleString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  Uhr
                </div>
              )}
            </div>
          </div>
        </form>
      </Card>

      <Card title="Aktionen">
        {!list ? (
          <div className="h-16 animate-pulse rounded-lg bg-white/[0.03]" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Aktionen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Plan</th>
                  <th className="px-2 py-2">Rabatt</th>
                  <th className="px-2 py-2">Start</th>
                  <th className="px-2 py-2">Ende</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const st = promoState(p);
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-2 py-2.5">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-2 py-2.5">{planLabel(p.plan)}</td>
                      <td className="px-2 py-2.5 font-semibold">−{p.percent} %</td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {p.starts_at ? fmtDateTime(p.starts_at) : "sofort"}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {p.ends_at ? fmtDateTime(p.ends_at) : "unbegrenzt"}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {p.active && st.label !== "Abgelaufen" && (
                          <ConfirmButton
                            label="Beenden"
                            onConfirm={async () => {
                              await api("endPromotion", { id: p.id });
                              await load();
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Gutscheincodes ---------------- */

export function Coupons() {
  const [list, setList] = useState<Coupon[] | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({
    code: "",
    percent: 10,
    plans: "all" as PlanSel,
    maxUses: "",
    oncePerAccount: true,
    expires: "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api<{ coupons: Coupon[]; redemptions: Redemption[] }>("coupons").then((r) => {
        setList(r.coupons);
        setRedemptions(r.redemptions);
      }),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ coupon: Coupon }>("createCoupon", {
        code: f.code,
        percent: f.percent,
        plans: f.plans,
        maxUses: f.maxUses,
        oncePerAccount: f.oncePerAccount,
        expiresAt: localToIso(f.expires),
      });
      setMsg({ ok: true, text: `Code ${r.coupon.code} angelegt.` });
      setF((x) => ({ ...x, code: "" }));
      load();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Neuer Gutscheincode">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">
                Code (leer = zufällig)
              </span>
              <input
                value={f.code}
                onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
                placeholder="z. B. WINTER25"
                maxLength={32}
                className={input}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Rabatt in %</span>
              <input
                type="number"
                min={1}
                max={100}
                value={f.percent}
                onChange={(e) => setF({ ...f, percent: Number(e.target.value) })}
                className={input}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Gilt für</span>
              <select
                value={f.plans}
                onChange={(e) => setF({ ...f, plans: e.target.value as PlanSel })}
                className={input}
              >
                <option value="all">Alle Pläne</option>
                <option value="monthly">Nur Monatlich</option>
                <option value="lifetime">Nur Lifetime</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">
                Max. Einlösungen (leer = unbegrenzt)
              </span>
              <input
                type="number"
                min={1}
                value={f.maxUses}
                onChange={(e) => setF({ ...f, maxUses: e.target.value })}
                className={input}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">
                Gültig bis (optional)
              </span>
              <input
                type="datetime-local"
                value={f.expires}
                onChange={(e) => setF({ ...f, expires: e.target.value })}
                className={input}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={f.oncePerAccount}
                onChange={(e) => setF({ ...f, oncePerAccount: e.target.checked })}
              />
              Pro Discord-Account nur 1×
            </label>
          </div>
          {f.percent === 100 && (
            <p className="text-xs text-success">
              100 %-Code: Der Käufer bekommt den Token direkt, ohne Zahlung.
            </p>
          )}
          <button disabled={busy || !(f.percent >= 1 && f.percent <= 100)} className={btnBlue}>
            {busy ? "Speichere…" : "Code anlegen"}
          </button>
          <Msg msg={msg} />
        </form>
      </Card>

      <Card title="Gutscheincodes">
        {!list ? (
          <div className="h-16 animate-pulse rounded-lg bg-white/[0.03]" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Codes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Rabatt</th>
                  <th className="px-2 py-2">Gilt für</th>
                  <th className="px-2 py-2">Eingelöst</th>
                  <th className="px-2 py-2">Gültig bis</th>
                  <th className="px-2 py-2">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const used = redemptions.filter((r) => r.code === c.code);
                  const expired = !!c.expires_at && new Date(c.expires_at).getTime() <= Date.now();
                  const full = c.max_uses !== null && c.uses >= c.max_uses;
                  return (
                    <Fragment key={c.code}>
                      <tr className="border-b border-white/[0.04]">
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs font-semibold">{c.code}</code>
                            <CopyButton text={c.code} />
                          </div>
                        </td>
                        <td className="px-2 py-2.5 font-semibold">−{c.percent} %</td>
                        <td className="px-2 py-2.5">
                          {planLabel(c.plans)}
                          {c.once_per_account && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · 1× pro Account
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => setOpen(open === c.code ? null : c.code)}
                            className="underline decoration-white/20 hover:decoration-white"
                          >
                            {c.uses} von {c.max_uses ?? "∞"}
                          </button>
                        </td>
                        <td className="px-2 py-2.5 text-muted-foreground">
                          {c.expires_at ? fmtDateTime(c.expires_at) : "–"}
                        </td>
                        <td className="px-2 py-2.5">
                          {!c.active ? (
                            <Badge>Aus</Badge>
                          ) : expired ? (
                            <Badge>Abgelaufen</Badge>
                          ) : full ? (
                            <Badge>Aufgebraucht</Badge>
                          ) : (
                            <Badge tone="green">Aktiv</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right">
                          <button
                            onClick={async () => {
                              await api("toggleCoupon", { code: c.code, active: !c.active });
                              load();
                            }}
                            className="mr-2 rounded border border-white/15 px-2 py-0.5 text-xs hover:bg-white/5"
                          >
                            {c.active ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <ConfirmButton
                            label="Löschen"
                            onConfirm={async () => {
                              await api("deleteCoupon", { code: c.code });
                              await load();
                            }}
                          />
                        </td>
                      </tr>
                      {open === c.code && (
                        <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                          <td colSpan={7} className="px-4 py-3 text-xs">
                            {used.length === 0 ? (
                              <span className="text-muted-foreground">Noch nicht eingelöst.</span>
                            ) : (
                              <ul className="space-y-1">
                                {used.map((r, i) => (
                                  <li key={i}>
                                    {fmtDateTime(r.at)} · Discord-ID {r.discord_id ?? "–"} ·{" "}
                                    <code>{r.token ?? "–"}</code>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
