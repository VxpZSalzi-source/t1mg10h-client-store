// PLATZHALTER: CSS-Attrappen der Client-GUI.
// Zum Ersetzen einfach <ClickGuiMockup /> bzw. <HudMockup /> durch z.B.
//   <img src="/screenshots/clickgui.png" alt="T1mg10h ClickGUI" className="w-full rounded-xl" />
// austauschen (Bild in den Ordner public/screenshots legen).

import { PlaceholderTag } from "./ui";

const GUI_COLUMNS: { title: string; modules: { name: string; on?: boolean }[] }[] = [
  {
    title: "Combat",
    modules: [
      { name: "Auto Totem", on: true },
      { name: "Crystal Aura" },
      { name: "Anchor Macro", on: true },
    ],
  },
  { title: "Movement", modules: [{ name: "Sprint", on: true }, { name: "Auto Elytra" }] },
  {
    title: "Render",
    modules: [
      { name: "ESP", on: true },
      { name: "Storage ESP" },
      { name: "Tracers", on: true },
      { name: "Radar" },
    ],
  },
  { title: "Visuals", modules: [{ name: "Fullbright", on: true }, { name: "Custom Crosshair" }] },
];

export function ClickGuiMockup() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14] p-4 font-mono text-[11px] sm:p-6">
      <div className="absolute bottom-3 right-3 z-10">
        <PlaceholderTag />
      </div>
      {/* Minecraft-Hintergrund angedeutet */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:linear-gradient(180deg,#101826_0%,#0d0d14_60%),repeating-linear-gradient(90deg,transparent_0_31px,rgba(255,255,255,0.02)_31px_32px)]" />
      <div className="relative grid grid-cols-2 gap-3 pb-6 md:grid-cols-4">
        {GUI_COLUMNS.map((col) => (
          <div
            key={col.title}
            className="overflow-hidden rounded-lg border border-white/10 bg-[#12121a]/95"
          >
            <div className="flex items-center justify-between bg-primary px-3 py-2 text-[11px] font-bold text-white">
              {col.title}
              <span className="opacity-70">–</span>
            </div>
            <ul>
              {col.modules.map((m) => (
                <li
                  key={m.name}
                  className="flex items-center justify-between border-t border-white/5 px-3 py-1.5"
                >
                  <span className={m.on ? "text-[#22c55e]" : "text-[#9ca3af]"}>{m.name}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${m.on ? "bg-[#22c55e]" : "bg-white/15"}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const ARRAY_LIST = ["Auto Totem", "Anchor Macro", "Fullbright", "Tracers", "Sprint", "ESP"];

export function HudMockup() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14] font-mono text-[10px] sm:text-xs">
      {/* angedeutete Spielwelt */}
      <div className="absolute inset-0 [background:linear-gradient(180deg,#132036_0%,#0f1a2b_55%,#0c1410_55%,#0a0f0c_100%)]" />
      <div className="absolute inset-x-0 top-[55%] h-px bg-white/5" />
      {/* Watermark */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span className="font-bold text-white">
          T1mg10h<span className="text-primary"> V1</span>
        </span>
      </div>
      {/* ArrayList */}
      <ul className="absolute right-0 top-3 text-right">
        {[...ARRAY_LIST]
          .sort((a, b) => b.length - a.length)
          .map((m) => (
            <li
              key={m}
              className="mb-px border-r-2 border-primary bg-black/50 px-2 py-0.5 text-[#22c55e]"
            >
              {m}
            </li>
          ))}
      </ul>
      {/* Infos unten links */}
      <div className="absolute bottom-3 left-3 space-y-0.5 text-white/90">
        <div>
          FPS: <span className="text-[#22c55e]">240</span>
        </div>
        <div>
          XYZ: <span className="text-[#9ca3af]">123 / 64 / -456</span>
        </div>
      </div>
      {/* Fadenkreuz */}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
      </div>
      {/* Hotbar */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`h-5 w-5 border sm:h-7 sm:w-7 ${i === 0 ? "border-white bg-white/10" : "border-white/20 bg-black/40"}`}
          />
        ))}
      </div>
      <div className="absolute bottom-3 right-3">
        <PlaceholderTag />
      </div>
    </div>
  );
}
