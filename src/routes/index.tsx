import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { notifyPurchase, PLANS, type PlanId } from "@/lib/telegram.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "T1mg10h Client – Minecraft PvP Client" },
      { name: "description", content: "T1mg10h Client: schneller, moderner Minecraft Client. Monatlich 9.99€ oder Lifetime 26.99€." },
      { property: "og:title", content: "T1mg10h Client" },
      { property: "og:description", content: "Moderner Minecraft Client – Monatlich oder Lifetime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  ["⚡", "Mehr FPS", "Optimierte Engine für flüssiges Gameplay."],
  ["🎯", "PvP Mods", "Keystrokes, CPS, Hitboxen und mehr."],
  ["🎨", "Cosmetics", "Capes, Wings und eigene Designs."],
  ["🛡️", "Sicher", "Regelmäßige Updates und Support."],
];

function Index() {
  const [plan, setPlan] = useState<PlanId | null>(null);
  return (
    <div className="min-h-screen bg-grid">
      <div className="bg-glow">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="font-display text-xl font-bold">
            T1mg10h<span className="text-primary">Client</span>
          </span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#preise" className="hover:text-foreground">Preise</a>
            <Link to="/test" className="hover:text-foreground">Telegram-Test</Link>
          </div>
        </nav>
        <header className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center">
          <span className="rounded-full border border-primary/40 px-4 py-1 text-xs uppercase tracking-widest text-primary">
            Minecraft Client
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-tight md:text-7xl">
            Spiel besser mit <span className="text-primary">T1mg10h</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Mehr FPS, bessere PvP-Tools und ein Look, der auffällt.
          </p>
          <a href="#preise" className="mt-10 inline-block rounded-lg bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-glow transition hover:scale-105">
            Jetzt holen
          </a>
        </header>
      </div>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-4">
        {features.map(([i, t, d]) => (
          <div key={t} className="rounded-xl border bg-card p-6">
            <div className="text-3xl">{i}</div>
            <h3 className="mt-4 font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section id="preise" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-center text-4xl font-bold">Preise</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const hot = id === "lifetime";
            return (
              <div key={id} className={`relative rounded-2xl border bg-card p-8 ${hot ? "border-primary shadow-glow" : ""}`}>
                {hot && (
                  <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                    Bester Deal
                  </span>
                )}
                <h3 className="text-xl font-semibold">{PLANS[id].name}</h3>
                <p className="mt-4 font-display text-5xl font-bold">
                  {PLANS[id].price}
                  <span className="text-base font-normal text-muted-foreground">{id === "monthly" ? " / Monat" : " einmalig"}</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <li>✓ Alle Features</li>
                  <li>✓ Updates {id === "lifetime" ? "für immer" : "solange aktiv"}</li>
                  <li>✓ Discord Support</li>
                </ul>
                <button
                  onClick={() => setPlan(id)}
                  className={`mt-8 w-full rounded-lg py-3 font-semibold transition ${hot ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary hover:bg-muted"}`}
                >
                  Kaufen
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} T1mg10h Client
      </footer>

      {plan && <Checkout plan={plan} onClose={() => setPlan(null)} />}
    </div>
  );
}

function Checkout({ plan, onClose }: { plan: PlanId; onClose: () => void }) {
  const send = useServerFn(notifyPurchase);
  const [ign, setIgn] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | string>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      await send({ data: { plan, ign, email } });
      setState("done");
    } catch (err) {
      setState(err instanceof Error ? err.message : "Fehler");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-8" onClick={(e) => e.stopPropagation()}>
        {state === "done" ? (
          <div className="text-center">
            <div className="text-5xl">✅</div>
            <h3 className="mt-4 text-2xl font-bold">Bestellung erhalten!</h3>
            <p className="mt-2 text-muted-foreground">Wir melden uns per E-Mail bei dir.</p>
            <button onClick={onClose} className="mt-6 rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground">Schließen</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h3 className="text-2xl font-bold">{PLANS[plan].name} – {PLANS[plan].price}</h3>
            <input required value={ign} onChange={(e) => setIgn(e.target.value)} placeholder="Minecraft-Name" className="w-full rounded-lg border bg-input/30 px-4 py-3 outline-none focus:border-primary" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" className="w-full rounded-lg border bg-input/30 px-4 py-3 outline-none focus:border-primary" />
            {state !== "idle" && state !== "loading" && <p className="text-sm text-destructive">{state}</p>}
            <button disabled={state === "loading"} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
              {state === "loading" ? "Wird gesendet…" : "Kauf bestätigen"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
