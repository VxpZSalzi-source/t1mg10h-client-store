import { createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/admin/AdminApp";

// Geheime Admin-Adresse. Zugang nur mit Discord-Login (Owner/Admins, siehe Einstellungen).
export const Route = createFileRoute("/panel-mubl2polsx")({
  head: () => ({
    meta: [{ title: "Admin – T1mg10h Client" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminApp,
});
