import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminApp } from "@/components/admin/AdminApp";

// Fängt alle unbekannten Adressen ab. Ob eine davon die (geheime) Admin-Adresse ist,
// weiß nur der Server – sie steht nirgends im Code der Website.
export const Route = createFileRoute("/$slug")({
  head: () => ({
    meta: [{ title: "T1mg10h Client" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SlugPage,
});

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted-foreground">Diese Seite gibt es nicht.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}

function SlugPage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<"check" | "admin" | "404">("check");

  useEffect(() => {
    // Nur Adressen, die wie eine Admin-Adresse aussehen, beim Server prüfen
    if (!/^cp-[a-z0-9]{32}$/.test(slug)) return setState("404");
    fetch("/api/admin", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "x-admin-path": slug },
      body: JSON.stringify({ action: "me" }),
    })
      .then((r) => setState(r.status === 404 ? "404" : "admin"))
      .catch(() => setState("404"));
  }, [slug]);

  if (state === "check") return <div className="min-h-screen bg-background" />;
  if (state === "404") return <NotFound />;
  return <AdminApp />;
}
