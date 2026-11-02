import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { LegalPage } from "@/data/legal";

export function LegalView({ page }: { page: LegalPage }) {
  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"
        >
          <ArrowLeft size={16} /> Zur Startseite
        </Link>
        <h1 className="mt-6 text-3xl font-bold md:text-4xl">{page.title}</h1>
        {page.placeholder && (
          <p className="mt-6 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
            Platzhalter – der rechtsgültige Text wird noch eingefügt.
          </p>
        )}
        <div className="mt-8 space-y-8">
          {page.sections.map((s, i) => (
            <section key={i}>
              {s.title && <h2 className="text-lg font-semibold">{s.title}</h2>}
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {s.text.split(/\n{2,}/).map((para, j) => (
                  <p key={j} className="whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
