import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { btnGhost, btnPrimary } from "@/components/landing/ui";
import {
  DISCORD_PATH,
  linkToken,
  loginUrl,
  logout,
  resetIgn,
  useAuth,
  type OwnPurchase,
} from "@/lib/auth";

const ERRORS: Record<string, string> = {
  abgebrochen: "Anmeldung abgebrochen. Bitte versuche es erneut.",
  discord: "Discord hat die Anmeldung abgelehnt. Bitte versuche es erneut.",
  "nicht-eingerichtet": "Der Discord-Login ist noch nicht eingerichtet.",
};

export const Route = createFileRoute("/konto")({
  validateSearch: (s: Record<string, unknown>) => ({
    fehler: typeof s["fehler"] === "string" ? (s["fehler"] as string) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Mein Konto – T1mg10h Client" }, { name: "robots", content: "noindex" }],
  }),
  component: KontoPage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Lizenzstatus aus den Käufen: Lifetime schlägt Monatlich, sonst jüngster Monatskauf. */
function licenseStatus(purchases: OwnPurchase[]) {
  if (purchases.some((p) => p.plan === "lifetime"))
    return { active: true, label: "Lifetime aktiv" };
  const until = purchases
    .filter((p) => p.plan === "monthly" && p.expiresAt)
    .map((p) => new Date(p.expiresAt!).getTime())
    .sort((a, b) => b - a)[0];
  if (!until) return { active: false, label: "Keine Lizenz" };
  return until > Date.now()
    ? { active: true, label: `Aktiv bis ${fmt(new Date(until).toISOString())}` }
    : { active: false, label: `Abgelaufen am ${fmt(new Date(until).toISOString())}` };
}

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={DISCORD_PATH} />
    </svg>
  );
}

function KontoPage() {
  const { fehler } = Route.useSearch();
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-grid">
      <div className="pointer-events-none fixed inset-0 bg-glow" />
      <div className="relative mx-auto max-w-3xl px-5 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
        >
          <ArrowLeft size={16} /> Zur Startseite
        </Link>
        <h1 className="mt-6 text-3xl font-bold md:text-4xl">Mein Konto</h1>

        {fehler && ERRORS[fehler] && (
          <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {ERRORS[fehler]}
          </p>
        )}

        {auth.loading ? (
          <div className="mt-8 h-40 animate-pulse rounded-2xl border border-white/[0.06] bg-card" />
        ) : !auth.enabled ? (
          <div className="mt-8 rounded-2xl border border-white/[0.06] bg-card p-8 text-muted-foreground">
            Der Discord-Login wird gerade eingerichtet. Schau bald wieder vorbei.
          </div>
        ) : !auth.user ? (
          <LoginCard />
        ) : (
          <Account auth={auth} />
        )}
      </div>
    </div>
  );
}

function LoginCard() {
  return (
    <div className="mt-8 rounded-2xl border border-white/[0.06] bg-card p-8 text-center md:p-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <DiscordIcon size={26} />
      </div>
      <h2 className="mt-6 text-2xl font-bold">Mit Discord anmelden</h2>
      <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
        Verbinde deinen Discord-Account, um deine Lizenzen zu sehen und Käufe deinem Account
        zuzuordnen.
      </p>
      <a href={loginUrl("/konto")} target="_top" className={`${btnPrimary} mt-8`}>
        <DiscordIcon size={18} /> Mit Discord anmelden
      </a>
      <p className="mt-4 text-xs text-muted-foreground">
        Wir sehen nur deinen Discord-Namen und dein Profilbild.
      </p>
    </div>
  );
}

function Account({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const user = auth.user!;
  const status = licenseStatus(auth.purchases);

  return (
    <div className="mt-8 space-y-6">
      {/* Profil + Status */}
      <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-14 w-14 rounded-full" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <div className="text-lg font-semibold">{user.username}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <DiscordIcon size={13} /> Mit Discord verbunden
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
              status.active
                ? "border-success/30 bg-success/10 text-success"
                : "border-white/10 bg-white/5 text-muted-foreground"
            }`}
          >
            {status.active ? <ShieldCheck size={15} /> : <KeyRound size={15} />} {status.label}
          </span>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white"
            title="Abmelden"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Lizenzen */}
      <div className="rounded-2xl border border-white/[0.06] bg-card p-6">
        <h2 className="text-lg font-semibold">Meine Lizenzen</h2>
        {auth.purchases.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">
            Noch keine Lizenz mit diesem Account verknüpft.
            <div className="mt-4">
              <a href="/#preise" className={btnPrimary}>
                Client jetzt holen
              </a>
            </div>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {auth.purchases.map((p) => (
              <LicenseRow key={p.token} p={p} onChanged={auth.reload} />
            ))}
          </ul>
        )}
      </div>

      {auth.purchases.length > 0 && <ReviewForm />}

      <LinkForm onLinked={auth.reload} />
    </div>
  );
}

interface MyReview {
  stars: number;
  text: string;
  status: "pending" | "approved" | "rejected";
}

const REVIEW_STATUS: Record<MyReview["status"], string> = {
  pending: "Wartet auf Freigabe",
  approved: "Auf der Startseite sichtbar",
  rejected: "Nicht freigegeben",
};

function ReviewForm() {
  const [mine, setMine] = useState<MyReview | null>(null);
  const [customer, setCustomer] = useState<boolean | null>(null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const call = (data: Record<string, unknown>) =>
    fetch("/api/reviews", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json());

  useEffect(() => {
    call({ action: "mine" })
      .then((r) => {
        setCustomer(!!r.customer);
        if (r.review) {
          setMine(r.review);
          setStars(r.review.stars);
          setText(r.review.text);
        }
      })
      .catch(() => setCustomer(false));
  }, []);

  if (!customer) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await call({ action: "save", stars, text });
      setMsg({ ok: !!r.ok, text: r.ok ? r.message : r.error });
      if (r.ok) setMine(r.review);
    } catch {
      setMsg({ ok: false, text: "Speichern fehlgeschlagen." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      id="bewertung"
      onSubmit={save}
      className="rounded-2xl border border-white/[0.06] bg-card p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{mine ? "Deine Bewertung" : "Bewertung abgeben"}</h2>
        {mine && (
          <span className="text-xs text-muted-foreground">{REVIEW_STATUS[mine.status]}</span>
        )}
      </div>
      <div className="mt-4 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} Sterne`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setStars(n)}
            className="p-0.5"
          >
            <Star
              size={26}
              className={n <= (hover || stars) ? "fill-primary text-primary" : "text-white/20"}
            />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 400))}
        rows={3}
        placeholder="Was gefällt dir am Client? (10–400 Zeichen)"
        className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm outline-none transition focus:border-primary"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {text.length}/400 · Erscheint mit deinem Discord-Namen nach Freigabe
        </span>
        <button
          type="submit"
          disabled={busy || stars === 0 || text.trim().length < 10}
          className={`${btnPrimary} disabled:opacity-50`}
        >
          {busy ? "Speichere…" : mine ? "Aktualisieren" : "Absenden"}
        </button>
      </div>
      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>
      )}
    </form>
  );
}

function LicenseRow({ p, onChanged }: { p: OwnPurchase; onChanged: () => void }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const masked = p.token.replace(/[A-Z0-9]{4}$/, "••••").replace(/-[A-Z0-9]{4}-/, "-••••-");
  const copy = () =>
    navigator.clipboard.writeText(p.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  const reset = async () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    const r = await resetIgn(p.token);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) onChanged();
  };
  const resetBlocked = !!p.nextIgnReset && new Date(p.nextIgnReset).getTime() > Date.now();

  return (
    <li className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {p.plan === "lifetime" ? "Lifetime" : "Monatlich"}
            </span>
            {p.admin && (
              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-semibold uppercase text-primary">
                Admin
              </span>
            )}
            {p.active ? (
              <span className="rounded border border-success/30 bg-success/10 px-1.5 text-[10px] font-semibold uppercase text-success">
                Aktiv
              </span>
            ) : (
              <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 text-[10px] font-semibold uppercase text-destructive">
                Abgelaufen
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Gekauft am {fmt(p.purchasedAt)}
            {p.expiresAt ? ` · gültig bis ${fmt(p.expiresAt)}` : " · für immer"} ·{" "}
            {p.redeemedAt ? (
              <span className="text-success">Im Client aktiviert</span>
            ) : (
              "Noch nicht im Client aktiviert"
            )}
          </div>
          {p.boundTo && (
            <div className="mt-1 text-xs text-muted-foreground">
              Gebunden an <span className="font-mono text-white">{p.boundTo}</span>
              {p.canResetIgn &&
                (resetBlocked ? (
                  <span> · Zurücksetzen wieder ab {fmt(p.nextIgnReset!)}</span>
                ) : (
                  <button
                    onClick={reset}
                    className={`ml-2 underline ${armed ? "text-destructive" : "hover:text-white"}`}
                  >
                    {armed ? "Wirklich zurücksetzen?" : "Name zurücksetzen"}
                  </button>
                ))}
            </div>
          )}
          {msg && (
            <div className={`mt-1 text-xs ${msg.ok ? "text-success" : "text-destructive"}`}>
              {msg.text}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <code className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-sm">
            {show ? p.token : masked}
          </code>
          <button
            onClick={() => setShow((s) => !s)}
            className="rounded-lg p-2 text-muted-foreground hover:text-white"
            title="Anzeigen"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={copy}
            className="rounded-lg p-2 text-muted-foreground hover:text-white"
            title="Kopieren"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </li>
  );
}

function LinkForm({ onLinked }: { onLinked: () => void }) {
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await linkToken(token);
    setMsg({ ok: r.ok, text: r.message });
    setBusy(false);
    if (r.ok) {
      setToken("");
      onLinked();
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/[0.06] bg-card p-6">
      <h2 className="text-lg font-semibold">Token verknüpfen</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Du hast ohne Login gekauft? Gib deinen Token ein, um ihn diesem Account zuzuordnen.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value.toUpperCase())}
          placeholder="T1MG-XXXX-XXXX-XXXX"
          maxLength={19}
          className="flex-1 rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-3 font-mono text-sm outline-none transition focus:border-primary"
        />
        <button disabled={busy || token.length < 19} className={`${btnGhost} disabled:opacity-50`}>
          {busy ? "Prüfe…" : "Verknüpfen"}
        </button>
      </div>
      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>
      )}
    </form>
  );
}
