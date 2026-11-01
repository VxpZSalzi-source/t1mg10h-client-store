import { FOOTER_LINKS } from "@/data/content";
import { Logo } from "./Navbar";

/* ---------------- 11. Footer ---------------- */
export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Fabric Client für Minecraft 1.21.11. Leicht, sauber, konfigurierbar.
          </p>
        </div>
        {FOOTER_LINKS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="transition hover:text-white"
                    {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.04]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} T1mg10h Client. Alle Rechte vorbehalten.</span>
          <span>T1mg10h Client ist nicht mit Mojang AB oder Microsoft verbunden.</span>
        </div>
      </div>
    </footer>
  );
}
