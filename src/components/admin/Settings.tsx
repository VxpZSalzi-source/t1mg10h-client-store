import { useEffect, useState } from "react";
import { ACTION_LABELS } from "./Dashboard";
import { api, btn, btnBlue, Card, fmtDateTime, input, Msg } from "./shared";

/* ---------------- Protokoll ---------------- */

interface LogEntry {
  id?: number;
  at?: string;
  kind: string;
  actor_name?: string | null;
  actor_id?: string | null;
  action: string;
  target?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
}

const KINDS: Record<string, string> = {
  "": "Alles",
  admin: "Admin",
  security: "Sicherheit",
  shop: "Shop",
  system: "System",
};

export function Log() {
  const [kind, setKind] = useState("");
  const [list, setList] = useState<LogEntry[] | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    setList(null);
    api<{ entries: LogEntry[] }>("log", { kind })
      .then((r) => setList(r.entries))
      .catch(() => setList([]));
  }, [kind]);
  const q = search.toLowerCase();
  const filtered = (list ?? []).filter(
    (e) =>
      !q ||
      JSON.stringify(e).toLowerCase().includes(q) ||
      (ACTION_LABELS[e.action] ?? "").toLowerCase().includes(q),
  );

  return (
    <Card title="Protokoll">
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(KINDS).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 text-sm ${kind === k ? "bg-primary text-white" : "border border-white/10 text-muted-foreground hover:text-white"}`}
          >
            {label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen…"
          className={`${input} !w-auto flex-1`}
        />
      </div>
      {!list ? (
        <div className="h-24 animate-pulse rounded-lg bg-white/[0.03]" />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Keine Einträge.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2">Zeit</th>
                <th className="px-2 py-2">Ereignis</th>
                <th className="px-2 py-2">Wer</th>
                <th className="px-2 py-2">Ziel</th>
                <th className="px-2 py-2">IP</th>
                <th className="px-2 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr
                  key={e.id ?? i}
                  className="border-b border-white/[0.04] align-top last:border-0"
                >
                  <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">
                    {e.at ? fmtDateTime(e.at) : ""}
                  </td>
                  <td className={`px-2 py-2 ${e.kind === "security" ? "text-destructive" : ""}`}>
                    {ACTION_LABELS[e.action] ?? e.action}
                  </td>
                  <td className="px-2 py-2">
                    {e.actor_name ?? <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-2 py-2">
                    <code className="text-xs">{e.target ?? ""}</code>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{e.ip ?? ""}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {e.details ? JSON.stringify(e.details) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------------- Einstellungen ---------------- */

interface RateRule {
  limit: number;
  windowSec: number;
}
interface Config {
  shopOpen: boolean;
  prices: { monthly: number; lifetime: number };
  plansEnabled: { monthly: boolean; lifetime: boolean };
  monthlyDays: number;
  requireLoginToBuy: boolean;
  bindToIgn: boolean;
  ignResetDays: number;
  offlineDays: number;
  discordAutoRole: boolean;
  rateLimits: Record<
    "validate" | "link" | "adminAccess" | "checkout" | "discordLogin" | "coupon",
    RateRule
  >;
  telegram: Record<
    | "purchase"
    | "activation"
    | "adminActions"
    | "adminLogin"
    | "warnings"
    | "coupons"
    | "promotions",
    boolean
  >;
  admins: { id: string; name: string }[];
}

const RL_LABELS: Record<keyof Config["rateLimits"], string> = {
  validate: "Token prüfen (Client)",
  link: "Token verknüpfen / Name zurücksetzen",
  adminAccess: "Fremde Admin-Zugriffe",
  checkout: "Kauf starten",
  discordLogin: "Discord-Login",
  coupon: "Gutscheincode prüfen",
};
const TG_LABELS: Record<keyof Config["telegram"], string> = {
  purchase: "Neue Käufe",
  activation: "Aktivierung im Client",
  adminActions: "Admin-Aktionen (Token erstellt/gelöscht, Einstellungen)",
  adminLogin: "Admin-Logins",
  warnings: "Sicherheitswarnungen (Rate-Limits)",
  coupons: "Gutschein-Einlösungen",
  promotions: "Start/Ende von Aktionen",
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5 text-sm">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-success" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={input}
        />
        {suffix && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </label>
  );
}

export function Settings() {
  const [c, setC] = useState<Config | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ id: "", name: "" });
  const [toolMsg, setToolMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<{ config: Config; owner: string | null }>("getConfig").then((r) => {
      setC(r.config);
      setOwner(r.owner);
    });
  }, []);
  if (!c)
    return <div className="h-40 animate-pulse rounded-xl border border-white/[0.06] bg-card" />;

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setC({ ...c, [k]: v });
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ config: Config }>("saveConfig", { config: c });
      setC(r.config);
      setMsg({ ok: true, text: "Gespeichert." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Fehler" });
    } finally {
      setBusy(false);
    }
  };
  const tool = async (action: string, ok: (r: Record<string, unknown>) => string) => {
    setToolMsg(null);
    try {
      const r = await api(action);
      setToolMsg({ ok: true, text: ok(r) });
    } catch (e) {
      setToolMsg({ ok: false, text: e instanceof Error ? e.message : "Fehler" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0a0a0f]/90 px-4 py-3 backdrop-blur">
        <span className="text-sm text-muted-foreground">
          Änderungen gelten sofort nach dem Speichern.
        </span>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
              {msg.text}
            </span>
          )}
          <button onClick={save} disabled={busy} className={btnBlue}>
            {busy ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Shop">
          <Toggle
            label="Shop geöffnet (aus = Wartungsmodus)"
            checked={c.shopOpen}
            onChange={(v) => set("shopOpen", v)}
          />
          <Toggle
            label="Monatlich verkaufen"
            checked={c.plansEnabled.monthly}
            onChange={(v) => set("plansEnabled", { ...c.plansEnabled, monthly: v })}
          />
          <Toggle
            label="Lifetime verkaufen"
            checked={c.plansEnabled.lifetime}
            onChange={(v) => set("plansEnabled", { ...c.plansEnabled, lifetime: v })}
          />
          <Toggle
            label="Kaufen nur mit Discord-Login"
            checked={c.requireLoginToBuy}
            onChange={(v) => set("requireLoginToBuy", v)}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Num
              label="Preis Monatlich"
              value={c.prices.monthly / 100}
              step={0.01}
              suffix="€"
              onChange={(v) => set("prices", { ...c.prices, monthly: Math.round(v * 100) })}
            />
            <Num
              label="Preis Lifetime"
              value={c.prices.lifetime / 100}
              step={0.01}
              suffix="€"
              onChange={(v) => set("prices", { ...c.prices, lifetime: Math.round(v * 100) })}
            />
            <Num
              label="Laufzeit Monatlich"
              value={c.monthlyDays}
              suffix="Tage"
              onChange={(v) => set("monthlyDays", v)}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Neue Laufzeit gilt nur für neue Käufe.
          </p>
        </Card>

        <Card title="Lizenzen & Client">
          <Toggle
            label="Token nach Aktivierung an Ingame-Namen binden"
            checked={c.bindToIgn}
            onChange={(v) => set("bindToIgn", v)}
          />
          <Toggle
            label="Discord-Rolle automatisch vergeben/entfernen"
            checked={c.discordAutoRole}
            onChange={(v) => set("discordAutoRole", v)}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Num
              label="Spieler darf Namen zurücksetzen alle"
              value={c.ignResetDays}
              suffix="Tage"
              onChange={(v) => set("ignResetDays", v)}
            />
            <Num
              label="Client ohne Internet maximal"
              value={c.offlineDays}
              suffix="Tage"
              onChange={(v) => set("offlineDays", v)}
            />
          </div>
        </Card>

        <Card title="Rate-Limits (pro IP)">
          <div className="space-y-3">
            {(Object.keys(RL_LABELS) as (keyof Config["rateLimits"])[]).map((k) => (
              <div key={k} className="grid grid-cols-[1fr_80px_100px] items-center gap-2 text-sm">
                <span>{RL_LABELS[k]}</span>
                <input
                  type="number"
                  min={0}
                  value={c.rateLimits[k].limit}
                  onChange={(e) =>
                    set("rateLimits", {
                      ...c.rateLimits,
                      [k]: { ...c.rateLimits[k], limit: Number(e.target.value) },
                    })
                  }
                  className={input}
                  title="Anzahl (0 = aus)"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={10}
                    value={c.rateLimits[k].windowSec}
                    onChange={(e) =>
                      set("rateLimits", {
                        ...c.rateLimits,
                        [k]: { ...c.rateLimits[k], windowSec: Number(e.target.value) },
                      })
                    }
                    className={input}
                    title="Zeitfenster in Sekunden"
                  />
                  <span className="text-xs text-muted-foreground">s</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Anzahl pro Zeitfenster (Sekunden). 0 = kein Limit.
          </p>
        </Card>

        <Card title="Telegram-Meldungen">
          {(Object.keys(TG_LABELS) as (keyof Config["telegram"])[]).map((k) => (
            <Toggle
              key={k}
              label={TG_LABELS[k]}
              checked={c.telegram[k]}
              onChange={(v) => set("telegram", { ...c.telegram, [k]: v })}
            />
          ))}
          <button
            onClick={() => tool("testTelegram", () => "Testnachricht gesendet.")}
            className={`${btn} mt-3`}
          >
            Test-Nachricht senden
          </button>
        </Card>

        <Card title="Admins">
          <p className="mb-3 text-xs text-muted-foreground">
            Owner (du): <code>{owner ?? "nicht gesetzt"}</code>. Admins dürfen nur Admin-Tokens
            erstellen und ihre eigenen sehen.
          </p>
          <ul className="mb-3 divide-y divide-white/[0.05] text-sm">
            {c.admins.length === 0 && (
              <li className="py-2 text-muted-foreground">Noch keine Admins.</li>
            )}
            {c.admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span>
                  {a.name || "Ohne Name"}{" "}
                  <code className="ml-1 text-xs text-muted-foreground">{a.id}</code>
                </span>
                <button
                  onClick={() =>
                    set(
                      "admins",
                      c.admins.filter((x) => x.id !== a.id),
                    )
                  }
                  className="text-xs text-destructive underline"
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              placeholder="Name"
              className={input}
            />
            <input
              value={newAdmin.id}
              onChange={(e) => setNewAdmin({ ...newAdmin, id: e.target.value.replace(/\D/g, "") })}
              placeholder="Discord-ID (nur Zahlen)"
              className={input}
            />
            <button
              disabled={newAdmin.id.length < 15}
              onClick={() => {
                if (!c.admins.some((a) => a.id === newAdmin.id))
                  set("admins", [...c.admins, newAdmin]);
                setNewAdmin({ id: "", name: "" });
              }}
              className={`${btn} whitespace-nowrap`}
            >
              Hinzufügen
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Danach oben auf „Speichern“ klicken.</p>
        </Card>

        <Card title="Admin-Adresse">
          <p className="mb-3 text-sm text-muted-foreground">
            Die Adresse steht nur auf dem Server, nicht im Code der Website. Neu erzeugen, falls sie
            jemand kennt – die alte funktioniert danach sofort nicht mehr. Die neue kommt auch per
            Telegram.
          </p>
          <button
            onClick={async () => {
              setToolMsg(null);
              try {
                const r = await api<{ path: string }>("rotatePath");
                window.location.href = `/${r.path}`;
              } catch (e) {
                setToolMsg({ ok: false, text: e instanceof Error ? e.message : "Fehler" });
              }
            }}
            className={btn}
          >
            Neue Admin-Adresse erzeugen
          </button>
        </Card>

        <Card title="Discord-Bot">
          <p className="mb-3 text-sm text-muted-foreground">
            Einmalig klicken, damit /verify und /lizenz auf deinem Server erscheinen.
          </p>
          <button
            onClick={() =>
              tool(
                "registerCommands",
                (r) => `Registriert: ${(r["commands"] as string[]).join(", ")}`,
              )
            }
            className={btn}
          >
            Befehle registrieren
          </button>
        </Card>
      </div>
      <Msg msg={toolMsg} />
    </div>
  );
}
