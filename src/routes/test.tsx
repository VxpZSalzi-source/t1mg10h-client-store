import { createFileRoute, Link } from "@tanstack/react-router";

// Der frühere öffentliche Telegram-Test ist ins Admin-Panel umgezogen (Einstellungen → Test-Nachricht).
export const Route = createFileRoute("/test")({
  head: () => ({ meta: [{ title: "T1mg10h Client" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-grid px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Diese Seite gibt es nicht mehr</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Zur Startseite
        </Link>
      </div>
    </div>
  ),
});
