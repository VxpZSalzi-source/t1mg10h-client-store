import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { PRICING } from "@/data/content";
import { notifyPurchase, PLANS, type PlanId } from "@/lib/telegram.functions";
import { btnGhost, btnPrimary, Reveal, SectionHeading } from "./ui";

const euro = (p: string) => p.replace(".", ",");

/* ---------------- 8. Preise ---------------- */
export function Pricing() {
  const [plan, setPlan] = useState<PlanId | null>(null);

  return (
    <section id="preise" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
      <SectionHeading
        eyebrow="Preise"
        title="Einfach. Fair. Sofort."
        text="Kein Abo-Dschungel – wähle, was zu dir passt."
      />
      <div className="mt-14 grid items-stretch gap-6 md:grid-cols-2">
        {(Object.keys(PLANS) as PlanId[]).map((id, i) => {
          const info = PRICING[id];
          const hot = "badge" in info;
          return (
            <Reveal key={id} delay={i * 100}>
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
                <h3 className="text-xl font-semibold">{PLANS[id].name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{info.subtitle}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight">
                    {euro(PLANS[id].price)}
                  </span>
                  <span className="text-sm text-muted-foreground">{info.suffix}</span>
                </p>
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
                <button
                  onClick={() => setPlan(id)}
                  className={`${hot ? btnPrimary : btnGhost} mt-8 w-full`}
                >
                  {PLANS[id].name} kaufen
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>
      {plan && <Checkout plan={plan} onClose={() => setPlan(null)} />}
    </section>
  );
}

/* Checkout: erzeugt Token, speichert Kauf, schickt Telegram, leitet zu /success */
function Checkout({ plan, onClose }: { plan: PlanId; onClose: () => void }) {
  const send = useServerFn(notifyPurchase);
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "loading" | string>("idle");

  const submit = async () => {
    setState("loading");
    try {
      const result = await send({ data: { plan } });
      navigate({ to: "/success", search: { token: result.token } });
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
        className="fade-swap relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-card p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-white"
        >
          <X size={18} />
        </button>
        <h3 className="text-2xl font-bold">
          {PLANS[plan].name} – {euro(PLANS[plan].price)}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Mit einem Klick auf „Jetzt kaufen" erhältst du sofort deinen persönlichen Lizenz-Token.
        </p>
        {state !== "idle" && state !== "loading" && (
          <p className="mt-3 text-sm text-destructive">{state}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>
            Abbrechen
          </button>
          <button
            disabled={state === "loading"}
            onClick={submit}
            className={`${btnPrimary} flex-1 disabled:opacity-50`}
          >
            {state === "loading" ? "Wird verarbeitet…" : "Jetzt kaufen"}
          </button>
        </div>
      </div>
    </div>
  );
}
