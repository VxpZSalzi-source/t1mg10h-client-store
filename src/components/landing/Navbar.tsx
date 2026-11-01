import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DISCORD_URL, NAV_LINKS } from "@/data/content";
import { DISCORD_PATH, loginUrl, useAuth } from "@/lib/auth";
import { btnPrimary } from "./ui";

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-sm font-extrabold text-primary">
        T
      </span>
      T1mg10h
    </a>
  );
}

/** Login-Button bzw. Profil-Chip (nur sichtbar, wenn der Discord-Login eingerichtet ist). */
function AccountButton({ full = false, onClick }: { full?: boolean; onClick?: () => void }) {
  const { loading, enabled, user } = useAuth();
  if (loading || !enabled) return null;
  if (user) {
    return (
      <a
        href="/konto"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-sm font-medium text-white transition hover:border-white/20 ${full ? "w-full" : ""}`}
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-7 w-7 rounded-full" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {user.username.slice(0, 2).toUpperCase()}
          </span>
        )}
        Mein Konto
      </a>
    );
  }
  return (
    <a
      href={loginUrl("/konto")}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06] ${full ? "w-full" : ""}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={DISCORD_PATH} />
      </svg>
      Login
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkHref = (href: string) =>
    href === "#discord" && DISCORD_URL.startsWith("http") ? DISCORD_URL : href;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "border-b border-white/[0.06] bg-[#0a0a0f]/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <ul className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a href={linkHref(l.href)} className="transition hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <AccountButton />
          <a href="#preise" className={`${btnPrimary} px-5 py-2 text-sm`}>
            Jetzt holen
          </a>
        </div>
        <button
          className="rounded-lg p-2 text-white md:hidden"
          aria-label="Menü"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
      <div
        className={`overflow-hidden transition-[max-height] duration-300 md:hidden ${open ? "max-h-96" : "max-h-0"}`}
      >
        <ul className="space-y-1 px-5 pb-5">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={linkHref(l.href)}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="pt-2">
            <AccountButton full onClick={() => setOpen(false)} />
          </li>
          <li className="pt-1">
            <a href="#preise" onClick={() => setOpen(false)} className={`${btnPrimary} w-full`}>
              Jetzt holen
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
