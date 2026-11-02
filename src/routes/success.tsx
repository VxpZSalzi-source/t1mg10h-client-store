import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { linkToken, loginUrl, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search["session_id"] === "string" ? (search["session_id"] as string) : "",
    free: typeof search["free"] === "string" ? (search["free"] as string) : "",
  }),
  head: () => ({
    meta: [{ title: "Kauf – T1mg10h Client" }, { name: "robots", content: "noindex" }],
  }),
  component: SuccessPage,
});

type Status =
  | { s: "loading" }
  | { s: "paid"; token: string; test: boolean; linked: boolean }
  | { s: "expired" | "invalid" | "timeout" | "error" };

function SuccessPage() {
  const { session_id, free } = Route.useSearch();
  const [st, setSt] = useState<Status>({ s: "loading" });
  const [copied, setCopied] = useState(false);
  const auth = useAuth();
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const tried = useRef(false);

  // Zahlung bestätigen lassen (max. ~60 s, alle 2 s)
  useEffect(() => {
    // Kauf mit 100 %-Gutschein: Token liegt schon im Browser
    if (free) {
      let t: string | null = null;
      try {
        t = sessionStorage.getItem("t1_free_token");
      } catch {
        /* ignorieren */
      }
      return setSt(t ? { s: "paid", token: t, test: false, linked: false } : { s: "invalid" });
    }
    if (!session_id) return setSt({ s: "invalid" });
    let stop = false;
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const r = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(session_id)}`);
        const d = await r.json();
        if (stop) return;
        if (d.status === "paid")
          return setSt({ s: "paid", token: d.token, test: d.test, linked: d.linked });
        if (d.status === "expired" || d.status === "invalid") return setSt({ s: d.status });
      } catch {
        /* nochmal versuchen */
      }
      if (tries >= 30) return setSt({ s: "timeout" });
      setTimeout(poll, 2000);
    };
    poll();
    return () => {
      stop = true;
    };
  }, [session_id, free]);

  // Kauf ohne Login → nachträglich verknüpfen, sobald eingeloggt
  useEffect(() => {
    if (st.s !== "paid" || st.linked || !auth.user || tried.current) return;
    tried.current = true;
    linkToken(st.token).then((r) => setLinkMsg({ ok: r.ok, text: r.message }));
  }, [auth.user, st]);

  const copy = (token: string) =>
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {st.s === "loading" && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <h1 className="mt-6 text-3xl font-bold">Zahlung wird bestätigt…</h1>
            <p className="mt-3 text-muted-foreground">Einen Moment, dein Token wird erstellt.</p>
          </>
        )}

        {st.s === "paid" && (
          <>
            <div className="text-6xl">🎉</div>
            <h1 className="mt-6 text-4xl font-bold">Kauf erfolgreich!</h1>
            {st.test && (
              <p className="mx-auto mt-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                TESTKAUF – es wurde kein echtes Geld abgebucht
              </p>
            )}
            <p className="mt-3 text-muted-foreground">
              Dein Lizenz-Token wurde generiert. Bewahre ihn sicher auf!
            </p>

            <div className="mt-10 rounded-2xl border bg-card p-8">
              <p className="mb-3 text-sm text-muted-foreground">Dein Token</p>
              <div className="rounded-xl border border-primary/40 bg-primary/5 px-6 py-4">
                <code className="text-2xl font-bold tracking-widest text-primary">{st.token}</code>
              </div>
              <button
                onClick={() => copy(st.token)}
                className="mt-4 w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {copied ? "✓ Kopiert!" : "Token kopieren"}
              </button>
              <p className="mt-4 text-xs text-muted-foreground">
                Gib den Token beim ersten Start im T1mg10h Client ein. Speichere ihn jetzt.
              </p>
            </div>

            {auth.enabled && (
              <div className="mt-6 rounded-2xl border bg-card p-6 text-left">
                {st.linked || linkMsg?.ok ? (
                  <p className="text-sm text-success">
                    ✓ Mit deinem Discord-Account verknüpft.{" "}
                    <a href="/konto" className="underline">
                      Zu meinem Konto
                    </a>
                  </p>
                ) : auth.user ? (
                  <p
                    className={`text-sm ${linkMsg ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {linkMsg ? linkMsg.text : "Wird mit deinem Discord-Account verknüpft…"}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Verknüpfe den Kauf mit deinem Discord-Account – dann siehst du deine Lizenz
                      jederzeit unter „Mein Konto“.
                    </p>
                    <a
                      href={loginUrl(
                        `/success?session_id=${encodeURIComponent(session_id)} target="_top"`,
                      )}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] py-3 font-semibold transition hover:bg-white/[0.06]"
                    >
                      Mit Discord verknüpfen
                    </a>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {(st.s === "expired" || st.s === "invalid") && (
          <>
            <h1 className="text-3xl font-bold">Kein bezahlter Kauf gefunden</h1>
            <p className="mt-3 text-muted-foreground">
              Die Zahlung wurde abgebrochen oder ist abgelaufen. Es wurde nichts abgebucht.
            </p>
          </>
        )}

        {(st.s === "timeout" || st.s === "error") && (
          <>
            <h1 className="text-3xl font-bold">Das dauert länger als gedacht</h1>
            <p className="mt-3 text-muted-foreground">
              Lade die Seite in einer Minute neu. Kommt dann immer noch nichts, melde dich mit
              diesem Link im Discord-Support – dein Kauf geht nicht verloren.
            </p>
          </>
        )}

        <Link
          to="/"
          className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
