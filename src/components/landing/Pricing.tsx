import { useNavigate } from "@tanstack/react-router";
import { Check, Timer, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PRICING } from "@/data/content";
import { loginUrl, useAuth, type OwnPurchase } from "@/lib/auth";
import { euro, PLANS, type PlanId } from "@/lib/plans";
import { btnGhost, btnPrimary, Reveal, SectionHeading } from "./ui";

interface PlanPricing {
  plan: PlanId;
  enabled: boolean;
  base: number;
  final: number;
  promo: { percent: number; endsAt: string | null; startsAt: string | null } | null;
  upcoming: { percent: number; startsAt: string } | null;
  lowest30: number;
}
interface PricingData {
  shopOpen: boolean;
  plans: PlanPricing[];
}

// Startwerte, bis /api/pricing geantwortet hat
const FALLBACK: PricingData = {
  shopOpen: true,
  plans: [
    {
      plan: "monthly",
      enabled: true,
      base: 999,
      final: 999,
      promo: null,
      upcoming: null,
      lowest30: 999,
    },
    {
      plan: "lifetime",
      enabled: true,
      base: 2699,
      final: 2699,
      promo: null,
      upcoming: null,
      lowest30: 2699,
    },
  ],
};

function usePricing() {
  const [data, setData] = useState<PricingData>(FALLBACK);
  const load = useCallback(
    () =>
      fetch("/api/pricing")
        .then((r) => r.json())
        .then((d) => d?.plans && setData(d))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);
  return [data, load] as const;
}

/** Live-Countdown bis zu einem Zeitpunkt */
function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { done: true, text: "" };
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    done: false,
    text: d > 0 ? `${d} T ${pad(h)} Std ${pad(m)} Min` : `${pad(h)}:${pad(m)}:${pad(s)}`,
  };
}

const fmtEnd = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

function PriceCard({
  p,
  index,
  owned,
  onBuy,
  reload,
}: {
  p: PlanPricing;
  index: number;
  owned: OwnPurchase | undefined;
  onBuy: () => void;
  reload: () => void;
}) {
  const info = PRICING[p.plan];
  const hot = "badge" in info;
  const countdown = useCountdown(p.promo?.endsAt ?? null);
  // Aktion abgelaufen → Preise neu laden (ohne Seite neu zu laden)
  useEffect(() => {
    if (countdown?.done) reload();
  }, [countdown?.done, reload]);

  return (
    <Reveal delay={index * 100}>
      <div
        className={`lift relative flex h-full flex-col rounded-2xl border p-8 ${
          hot
            ? "border-primary/60 bg-gradient-to-b from-primary/[0.08] to-card shadow-glow"
            : "border-white/[0.06] bg-card"
        }`}
      >
        {hot && (
          <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
            {(info as typeof PRICING.lifetime).badge}
          </span>
        )}
        {p.promo && (
          <span className="absolute right-6 top-6 rounded-full bg-success px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
            Rabatt {p.promo.percent} %
          </span>
        )}
        <h3 className="text-xl font-semibold">{PLANS[p.plan].name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{info.subtitle}</p>

        <div className="mt-6">
          {p.promo && (
            <div className="text-sm text-muted-foreground">
              <span className="line-through">{euro(p.base)}</span>
            </div>
          )}
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tracking-tight">{euro(p.final)}</span>
            <span className="text-sm text-muted-foreground">{info.suffix}</span>
          </p>
        </div>

        {p.promo?.endsAt && countdown && !countdown.done && (
          <div className="mt-4 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-success">
              <Timer size={14} /> Endet in {countdown.text}
            </div>
            <div className="mt-0.5 text-muted-foreground">
              Angebot bis {fmtEnd(p.promo.endsAt)} Uhr
            </div>
          </div>
        )}
        {!p.promo && p.upcoming && (
          <div className="mt-4 text-xs text-muted-foreground">
            Ab {fmtEnd(p.upcoming.startsAt)} Uhr: −{p.upcoming.percent} %
          </div>
        )}

        <ul className="mt-8 flex-1 space-y-3 text-sm">
          {info.features.map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                <Check size={13} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
        {owned && (
          <p className="mt-6 text-xs text-success">
            ✓ Du hast bereits {p.plan === "lifetime" ? "Lifetime" : "eine aktive Monatslizenz"}
          </p>
        )}
        <button
          onClick={onBuy}
          disabled={!p.enabled}
          className={`${hot ? btnPrimary : btnGhost} ${owned ? "mt-3" : "mt-8"} w-full disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {p.enabled ? `${PLANS[p.plan].name} kaufen` : "Gerade nicht verfügbar"}
        </button>
      </div>
    </Reveal>
  );
}

/* ---------------- 8. Preise ---------------- */
export function Pricing() {
  const [data, reload] = usePricing();
  const auth = useAuth();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const ownedActive = (id: PlanId) => auth.purchases.find((x) => x.plan === id && x.active);

  return (
    <section id="preise" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
      <SectionHeading
        eyebrow="Preise"
        title="Einfach. Fair. Sofort."
        text="Kein Abo-Dschungel – wähle, was zu dir passt."
      />
      {!data.shopOpen && (
        <p className="mx-auto mt-8 max-w-md rounded-xl border border-white/10 bg-card px-4 py-3 text-center text-sm text-muted-foreground">
          Der Shop ist gerade im Wartungsmodus. Schau bald wieder vorbei.
        </p>
      )}
      <div className="mt-14 grid items-stretch gap-6 md:grid-cols-2">
        {data.plans.map((p, i) => (
          <PriceCard
            key={p.plan}
            p={{ ...p, enabled: p.enabled && data.shopOpen }}
            index={i}
            owned={ownedActive(p.plan)}
            onBuy={() => setPlan(p.plan)}
            reload={reload}
          />
        ))}
      </div>
      {plan && (
        <Checkout
          pricing={data.plans.find((x) => x.plan === plan)!}
          owned={ownedActive(plan)}
          auth={auth}
          onClose={() => setPlan(null)}
        />
      )}
    </section>
  );
}

interface Quote {
  base: number;
  promoPercent: number;
  afterPromo: number;
  couponCode: string | null;
  couponPercent: number;
  final: number;
}

/* Kauf-Fenster: Gutschein, Widerruf-Häkchen, Login-Pflicht, Hinweis bei schon gekauftem Plan */
function Checkout({
  pricing,
  owned,
  auth,
  onClose,
}: {
  pricing: PlanPricing;
  owned: OwnPurchase | undefined;
  auth: ReturnType<typeof useAuth>;
  onClose: () => void;
}) {
  const plan = pricing.plan;
  const navigate = useNavigate();
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | string>("idle");

  const needsLogin = auth.enabled && auth.requireLoginToBuy && !auth.user;
  const final = quote?.final ?? pricing.final;

  const applyCode = async () => {
    setCodeMsg(null);
    if (!code.trim()) return setQuote(null);
    const res = await fetch("/api/checkout/coupon", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, code }),
    });
    const d = await res.json().catch(() => ({}));
    if (d.ok) {
      setQuote(d.quote);
      setCodeMsg({
        ok: true,
        text: `Code ${d.quote.couponCode} angewendet: −${d.quote.couponPercent} %`,
      });
    } else {
      setQuote(null);
      setCodeMsg({ ok: false, text: d.error ?? "Code ungültig" });
    }
  };

  const submit = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, coupon: quote?.couponCode ?? undefined, consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Starten der Zahlung");
      if (data.free && data.token) {
        try {
          sessionStorage.setItem("t1_free_token", data.token);
        } catch {
          /* ignorieren */
        }
        navigate({ to: "/success", search: { session_id: "", free: "1" } });
        return;
      }
      if (!data.url) throw new Error("Fehler beim Starten der Zahlung");
      window.location.href = data.url;
    } catch (err) {
      setState(err instanceof Error ? err.message : "Fehler");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fade-swap relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.08] bg-card p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-white"
        >
          <X size={18} />
        </button>
        <h3 className="text-2xl font-bold">{PLANS[plan].name}</h3>

        {/* Schon gekauft → Hinweis, Kauf bleibt möglich */}
        {owned && !confirmedDuplicate ? (
          <div className="mt-5">
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
              Du hast bereits{" "}
              {plan === "lifetime" ? "eine Lifetime-Lizenz" : "eine aktive Monatslizenz"} (gekauft
              am {new Date(owned.purchasedAt).toLocaleDateString("de-DE")}
              {owned.expiresAt
                ? `, gültig bis ${new Date(owned.expiresAt).toLocaleDateString("de-DE")}`
                : ""}
              ). Ein neuer Kauf erzeugt einen zusätzlichen Token.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className={`${btnGhost} flex-1`}>
                Abbrechen
              </button>
              <button
                onClick={() => setConfirmedDuplicate(true)}
                className={`${btnPrimary} flex-1`}
              >
                Trotzdem kaufen
              </button>
            </div>
          </div>
        ) : needsLogin ? (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground">
              Melde dich zum Kaufen mit Discord an. So landet der Kauf in „Mein Konto“, und du
              bekommst auf dem Discord-Server automatisch deine Rolle.
            </p>
            <a href={loginUrl("/#preise")} target="_top" className={`${btnPrimary} mt-6 w-full`}>
              Mit Discord anmelden & kaufen
            </a>
          </div>
        ) : (
          <>
            {/* Preis-Aufschlüsselung */}
            <div className="mt-5 space-y-1.5 rounded-xl border border-white/[0.06] bg-[#0a0a0f] p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{PLANS[plan].name}</span>
                <span className={pricing.promo || quote ? "line-through" : ""}>
                  {euro(pricing.base)}
                </span>
              </div>
              {pricing.promo && (
                <div className="flex justify-between">
                  <span>Aktion −{pricing.promo.percent} %</span>
                  <span>{euro(quote?.afterPromo ?? pricing.final)}</span>
                </div>
              )}
              {quote?.couponCode && (
                <div className="flex justify-between text-success">
                  <span>
                    Code {quote.couponCode} −{quote.couponPercent} %
                  </span>
                  <span>{euro(quote.final)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/[0.06] pt-2 text-base font-bold">
                <span>Gesamt</span>
                <span>{euro(final)}</span>
              </div>
            </div>

            {/* Gutscheincode */}
            <div className="mt-4 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && applyCode()}
                placeholder="Gutscheincode"
                maxLength={32}
                className="flex-1 rounded-xl border border-white/10 bg-[#0a0a0f] px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button onClick={applyCode} className={`${btnGhost} !px-4 !py-2.5 text-sm`}>
                Einlösen
              </button>
            </div>
            {codeMsg && (
              <p className={`mt-2 text-xs ${codeMsg.ok ? "text-success" : "text-destructive"}`}>
                {codeMsg.text}
              </p>
            )}

            {/* Widerruf bei digitalen Inhalten */}
            <label className="mt-5 flex cursor-pointer gap-3 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#3b82f6]"
              />
              <span>
                Ich stimme ausdrücklich zu, dass mein Lizenz-Token sofort nach dem Kauf
                bereitgestellt wird. Mir ist bekannt, dass ich dadurch mein{" "}
                <a href="/widerruf" target="_blank" className="text-primary underline">
                  Widerrufsrecht
                </a>{" "}
                verliere. Es gelten die{" "}
                <a href="/agb" target="_blank" className="text-primary underline">
                  AGB
                </a>
                .
              </span>
            </label>

            {auth.user && (
              <p className="mt-3 text-xs text-success">
                ✓ Wird mit deinem Discord-Account ({auth.user.username}) verknüpft
              </p>
            )}
            {state !== "idle" && state !== "loading" && (
              <p className="mt-3 text-sm text-destructive">{state}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className={`${btnGhost} flex-1`}>
                Abbrechen
              </button>
              <button
                disabled={state === "loading" || !consent}
                onClick={submit}
                className={`${btnPrimary} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {state === "loading"
                  ? "Weiterleitung…"
                  : final === 0
                    ? "Weiter zur Kasse (0 €)"
                    : "Weiter zur Zahlung"}
              </button>
            </div>
            {final > 0 && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Sichere Zahlung über Stripe
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
