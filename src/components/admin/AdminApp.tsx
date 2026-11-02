import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { DISCORD_PATH, loginUrl, logout } from "@/lib/auth";
import { Dashboard } from "./Dashboard";
import { Coupons, Promotions } from "./Discounts";
import { Log, Settings } from "./Settings";
import { AdminError, api, type Role } from "./shared";
import { Tokens } from "./Tokens";

interface Me {
  user: { id: string; username: string; avatar: string | null };
  role: Role;
}

const TABS = {
  dashboard: "Dashboard",
  tokens: "Tokens",
  promotions: "Rabatt-Aktionen",
  coupons: "Gutscheine",
  log: "Protokoll",
  settings: "Einstellungen",
} as const;
type Tab = keyof typeof TABS;

function Gate({ title, text, login }: { title: string; text: string; login?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.06] bg-card p-8 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{text}</p>
        {login && (
          <a
            href={loginUrl(typeof window !== "undefined" ? window.location.pathname : "/")}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-white hover:bg-[#2f74e8]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={DISCORD_PATH} />
            </svg>
            Mit Discord anmelden
          </a>
        )}
      </div>
    </div>
  );
}

export function AdminApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [gate, setGate] = useState<{ reason: string; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    api<Me>("me")
      .then((r) => {
        setMe(r);
        if (r.role !== "owner") setTab("tokens");
      })
      .catch((e: AdminError) => setGate({ reason: e.reason ?? "error", text: e.message }));
  }, []);

  if (gate) {
    if (gate.reason === "login" || gate.reason === "expired") {
      return <Gate title="Admin Login" text={gate.text} login />;
    }
    if (gate.reason === "setup") {
      return (
        <Gate
          title="Einrichtung nötig"
          text="Trag in Lovable unter Secrets OWNER_DISCORD_ID mit deiner Discord-ID ein (Discord → Einstellungen → Erweitert → Entwicklermodus an, dann Rechtsklick auf dein Profil → „Benutzer-ID kopieren“)."
        />
      );
    }
    return <Gate title="Kein Zugriff" text={gate.text} />;
  }
  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid text-muted-foreground">
        Lade…
      </div>
    );
  }

  const owner = me.role === "owner";
  const tabs = (owner ? Object.keys(TABS) : ["tokens"]) as Tab[];

  return (
    <div className="min-h-screen bg-grid">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">
              T1mg10h <span className="text-primary">Admin</span>
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${owner ? "bg-primary text-white" : "bg-white/10 text-muted-foreground"}`}
            >
              {owner ? "Owner" : "Admin"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {me.user.avatar && <img src={me.user.avatar} alt="" className="h-7 w-7 rounded-full" />}
            <span className="hidden sm:inline">{me.user.username}</span>
            <button
              onClick={logout}
              title="Abmelden"
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-white"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {tabs.length > 1 && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
              >
                {TABS[t]}
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "tokens" && <Tokens role={me.role} />}
        {tab === "promotions" && <Promotions />}
        {tab === "coupons" && <Coupons />}
        {tab === "log" && <Log />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
}
