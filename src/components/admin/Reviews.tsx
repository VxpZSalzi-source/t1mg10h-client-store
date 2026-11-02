import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ReviewStrip, type Review as PublicReview } from "@/components/landing/Sections";
import { api, Badge, btn, btnBlue, Card, ConfirmButton, fmtDateTime } from "./shared";

interface Review {
  id: string;
  discord_id: string;
  username: string;
  avatar: string | null;
  stars: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  updated_at: string;
}

const STATUS = {
  pending: { label: "Wartet", tone: "blue" },
  approved: { label: "Freigegeben", tone: "green" },
  rejected: { label: "Abgelehnt", tone: "red" },
} as const;

/** Vorschau des Laufbands mit leeren Testkarten – wird nicht gespeichert und ist nur hier sichtbar. */
function MarqueePreview({ real }: { real: Review[] }) {
  const [count, setCount] = useState(5);
  const [open, setOpen] = useState(false);
  const approved: PublicReview[] = real
    .filter((r) => r.status === "approved")
    .map((r) => ({
      name: r.username,
      avatar: r.avatar,
      stars: r.stars,
      text: r.text,
      date: r.updated_at,
    }));
  const tests: PublicReview[] = Array.from({ length: count }, (_, i) => ({
    name: `Testbewertung ${i + 1}`,
    avatar: null,
    stars: 5 - (i % 2),
    text: "Platzhaltertext für die Vorschau.",
    date: new Date().toISOString(),
    test: true,
  }));
  return (
    <Card
      title="Laufband-Vorschau"
      right={
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">
            Testkarten{" "}
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="ml-1 rounded border border-white/10 bg-[#0a0a0f] px-2 py-1 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setOpen((o) => !o)} className={open ? btn : btnBlue}>
            {open ? "Schließen" : "Test-Bewertungen anzeigen"}
          </button>
        </div>
      }
    >
      <p className="text-xs text-muted-foreground">
        Zeigt deine freigegebenen Bewertungen plus leere Testkarten, genau wie auf der Startseite.
        Ab 3 Karten läuft es von rechts nach links. Wird nicht gespeichert und ist für Besucher
        nicht sichtbar.
      </p>
      {open && (
        <div className="-mx-5 mt-5">
          <ReviewStrip list={[...approved, ...tests]} />
        </div>
      )}
    </Card>
  );
}

export function Reviews() {
  const [list, setList] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<"all" | Review["status"]>("all");
  const load = useCallback(
    () => api<{ reviews: Review[] }>("reviews").then((r) => setList(r.reviews)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const set = async (id: string, status: Review["status"]) => {
    await api("reviewStatus", { id, status });
    load();
  };
  const del = async (id: string) => {
    await api("deleteReview", { id });
    load();
  };

  const shown = (list ?? []).filter((r) => filter === "all" || r.status === filter);
  const pending = (list ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <MarqueePreview real={list ?? []} />
      <Card
        title={`Bewertungen${pending ? ` · ${pending} warten` : ""}`}
        right={
          <div className="flex gap-1">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-xs transition ${filter === f ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5"}`}
              >
                {f === "all" ? "Alle" : STATUS[f].label}
              </button>
            ))}
          </div>
        }
      >
        <p className="mb-4 text-xs text-muted-foreground">
          Nur Käufer mit verknüpftem Token können bewerten. Auf der Startseite erscheinen nur
          freigegebene. Ändert jemand seine Bewertung, muss sie neu freigegeben werden.
        </p>
        {!list && <p className="text-sm text-muted-foreground">Lade…</p>}
        {list && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Keine Bewertungen.</p>
        )}
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/[0.06] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {r.avatar ? (
                    <img src={r.avatar} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-xs">
                      {r.username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-semibold">{r.username}</span>
                  <span className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={i < r.stars ? "fill-primary text-primary" : "text-white/15"}
                      />
                    ))}
                  </span>
                  <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{fmtDateTime(r.updated_at)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <button
                    onClick={() => set(r.id, "approved")}
                    className={`${btn} border-success/40 text-success`}
                  >
                    Freigeben
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button onClick={() => set(r.id, "rejected")} className={btn}>
                    {r.status === "approved" ? "Ausblenden" : "Ablehnen"}
                  </button>
                )}
                <ConfirmButton label="Löschen" onConfirm={() => del(r.id)} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
