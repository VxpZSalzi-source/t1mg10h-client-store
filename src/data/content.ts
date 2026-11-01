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
// Alle Module aus dem T1mg10h Client (Kategorien wie im Client).
export const MODULE_CATEGORIES = [
  "Alle",
  "Combat",
  "Movement",
  "Render",
  "Visuals",
  "Player",
  "Misc",
] as const;
export type ModuleCategory = Exclude<(typeof MODULE_CATEGORIES)[number], "Alle">;

export const MODULES: { name: string; category: ModuleCategory; description: string }[] = [
  {
    name: "Aimbot",
    category: "Combat",
    description: "Sanfte Zielhilfe für Spieler und/oder Mobs.",
  },
  {
    name: "Anchor Macro",
    category: "Combat",
    description: "Respawn Anchor automatisch setzen, aufladen und zünden.",
  },
  {
    name: "Auto Crystal",
    category: "Combat",
    description: "Setzt End-Kristalle am Fadenkreuz und lässt sie explodieren.",
  },
  {
    name: "Auto Hit Crystal",
    category: "Combat",
    description: "Schlägt Kristalle in der Nähe für Burst-Schaden.",
  },
  {
    name: "Auto Totem",
    category: "Combat",
    description: "Hält immer ein Totem der Unsterblichkeit in der Offhand.",
  },
  {
    name: "Crystal Aura",
    category: "Combat",
    description: "Setzt und zerstört End-Kristalle rund um dein Ziel.",
  },
  {
    name: "Crystal Optimizer",
    category: "Combat",
    description: "Entfernt die Client-Verzögerung beim Kristall-Zerstören.",
  },
  {
    name: "Double Anchor",
    category: "Combat",
    description: "Zwei Anchors hintereinander setzen, laden und zünden.",
  },
  {
    name: "Legit Auto Totem",
    category: "Combat",
    description: "Legt ein Totem nur bei offenem Inventar an.",
  },
  {
    name: "Safe Anchor",
    category: "Combat",
    description: "Schützt dich mit Glowstone vor deinem eigenen Anchor.",
  },
  {
    name: "Anti Web",
    category: "Movement",
    description: "Spült Spinnweben mit Wasser weg und schöpft es zurück.",
  },
  {
    name: "Auto Elytra",
    category: "Movement",
    description: "Öffnet die Elytra automatisch und boostet mit Raketen.",
  },
  {
    name: "Click TP",
    category: "Movement",
    description: "Führt /rtp oder /home mit einem Klick aus.",
  },
  {
    name: "Pearl RTP",
    category: "Movement",
    description: "Wirft eine Enderperle hoch und führt dann /rtp aus.",
  },
  {
    name: "Sprint",
    category: "Movement",
    description: "Sprintet automatisch, solange du vorwärts läufst.",
  },
  {
    name: "Amethyst Finder",
    category: "Render",
    description: "Markiert Amethyst-Blöcke und ganze Geoden unter Tage.",
  },
  {
    name: "Block Entity Debug",
    category: "Render",
    description: "Zeigt alle geladenen Block-Entities durch Wände.",
  },
  {
    name: "Block ESP",
    category: "Render",
    description: "Umrandet ausgewählte Blocktypen durch Wände.",
  },
  {
    name: "Chunk Finder",
    category: "Render",
    description: "Markiert Chunks mit vielen von Spielern gesetzten Blöcken.",
  },
  {
    name: "ESP",
    category: "Render",
    description: "Hebt ausgewählte Mobs und Spieler durch Wände hervor.",
  },
  {
    name: "Freelook",
    category: "Render",
    description: "Umschauen, ohne dass sich dein Spieler dreht.",
  },
  {
    name: "Hole ESP",
    category: "Render",
    description: "Zeigt gegrabene Löcher, enge Tunnel und Treppen.",
  },
  {
    name: "Item Nametags",
    category: "Render",
    description: "Zeigt Namen über gedroppten Items an.",
  },
  {
    name: "Light Finder",
    category: "Render",
    description: "Findet von Spielern gesetzte Lichtquellen, vor allem unter Tage.",
  },
  {
    name: "Low Health Warning",
    category: "Render",
    description: "Der Bildschirmrand leuchtet bei wenig Leben.",
  },
  {
    name: "No Render",
    category: "Render",
    description: "Blendet störende Overlays, Wackeln, Wetter, Nebel und Partikel aus.",
  },
  {
    name: "Player Suchen",
    category: "Render",
    description: "Findet Chunks, in denen wahrscheinlich Spieler aktiv sind.",
  },
  {
    name: "Radar",
    category: "Render",
    description: "Mini-Radar mit Spielern, aktiven Chunks und Amethyst.",
  },
  {
    name: "Region Map",
    category: "Render",
    description: "DonutSMP-Regionskarte mit deiner Richtung und Region.",
  },
  { name: "Spawner Nametags", category: "Render", description: "Zeigt den Mob über Spawnern an." },
  {
    name: "Storage ESP",
    category: "Render",
    description: "Hebt Kisten, Fässer, Shulker und andere Lager hervor.",
  },
  {
    name: "Sus Chunk Finder",
    category: "Render",
    description: "Markiert Chunks, in denen Amethyst lange gewachsen ist.",
  },
  { name: "Tracers", category: "Render", description: "Zeichnet Linien zu ausgewählten Entities." },
  {
    name: "Tunnel Finder",
    category: "Render",
    description: "Markiert lange, gerade Tunnel von Spielern.",
  },
  {
    name: "Atmosphäre",
    category: "Visuals",
    description: "Eigene Himmel mit Polarlichtern, Planeten, Nebeln und mehr.",
  },
  {
    name: "Block Overlay",
    category: "Visuals",
    description: "Eigene Umrandung für den anvisierten Block.",
  },
  {
    name: "Custom Crosshair",
    category: "Visuals",
    description: "Dein eigenes Fadenkreuz – mit Editor.",
  },
  { name: "Custom Fov", category: "Visuals", description: "Ändert dein Sichtfeld (bis 150)." },
  {
    name: "Floating Relics",
    category: "Visuals",
    description: "Leuchtende Orbs schweben um dich und ziehen eine Spur.",
  },
  {
    name: "Fullbright",
    category: "Visuals",
    description: "Alles hell – auch in Höhlen und nachts.",
  },
  {
    name: "Item Physics",
    category: "Visuals",
    description: "Items liegen flach, trudeln beim Fallen und bleiben liegen.",
  },
  {
    name: "Particles",
    category: "Visuals",
    description: "Eigene Hit- und Kill-Partikel in deinen Farben.",
  },
  {
    name: "Slow Swing",
    category: "Visuals",
    description: "Eigene Schlag-Animationen mit eigenem Tempo.",
  },
  {
    name: "Spotify HUD",
    category: "Visuals",
    description: "Zeigt deinen Spotify-Song mit Live-Lyrics und Steuerung.",
  },
  { name: "Target ESP", category: "Visuals", description: "Markiert dein aktuelles Kampfziel." },
  { name: "Auto Eat", category: "Player", description: "Isst automatisch, wenn du Hunger hast." },
  {
    name: "Auto Tool",
    category: "Player",
    description: "Nimmt beim Abbauen automatisch das schnellste Werkzeug.",
  },
  { name: "Fast Use", category: "Player", description: "Benutzt Items schneller." },
  {
    name: "No Inv Leak",
    category: "Player",
    description: "Lässt dein Inventar auf dem Bildschirm leer aussehen (für Streams).",
  },
  {
    name: "AH Sniper",
    category: "Misc",
    description: "Kauft günstige Auktionshaus-Angebote und meldet sie an Discord.",
  },
  {
    name: "Anti Vanish",
    category: "Misc",
    description: "Warnt, wenn Teammitglieder aus der Tabliste verschwinden, ohne zu leaven.",
  },
  {
    name: "Auto Enchant V2",
    category: "Misc",
    description: "Craftet Items aus /ah-Material, verzaubert sie und verkauft sie.",
  },
  {
    name: "Auto Reconnect",
    category: "Misc",
    description: "Verbindet dich nach einem Kick automatisch neu.",
  },
  {
    name: "Auto Sell",
    category: "Misc",
    description: "Öffnet /sell und legt alle gewählten Blöcke hinein.",
  },
  {
    name: "Coord Snapper",
    category: "Misc",
    description: "Kopiert deine Koordinaten und kann sie an Discord senden.",
  },
  {
    name: "Fake Stats",
    category: "Misc",
    description: "Zeigt Fake-Stats im Scoreboard und in der Tabliste (nur für dich).",
  },
  {
    name: "Freecam",
    category: "Misc",
    description: "Freie Kamera, während dein Spieler stehen bleibt.",
  },
  { name: "HUD", category: "Misc", description: "Zeigt an, welche Module aktiv sind." },
  {
    name: "Name Protect",
    category: "Misc",
    description: "Ändert deinen Namen (und andere) auf deinem Bildschirm.",
  },
  {
    name: "Order AH Trader",
    category: "Misc",
    description: "Kauft billig im /ah und bedient besser zahlende /orders.",
  },
  {
    name: "Order Dropper",
    category: "Misc",
    description: "Liefert Items aus deinem Inventar an die bestzahlenden Orders.",
  },
  { name: "Panic", category: "Misc", description: "Schaltet sofort alle Module aus." },
  {
    name: "Performance",
    category: "Misc",
    description: "Schaltet Partikel, Wolken und Effekte für mehr FPS ab.",
  },
  {
    name: "Skin Change",
    category: "Misc",
    description: "Zeigt dich mit dem Skin eines anderen Spielers.",
  },
  {
    name: "Spawner Protect",
    category: "Misc",
    description: "Baut deine Spawner in eine Enderkiste ab, wenn jemand kommt.",
  },
  {
    name: "Staff List",
    category: "Misc",
    description: "Zeigt Teammitglieder an, die online sind.",
  },
  {
    name: "Weather Notifier",
    category: "Misc",
    description: "Sagt dir Bescheid, wenn sich das Wetter ändert.",
  },
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
