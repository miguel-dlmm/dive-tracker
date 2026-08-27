import React, { useState } from "react";
import { Home as HomeIcon, ListChecks, Handshake, Users2, Settings, Wallet, Menu as MenuIcon, X } from "lucide-react";
import { DESIGNS, getDesign } from "./designTokens";
import { MockHomeScreen, MockWorkLogScreen, MockComisionesScreen, MockPaymentsScreen, MockConfigScreen } from "./screens";

// Shell navegable del laboratorio. Todo el estado (diseño activo, pantalla
// activa) es local a este componente — no toca localStorage, no toca
// contexto de la app real, no persiste entre aperturas. Cerrar el overlay
// (ver DesignLabOverlay) descarta este árbol entero.

const SCREEN_META = {
  home: { label: "Home", icon: HomeIcon, render: MockHomeScreen },
  worklog: { label: "Registro", icon: ListChecks, render: MockWorkLogScreen },
  comisiones: { label: "Comisiones", icon: Handshake, render: MockComisionesScreen },
  pagos: { label: "Pagos", icon: Users2, render: MockPaymentsScreen },
  config: { label: "Configuración", icon: Settings, render: MockConfigScreen },
};

// Destinos de la barra inferior por arquitectura de navegación. "4tab"
// (Diseño 4) agrupa comisiones+pagos bajo "Dinero" con un sub-selector
// propio; el resto usa las 5 pantallas mock 1:1.
const NAV_5TAB = ["home", "worklog", "comisiones", "pagos", "config"];
const NAV_4TAB = [
  { id: "home", label: "Home", icon: HomeIcon, screens: ["home"] },
  { id: "worklog", label: "Registro", icon: ListChecks, screens: ["worklog"] },
  { id: "dinero", label: "Dinero", icon: Wallet, screens: ["comisiones", "pagos"] },
  { id: "menu", label: "Menú", icon: MenuIcon, screens: ["config"] },
];

export default function DesignLabShell({ onClose }) {
  const [designId, setDesignId] = useState("current");
  const [screen, setScreen] = useState("home");
  const tokens = getDesign(designId);
  const ScreenComponent = SCREEN_META[screen].render;

  const activeNav4 = NAV_4TAB.find((n) => n.screens.includes(screen));

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "#111827" }}>
      {/* Barra de control del laboratorio — no forma parte de la maqueta,
          es la herramienta para comparar. Estilo neutro fijo, no usa tokens. */}
      <div className="shrink-0 border-b border-white/10 bg-[#111827] px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Laboratorio visual · superadmin</p>
            <p className="text-sm font-medium text-white">{tokens.label}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar laboratorio" className="-m-2 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-white/70 hover:text-white">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {DESIGNS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDesignId(d.id)}
              aria-pressed={designId === d.id}
              className="min-h-9 shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={designId === d.id ? { backgroundColor: "#fff", color: "#111827" } : { backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-white/40">{tokens.tagline} · profundidad: {tokens.depth}</p>
      </div>

      {/* Marco tipo teléfono — deja claro que se evalúa mobile-first. */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-[#111827] px-3 py-4">
        <div
          className="flex w-full max-w-sm flex-col overflow-hidden"
          style={{ borderRadius: "28px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "6px solid #1F2937", minHeight: "640px" }}
        >
          <div className="flex-1 overflow-y-auto px-4 pt-4" style={{ backgroundColor: tokens.bg, backgroundImage: tokens.homeStyle === "illustrative" ? "none" : tokens.bgImage }}>
            {tokens.nav === "4tab" && activeNav4?.id === "dinero" && (
              <div className="mb-3 flex gap-1 p-1" style={{ backgroundColor: tokens.surface, borderRadius: tokens.radius, border: `1px solid ${tokens.border}` }}>
                {["comisiones", "pagos"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScreen(s)}
                    className="min-h-9 flex-1 rounded-md text-xs font-medium"
                    style={screen === s ? { backgroundColor: tokens.accent, color: "#fff", borderRadius: tokens.radius } : { color: tokens.inkMuted }}
                  >
                    {SCREEN_META[s].label}
                  </button>
                ))}
              </div>
            )}
            <ScreenComponent tokens={tokens} />
          </div>

          {/* Barra inferior — visualiza la diferencia de arquitectura entre
              5 destinos (Diseños actual/1/2/3) y 4 destinos (Diseño 4). */}
          <nav
            className="flex shrink-0 items-stretch justify-around border-t px-1 py-1"
            style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            aria-label="Navegación simulada del laboratorio"
          >
            {tokens.nav === "4tab"
              ? NAV_4TAB.map((n) => {
                  const Icon = n.icon;
                  const active = activeNav4?.id === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setScreen(n.screens[0])}
                      aria-current={active ? "page" : undefined}
                      className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5"
                      style={{ color: active ? tokens.accent : tokens.inkMuted }}
                    >
                      <Icon size={18} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                      <span className="text-[10px] font-medium">{n.label}</span>
                    </button>
                  );
                })
              : NAV_5TAB.map((id) => {
                  const meta = SCREEN_META[id];
                  const Icon = meta.icon;
                  const active = screen === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setScreen(id)}
                      aria-current={active ? "page" : undefined}
                      className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5"
                      style={{ color: active ? tokens.accent : tokens.inkMuted }}
                    >
                      <Icon size={18} strokeWidth={active ? 2.3 : 1.8} aria-hidden="true" />
                      <span className="text-[10px] font-medium">{meta.label}</span>
                    </button>
                  );
                })}
          </nav>
        </div>
      </div>
    </div>
  );
}
