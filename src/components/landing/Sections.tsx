import {
  ArrowRight,
  Cloud,
  Gauge,
  KeyRound,
  MessagesSquare,
  RefreshCw,
  SlidersHorizontal,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CHANGELOG,
  DISCORD_URL,
  FEATURES,
  HERO,
  MODULE_CATEGORIES,
  MODULES,
  REVIEWS,
  STEPS,
  type ModuleStatus,
} from "@/data/content";
import { PLANS } from "@/lib/telegram.functions";
import { ClickGuiMockup, HudMockup } from "./Mockups";
import { btnGhost, btnPrimary, Counter, PlaceholderTag, Reveal, SectionHeading } from "./ui";

const discordProps = DISCORD_URL.startsWith("http")
  ? { href: DISCORD_URL, target: "_blank", rel: "noreferrer" }
  : { href: "#discord" };

/* ---------------- 2. Hero ---------------- */
export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 md:pt-40">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> T1mg10h Client V1 ist verfügbar
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-6xl md:text-7xl">
            {HERO.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            {HERO.subtitle}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#preise" className={btnPrimary}>
              Jetzt holen – ab {PLANS.monthly.price.replace(".", ",")} <ArrowRight size={18} />
            </a>
            <a href="#module" className={btnGhost}>
              Module ansehen
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {HERO.badges.map((b) => (
              <li
                key={b}
                className="rounded-full border border-white/[0.06] bg-card px-3 py-1 text-xs text-muted-foreground"
              >
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={150} className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-full bg-primary/20 blur-[100px]" />
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-2 shadow-2xl">
            <ClickGuiMockup />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- 3. Features ---------------- */
const ICONS: Record<string, LucideIcon> = {
  Gauge,
  SlidersHorizontal,
  RefreshCw,
  MessagesSquare,
  KeyRound,
  Cloud,
};

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Alles, was du brauchst."
        text="Kein Ballast – nur das, was dein Spiel wirklich besser macht."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = ICONS[f.icon] ?? Gauge;
          return (
            <Reveal key={f.title} delay={i * 60}>
              <div className="lift h-full rounded-2xl border border-white/[0.06] bg-card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- 4. Module ---------------- */
const STATUS_STYLE: Record<ModuleStatus, string> = {
  Neu: "border-primary/30 bg-primary/10 text-primary",
  Stabil: "border-success/30 bg-success/10 text-success",
  Beta: "border-white/10 bg-white/5 text-muted-foreground",
};

export function Modules() {
  const [cat, setCat] = useState<(typeof MODULE_CATEGORIES)[number]>("Alle");
  const list = useMemo(
    () => (cat === "Alle" ? MODULES : MODULES.filter((m) => m.category === cat)),
    [cat],
  );

  return (
    <section id="module" className="border-y border-white/[0.04] bg-white/[0.01]">
      <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
        <SectionHeading
          eyebrow="Module"
          title={
            <>
              <span className="text-primary">
                <Counter to={MODULES.length} />
              </span>{" "}
              Module an Bord
            </>
          }
          text="Filtere nach Kategorie und sieh dir an, was drin ist."
        />
        <Reveal className="mt-10 flex justify-center">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-card p-1">
            {MODULE_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  cat === c
                    ? "bg-primary text-white shadow-glow"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>
        <div
          key={cat}
          className="fade-swap mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {list.map((m) => (
            <div
              key={m.name}
              className="lift flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-card px-4 py-3.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.category}</div>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[m.status]}`}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. Setup ---------------- */
export function Setup() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:py-32">
      <SectionHeading eyebrow="Setup" title="In 3 Schritten startklar." />
      <div className="relative mt-16">
        <div className="absolute left-[16.66%] right-[16.66%] top-6 hidden h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 md:block" />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 120}>
              <li className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-primary/40 bg-[#0a0a0f] text-lg font-bold text-primary shadow-glow">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold md:mt-5">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {s.text.includes("T1MG-XXXX-XXXX-XXXX") ? (
                      <>
                        {s.text.split("T1MG-XXXX-XXXX-XXXX")[0]}
                        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">
                          T1MG-XXXX-XXXX-XXXX
                        </code>
                        {s.text.split("T1MG-XXXX-XXXX-XXXX")[1]}
                      </>
                    ) : (
                      s.text
                    )}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- 6. GUI-Showcase ---------------- */
export function Showcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 md:pb-32">
      <SectionHeading
        eyebrow="Showcase"
        title="So sieht es ingame aus."
        text="Sauberes HUD, klare ArrayList – nichts lenkt ab."
      />
      <Reveal className="relative mx-auto mt-14 max-w-5xl">
        <div className="absolute inset-10 -z-10 bg-primary/25 blur-[90px]" />
        <div className="rounded-2xl border border-white/[0.08] bg-card p-2 shadow-glow">
          {/* PLATZHALTER: durch <img src="/screenshots/ingame.png" ... /> oder <video> ersetzen */}
          <HudMockup />
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------- 7. Changelog ---------------- */
const TAG_STYLE = {
  Update: "border-primary/30 bg-primary/10 text-primary",
  Fix: "border-success/30 bg-success/10 text-success",
  Release: "border-white/15 bg-white/5 text-white",
};

export function Changelog() {
  return (
    <section id="changelog" className="border-y border-white/[0.04] bg-white/[0.01]">
      <div className="mx-auto max-w-6xl px-5 py-24 md:py-32">
        <SectionHeading eyebrow="Changelog" title="Was gibt's Neues?" />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {CHANGELOG.map((c, i) => (
            <Reveal key={i} delay={i * 80}>
              <article className="lift h-full rounded-2xl border border-white/[0.06] bg-card p-6">
                <div className="flex items-center justify-between">
                  <time className="text-xs text-muted-foreground">{c.date}</time>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TAG_STYLE[c.tag]}`}
                  >
                    {c.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{c.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {c.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {it}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 9. Bewertungen ---------------- */
export function Reviews() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 md:py-32">
      <SectionHeading eyebrow="Bewertungen" title="Was Spieler sagen." />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r, i) => {
          const empty = !r.name && !r.text;
          return (
            <Reveal key={i} delay={i * 80}>
              <figure
                className={`h-full rounded-2xl border bg-card p-6 ${empty ? "border-dashed border-white/10" : "border-white/[0.06]"}`}
              >
                <div className="flex items-center gap-3">
                  {r.avatar ? (
                    <img
                      src={r.avatar}
                      alt={r.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-muted-foreground">
                      {r.name ? r.name.slice(0, 2).toUpperCase() : <User size={18} />}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{r.name || "Name folgt"}</div>
                    <div className="mt-0.5 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          size={13}
                          className={s < r.stars ? "fill-primary text-primary" : "text-white/15"}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {r.text || "Bewertung folgt."}
                </blockquote>
                {empty && (
                  <div className="mt-4">
                    <PlaceholderTag />
                  </div>
                )}
              </figure>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- 10. Discord-CTA ---------------- */
export function DiscordCta() {
  return (
    <section id="discord" className="mx-auto max-w-6xl px-5 pb-24 md:pb-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card px-6 py-14 text-center md:px-16">
          <div className="pointer-events-none absolute inset-0 bg-glow" />
          <div className="relative">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <MessagesSquare size={26} />
            </div>
            <h2 className="mt-6 text-3xl font-bold md:text-4xl">Tritt unserem Discord bei</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Support, Updates, Feedback – alles an einem Ort.
            </p>
            <a {...discordProps} className={`${btnPrimary} mt-8`}>
              Discord beitreten <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
