import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: String(search.token ?? ""),
  }),
  head: () => ({
    meta: [{ title: "Kauf erfolgreich – T1mg10h Client" }],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { token } = Route.useSearch();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-6 text-4xl font-bold">Kauf erfolgreich!</h1>
        <p className="mt-3 text-muted-foreground">
          Dein Lizenz-Token wurde generiert. Bewahre ihn sicher auf!
        </p>

        <div className="mt-10 rounded-2xl border bg-card p-8">
          <p className="text-sm text-muted-foreground mb-3">Dein Token</p>
          <div className="rounded-xl border border-primary/40 bg-primary/5 px-6 py-4">
            <code className="text-2xl font-bold tracking-widest text-primary">{token || "–"}</code>
          </div>
          <button
            onClick={copy}
            className="mt-4 w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {copied ? "✓ Kopiert!" : "Token kopieren"}
          </button>
          <p className="mt-4 text-xs text-muted-foreground">
            Dieser Token ist dein Zugangsschlüssel. Du erhältst ihn nur einmal – speichere ihn jetzt.
          </p>
        </div>

        <Link to="/" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
