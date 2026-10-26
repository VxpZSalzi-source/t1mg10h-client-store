import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { notifyPurchase, sendTestMessage } from "@/lib/telegram.functions";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Telegram-Test – T1mg10h Client" },
      { name: "description", content: "Teste die Telegram-Benachrichtigungen des T1mg10h Clients." },
      { property: "og:title", content: "Telegram-Test – T1mg10h Client" },
      { property: "og:description", content: "Testmodul für Kauf-Benachrichtigungen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestPage,
});

function TestPage() {
  const sendTest = useServerFn(sendTestMessage);
  const sendBuy = useServerFn(notifyPurchase);
  const [text, setText] = useState("Telegram funktioniert!");
  const [log, setLog] = useState<{ ok: boolean; msg: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setLog((l) => [{ ok: true, msg: `${label}: gesendet ✓` }, ...l]);
    } catch (e) {
      setLog((l) => [{ ok: false, msg: `${label}: ${e instanceof Error ? e.message : "Fehler"}` }, ...l]);
    } finally {
      setBusy(false);
    }
  };

  const btn = "rounded-lg px-4 py-3 font-semibold transition disabled:opacity-50";

  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Zurück</Link>
        <h1 className="mt-6 text-4xl font-bold">Telegram <span className="text-primary">Testmodul</span></h1>
        <p className="mt-3 text-muted-foreground">
          Schreib deinem Bot einmal <code className="text-primary">/start</code> in Telegram, dann hier testen.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl border bg-card p-6">
          <label className="text-sm text-muted-foreground">Testnachricht</label>
          <input value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-lg border bg-input/30 px-4 py-3 outline-none focus:border-primary" />
          <div className="grid gap-3 sm:grid-cols-3">
            <button disabled={busy} onClick={() => run("Testnachricht", () => sendTest({ data: { text } }))} className={`${btn} bg-primary text-primary-foreground`}>
              Test senden
            </button>
            <button disabled={busy} onClick={() => run("Kauf Monatlich", () => sendBuy({ data: { plan: "monthly", ign: "TestSpieler", email: "test@example.com" } }))} className={`${btn} bg-secondary hover:bg-muted`}>
              Kauf Monatlich
            </button>
            <button disabled={busy} onClick={() => run("Kauf Lifetime", () => sendBuy({ data: { plan: "lifetime", ign: "TestSpieler", email: "test@example.com" } }))} className={`${btn} bg-secondary hover:bg-muted`}>
              Kauf Lifetime
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {log.map((l, i) => (
            <div key={i} className={`rounded-lg border px-4 py-2 text-sm ${l.ok ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"}`}>
              {l.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
