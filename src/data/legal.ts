// ============================================================
//  Rechtliche Seiten – PLATZHALTER
//  Die Texte bitte aus einem Generator (z. B. eRecht24, IT-Recht Kanzlei)
//  oder von einem Anwalt übernehmen und hier einfügen.
//  Jeder Abschnitt: { title, text } – Absätze mit Leerzeile trennen.
// ============================================================

export interface LegalPage {
  title: string;
  placeholder: boolean; // true = zeigt einen Hinweis-Balken
  sections: { title?: string; text: string }[];
}

export const LEGAL: Record<"impressum" | "datenschutz" | "agb" | "widerruf", LegalPage> = {
  impressum: {
    title: "Impressum",
    placeholder: true,
    sections: [
      {
        title: "Angaben gemäß § 5 DDG",
        text: "[Vor- und Nachname]\n[Straße und Hausnummer – ladungsfähige Anschrift, kein Postfach]\n[PLZ Ort]\nDeutschland",
      },
      { title: "Kontakt", text: "E-Mail: [deine@email.de]\nDiscord: https://discord.gg/ts37KwHPh" },
      {
        title: "Umsatzsteuer",
        text: "[Falls Kleinunternehmer: Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.]",
      },
    ],
  },
  datenschutz: {
    title: "Datenschutzerklärung",
    placeholder: true,
    sections: [
      {
        title: "Hinweis",
        text: "PLATZHALTER – Den vollständigen Text aus einem Datenschutz-Generator einfügen. Folgende Dienste nutzt diese Website und müssen im Text vorkommen:",
      },
      {
        title: "Hosting",
        text: "Lovable / Cloudflare (Auslieferung der Website, Server-Logs mit IP-Adresse).",
      },
      {
        title: "Datenbank",
        text: "Lovable Cloud / Supabase: Speicherung von Lizenz-Tokens, Kaufzeitpunkt, Plan, Discord-ID und -Name (falls verknüpft), Ingame-Name bei Aktivierung, IP-Adressen im Sicherheitsprotokoll und für Rate-Limits.",
      },
      {
        title: "Discord-Login",
        text: "Anmeldung über Discord (OAuth2, nur Benutzer-ID, Name, Profilbild). Discord-Bot zur Vergabe von Rollen.",
      },
      {
        title: "Zahlungen",
        text: "Stripe Payments Europe Ltd. (Zahlungsabwicklung). Zahlungsdaten erhält nur Stripe.",
      },
      {
        title: "Benachrichtigungen",
        text: "Telegram (interne Benachrichtigung des Betreibers über Käufe, enthält keine Zahlungsdaten).",
      },
      {
        title: "Cookies",
        text: "Nur technisch notwendige Cookies (Login-Sitzung, Schutz beim Discord-Login). Kein Tracking, keine Werbung.",
      },
      {
        title: "Schriftarten",
        text: "Schriftarten werden lokal von dieser Website geladen, nicht von Google.",
      },
    ],
  },
  agb: {
    title: "Allgemeine Geschäftsbedingungen",
    placeholder: true,
    sections: [
      {
        title: "Hinweis",
        text: "PLATZHALTER – AGB aus einem Generator oder vom Anwalt einfügen. Punkte, die darin geregelt sein sollten:",
      },
      {
        title: "Leistung",
        text: "Lizenz-Token für den T1mg10h Client (Fabric, Minecraft 1.21.11). Monatlich: Zugriff für die angegebene Laufzeit. Lifetime: unbefristeter Zugriff.",
      },
      {
        title: "Nutzung",
        text: "Ein Token gilt für einen Spieler. Weitergabe oder Verkauf von Tokens ist untersagt. Bei Missbrauch kann der Token gesperrt werden.",
      },
      {
        title: "Lieferung",
        text: "Der Token wird sofort nach Zahlungseingang angezeigt und kann unter „Mein Konto“ eingesehen werden.",
      },
      {
        title: "Haftung / Serverregeln",
        text: "Der Käufer ist selbst dafür verantwortlich, die Regeln der Server einzuhalten, auf denen er spielt.",
      },
    ],
  },
  widerruf: {
    title: "Widerrufsbelehrung",
    placeholder: true,
    sections: [
      {
        title: "Hinweis",
        text: "PLATZHALTER – Widerrufsbelehrung für digitale Inhalte aus einem Generator einfügen.",
      },
      {
        title: "Vorzeitiges Erlöschen des Widerrufsrechts",
        text: "Das Widerrufsrecht erlischt bei digitalen Inhalten, wenn der Käufer vor dem Kauf ausdrücklich zugestimmt hat, dass die Bereitstellung sofort beginnt, und bestätigt hat, dass er dadurch sein Widerrufsrecht verliert (diese Zustimmung wird beim Kauf per Häkchen eingeholt).",
      },
    ],
  },
};
