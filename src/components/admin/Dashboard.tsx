import { useEffect, useState } from "react";
import { api, Card, euro, fmtDateTime } from "./shared";

interface Stats {
  revenue: { today: number; week: number; month: number; total: number };
  sales: { monthly: number; lifetime: number; test: number; free: number };
  licenses: { active: number; expired: number; activated: number; admin: number };
  days: { day: string; sales: number; revenue: number }[];
}
interface LogEntry {
  id?: number;
  at?: string;
  kind: string;
  actor_name?: string | null;
  action: string;
  target?: string | null;
}

export const ACTION_LABELS: Record<string, string> = {
  purchase: "Kauf",
  purchase_test: "Testkauf",
  purchase_free: "Kauf mit 100 %-Code",
  activation: "Im Client aktiviert",
  token_create: "Admin-Token erstellt",
  token_delete: "Token gelöscht",
  ign_set: "Ingame-Name geändert",
  ign_reset_self: "Name selbst zurückgesetzt",
  admin_login: "Admin-Login",
  admin_denied: "Admin-Zugriff verweigert",
  admin_forbidden_action: "Unerlaubte Admin-Aktion",
  rate_limit: "Rate-Limit ausgelöst",
  token_wrong_player: "Token von falschem Spieler",
  config_save: "Einstellungen gespeichert",
  promo_create: "Aktion erstellt",
  promo_end: "Aktion beendet",
  coupon_create: "Gutschein erstellt",
  coupon_on: "Gutschein aktiviert",
  coupon_off: "Gutschein deaktiviert",
  coupon_delete: "Gutschein gelöscht",
  roles_removed: "Discord-Rollen entfernt",
};

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Umsatz pro Tag (30 Tage) – eine Reihe, Säulen mit Hover-Tooltip (HTML, damit Schrift nicht mitskaliert) */
function RevenueChart({ days }: { days: Stats["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const empty = days.every((d) => d.revenue === 0);
  const label = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}.`;

  return (
    <Card
      title="Umsatz pro Tag (letzte 30 Tage)"
      right={
        <button
          onClick={() => setTable((t) => !t)}
          className="text-xs text-muted-foreground underline"
        >
          {table ? "Diagramm" : "Als Tabelle"}
        </button>
      }
    >
      {table ? (
        <div className="max-h-64 overflow-y-auto text-sm">
          <table className="w-full">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1">Tag</th>
                <th>Verkäufe</th>
                <th className="text-right">Umsatz</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day} className="border-t border-white/[0.04]">
                  <td className="py-1">{label(d.day)}</td>
                  <td>{d.sales}</td>
                  <td className="text-right">{euro(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          {empty && (
            <p className="absolute inset-x-0 top-12 text-center text-sm text-muted-foreground">
              Noch keine echten Verkäufe in den letzten 30 Tagen.
            </p>
          )}
          <div
            className="flex h-40 items-end gap-[2px] border-b border-white/[0.12]"
            role="img"
            aria-label="Umsatz pro Tag"
          >
            {days.map((d, i) => (
              <div
                key={d.day}
                className="flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {d.revenue > 0 && (
                  <div
                    className="w-full max-w-[24px] rounded-t-[4px] bg-[#3b82f6] transition-opacity"
                    style={{
                      height: `${Math.max(2, (d.revenue / max) * 100)}%`,
                      opacity: hover === null || hover === i ? 1 : 0.45,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex text-[11px] text-muted-foreground">
            {days.map((d, i) => (
              <div key={d.day} className="flex-1 text-center">
                {i % 5 === 0 || i === days.length - 1 ? label(d.day) : ""}
              </div>
            ))}
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0a0a0f] px-3 py-2 text-xs shadow-lg"
              style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
            >
              <div className="font-semibold">{label(days[hover]!.day)}</div>
              <div className="text-muted-foreground">
                {days[hover]!.sales} Verkäufe · {euro(days[hover]!.revenue)}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function Dashboard() {
  const [data, setData] = useState<{ stats: Stats; recent: LogEntry[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = () =>
      api<{ stats: Stats; recent: LogEntry[] }>("dashboard")
        .then(setData)
        .catch((e) => setError(e.message));
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data)
    return <div className="h-40 animate-pulse rounded-xl border border-white/[0.06] bg-card" />;
  const { stats, recent } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Umsatz heute" value={euro(stats.revenue.today)} />
        <Tile label="Letzte 7 Tage" value={euro(stats.revenue.week)} />
        <Tile label="Dieser Monat" value={euro(stats.revenue.month)} />
        <Tile label="Gesamt" value={euro(stats.revenue.total)} sub="nur echte Zahlungen" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Verkauft: Monatlich" value={String(stats.sales.monthly)} />
        <Tile label="Verkauft: Lifetime" value={String(stats.sales.lifetime)} />
        <Tile
          label="Aktive Lizenzen"
          value={String(stats.licenses.active)}
          sub={`${stats.licenses.expired} abgelaufen`}
        />
        <Tile
          label="Im Client aktiviert"
          value={String(stats.licenses.activated)}
          sub={`${stats.licenses.admin} Admin · ${stats.sales.test} Test · ${stats.sales.free} per 100 %-Code`}
        />
      </div>
      <RevenueChart days={stats.days} />
      <Card title="Letzte Ereignisse">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch nichts passiert.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05] text-sm">
            {recent.map((e, i) => (
              <li
                key={e.id ?? i}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span>
                  <span className={e.kind === "security" ? "text-destructive" : ""}>
                    {ACTION_LABELS[e.action] ?? e.action}
                  </span>
                  {e.actor_name && <span className="text-muted-foreground"> · {e.actor_name}</span>}
                  {e.target && (
                    <code className="ml-2 text-xs text-muted-foreground">{e.target}</code>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.at ? fmtDateTime(e.at) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
