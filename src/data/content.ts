// ============================================================
//  T1mg10h Client – alle Inhalte der Landing Page
//  Alles mit "PLATZHALTER" markierte hier einfach ersetzen.
// ============================================================

// ---------- Links ----------
// PLATZHALTER: Discord-Einladungslink eintragen
export const DISCORD_URL = "[DEIN-DISCORD-INVITE]";

// Kauf-Buttons öffnen den eingebauten Checkout (Token-System) – kein Link nötig.

// ---------- Navigation ----------
export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Module", href: "#module" },
  { label: "Preise", href: "#preise" },
  { label: "Changelog", href: "#changelog" },
  { label: "Discord", href: "#discord" },
];

// ---------- Hero ----------
export const HERO = {
  title: "Der Client, der einfach läuft.",
  subtitle:
    "T1mg10h Client V1 – ein leichter, sauberer Fabric Client für Minecraft 1.21.11. Alles konfigurierbar, sofort einsatzbereit.",
  badges: ["Fabric 1.21.11", "Windows 10/11", "Discord Support"],
};

// ---------- Features ----------
// icon = Name eines Lucide-Icons (siehe components/landing/Features.tsx)
export const FEATURES = [
  {
    icon: "Gauge",
    title: "Leichtgewichtig",
    text: "FPS-freundlich gebaut – der Client bremst dein Spiel nicht aus.",
  },
  {
    icon: "SlidersHorizontal",
    title: "Alles konfigurierbar",
    text: "Jedes Modul lässt sich bis ins Detail an deinen Stil anpassen.",
  },
  {
    icon: "RefreshCw",
    title: "Regelmäßige Updates",
    text: "Neue Module, Fixes und Verbesserungen in regelmäßigen Abständen.",
  },
  {
    icon: "MessagesSquare",
    title: "Discord Support",
    text: "Fragen oder Probleme? Hilfe direkt auf unserem Discord-Server.",
  },
  {
    icon: "KeyRound",
    title: "Sofortige Lieferung",
    text: "Direkt nach dem Kauf erhältst du deinen persönlichen Lizenz-Token.",
  },
  {
    icon: "Cloud",
    title: "Cloud-Configs",
    text: "Speichere deine Einstellungen und lade sie auf jedem Gerät.",
  },
] as const;

// ---------- Module ----------
export const MODULE_CATEGORIES = [
  "Alle",
  "Combat",
  "Movement",
  "Render",
  "Misc",
  "Client",
] as const;
export type ModuleCategory = Exclude<(typeof MODULE_CATEGORIES)[number], "Alle">;
export type ModuleStatus = "Neu" | "Stabil" | "Beta";

// PLATZHALTER: durch echte Module ersetzen (name, category, status)
export const MODULES: { name: string; category: ModuleCategory; status: ModuleStatus }[] = [
  { name: "Modul 1", category: "Combat", status: "Stabil" },
  { name: "Modul 2", category: "Combat", status: "Neu" },
  { name: "Modul 3", category: "Combat", status: "Stabil" },
  { name: "Modul 4", category: "Movement", status: "Stabil" },
  { name: "Modul 5", category: "Movement", status: "Beta" },
  { name: "Modul 6", category: "Render", status: "Stabil" },
  { name: "Modul 7", category: "Render", status: "Neu" },
  { name: "Modul 8", category: "Render", status: "Stabil" },
  { name: "Modul 9", category: "Render", status: "Stabil" },
  { name: "Modul 10", category: "Misc", status: "Stabil" },
  { name: "Modul 11", category: "Misc", status: "Beta" },
  { name: "Modul 12", category: "Client", status: "Stabil" },
];

// ---------- Setup ----------
export const STEPS = [
  {
    title: "Plan kaufen",
    text: "Wähle Monatlich oder Lifetime – ein Klick genügt, ohne Registrierung.",
  },
  {
    title: "Token erhalten",
    text: "Du bekommst sofort deinen Lizenz-Token im Format T1MG-XXXX-XXXX-XXXX.",
  },
  {
    title: "Eingeben & spielen",
    text: "Token beim ersten Start im Client eingeben – fertig. Viel Spaß!",
  },
];

// ---------- Changelog ----------
// PLATZHALTER: durch echte Einträge ersetzen
export const CHANGELOG: {
  date: string;
  tag: "Update" | "Fix" | "Release";
  title: string;
  items: string[];
}[] = [
  {
    date: "TT.MM.JJJJ",
    tag: "Update",
    title: "Changelog-Eintrag – Platzhalter",
    items: ["Änderung 1 – Platzhalter", "Änderung 2 – Platzhalter", "Änderung 3 – Platzhalter"],
  },
  {
    date: "TT.MM.JJJJ",
    tag: "Fix",
    title: "Changelog-Eintrag – Platzhalter",
    items: ["Fix 1 – Platzhalter", "Fix 2 – Platzhalter"],
  },
  {
    date: "TT.MM.JJJJ",
    tag: "Release",
    title: "Changelog-Eintrag – Platzhalter",
    items: ["Änderung 1 – Platzhalter", "Änderung 2 – Platzhalter", "Änderung 3 – Platzhalter"],
  },
];

// ---------- Preise ----------
// Preise kommen aus PLANS (lib/telegram.functions.ts) – hier nur die Texte.
export const PRICING = {
  monthly: {
    subtitle: "30 Tage Zugriff",
    suffix: "/ Monat",
    features: [
      "Alle Module",
      "Updates während der Laufzeit",
      "Discord Support",
      "Sofortige Token-Lieferung",
    ],
  },
  lifetime: {
    subtitle: "Einmalig zahlen, Updates für immer",
    suffix: "einmalig",
    badge: "Beliebtester",
    features: [
      "Alle Module",
      "Updates für immer",
      "Discord Support",
      "Sofortige Token-Lieferung",
      "Zugriff auf alle zukünftigen Features",
    ],
  },
};

// ---------- Bewertungen ----------
// PLATZHALTER: echte Bewertungen eintragen. Leere Einträge zeigen "Bewertung folgt".
// avatar: Bild-URL oder leer lassen (dann werden Initialen angezeigt). stars: 1–5
export const REVIEWS: { name: string; avatar?: string; stars: number; text: string }[] = [
  { name: "", stars: 0, text: "" },
  { name: "", stars: 0, text: "" },
  { name: "", stars: 0, text: "" },
];

// ---------- Footer ----------
export const FOOTER_LINKS = [
  {
    title: "Produkt",
    links: [
      { label: "Features", href: "#features" },
      { label: "Module", href: "#module" },
      { label: "Preise", href: "#preise" },
      { label: "Changelog", href: "#changelog" },
    ],
  },
  { title: "Community", links: [{ label: "Discord", href: DISCORD_URL }] },
  {
    title: "Rechtliches",
    // PLATZHALTER: Links zu deinen echten Seiten eintragen
    links: [
      { label: "AGB", href: "#" },
      { label: "Impressum", href: "#" },
      { label: "Datenschutz", href: "#" },
    ],
  },
];
