import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import {
  Changelog,
  DiscordCta,
  Features,
  Hero,
  Modules,
  Reviews,
  Setup,
  Showcase,
} from "@/components/landing/Sections";

// Inhalte (Module, Changelog, Bewertungen, Links) anpassen in: src/data/content.ts

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "T1mg10h Client" },
      {
        name: "description",
        content:
          "T1mg10h Client V1 – leichter Fabric Client für Minecraft 1.21.11. Monatlich 9,99€ oder Lifetime 26,99€.",
      },
      { property: "og:title", content: "T1mg10h Client" },
      { property: "og:description", content: "Der Client, der einfach läuft. Fabric 1.21.11." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Modules />
        <Setup />
        <Showcase />
        <Changelog />
        <Pricing />
        <Reviews />
        <DiscordCta />
      </main>
      <Footer />
    </div>
  );
}
