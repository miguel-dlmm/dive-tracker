import React, { useState } from "react";
import { Waves, Home as HomeIcon, ListChecks, BarChart3, Handshake, Users, ArrowLeft } from "lucide-react";
import { useSupabaseTable } from "./useSupabaseTable";
import { ToastProvider, AppLoading } from "./shared";
import HomeTab from "./HomeTab";
import WorkLogTab from "./WorkLogTab";
import ComisionesTab from "./ComisionesTab";
import RatesTab from "./RatesTab";
import ConfigTab from "./ConfigTab";
import PaymentsTab from "./PaymentsTab";
import CompanerosTab from "./CompanerosTab";
import SummaryTab from "./SummaryTab";

// ---------------------------------------------------------------
// Paleta — profesional y contenida: un único acento neutro, fondo
// casi blanco, tinta oscura para texto. Los colores de cada sección
// (Registro, Comisiones, Compañeros, Pagos, Tarifas, Configuración,
// Home) NO están aquí — vienen de la tabla nav_sections.
// ---------------------------------------------------------------
export const NAVY = "#0F172A";
export const TEAL = "#0F766E";
export const AQUA = "#0D9488";
export const CORAL = "#C2542F";
export const GREEN = "#15803D";
export const SUN = "#B45309";
export const BG = "#F7F8F8";

export const DISPLAY_FONT = "'Inter', sans-serif";
export const BODY_FONT = "'Inter', sans-serif";

// Barra inferior: los 5 destinos que se usan a diario.
const PRIMARY_TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "log", label: "Registro", icon: ListChecks },
  { id: "comisiones", label: "Comisiones", icon: Handshake },
  { id: "colegas", label: "Compañeros", icon: Users },
  { id: "summary", label: "Resumen", icon: BarChart3 },
];

// Pagos/Tarifas/Configuración son accesos secundarios (desde Home). Al
// entrar en uno, la barra inferior no resalta nada — en su lugar, la
// cabecera muestra "‹ Volver" + el nombre de la pantalla, el patrón
// nativo de iOS/Android para "dónde estoy y cómo vuelvo", más propio de
// app que una miga de pan (que es un patrón más de web de escritorio).
const SECONDARY_TITLES = { payments: "Pagos", rates: "Tarifas", config: "Configuración" };

function AppShell() {
  const schools = useSupabaseTable("schools", "name");
  const activities = useSupabaseTable("activities", "name");
  const paymentTypes = useSupabaseTable("payment_types", "name");
  const paymentStatuses = useSupabaseTable("payment_statuses", "name");
  const currencies = useSupabaseTable("currencies", "name", "code");
  const rates = useSupabaseTable("rates", "school");
  const commissionRates = useSupabaseTable("commission_rates", "school");
  const worklog = useSupabaseTable("worklog", "date");
  const comisiones = useSupabaseTable("comisiones", "date");
  const colleaguePayments = useSupabaseTable("colleague_payments", "date");
  const navSections = useSupabaseTable("nav_sections", "key", "key");
  const appSettings = useSupabaseTable("app_settings", "id", "id");

  const [tab, setTab] = useState("home");
  // Al venir de un acceso rápido de Home, además de cambiar de pestaña,
  // esa pestaña abre su hoja de creación sola. Se limpia en cuanto se usa
  // (ver onAutoOpened), así no se vuelve a disparar si luego navegas
  // manualmente a la misma pestaña.
  const [pendingOpen, setPendingOpen] = useState(null);
  const navigateAndCreate = (tabId) => { setTab(tabId); setPendingOpen(tabId); };

  const loaded = schools.loaded && activities.loaded && paymentTypes.loaded && paymentStatuses.loaded
    && currencies.loaded && rates.loaded && commissionRates.loaded && worklog.loaded
    && comisiones.loaded && colleaguePayments.loaded && navSections.loaded && appSettings.loaded;

  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  const bottomTabActive = PRIMARY_TABS.some((t) => t.id === tab) ? tab : null;
  const isSecondary = tab in SECONDARY_TITLES;
  const logoIcon = appSettings.rows[0]?.logo_icon || "Waves";

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <AppLoading iconName={logoIcon} color={TEAL} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-5 py-4">
          {isSecondary ? (
            <button onClick={() => setTab("home")} className="-m-2 flex min-h-11 items-center gap-2 p-2" aria-label="Volver a Home">
              <ArrowLeft size={20} style={{ color: NAVY }} aria-hidden="true" />
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: sectionColor(tab) }}>{SECONDARY_TITLES[tab]}</h1>
            </button>
          ) : (
            <button onClick={() => setTab("home")} className="-m-2 flex min-h-11 items-center gap-2.5 p-2" aria-label="Ir a Home">
              <Waves size={20} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
              <div className="leading-tight text-left">
                <h1 className="text-[15px] font-bold tracking-tight" style={{ color: NAVY }}>Ocean Pulse</h1>
                <p className="text-[10.5px] font-medium text-gray-400">by Ocean Flow</p>
              </div>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-5">
        {tab === "home" && <HomeTab worklog={worklog} rates={rates} activities={activities} schools={schools} currencies={currencies} navSections={navSections} onNavigate={setTab} onQuickCreate={navigateAndCreate} />}
        {tab === "log" && (
          <WorkLogTab
            schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog}
            accentColor={sectionColor("log")}
            autoOpenSheet={pendingOpen === "log"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "comisiones" && (
          <ComisionesTab
            schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} commissionRates={commissionRates} comisiones={comisiones}
            accentColor={sectionColor("comisiones")}
            autoOpenSheet={pendingOpen === "comisiones"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "payments" && <PaymentsTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} />}
        {tab === "colegas" && (
          <CompanerosTab
            schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} colleaguePayments={colleaguePayments}
            accentColor={sectionColor("colegas")}
            autoOpenSheet={pendingOpen === "colegas"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "rates" && (
          <RatesTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} currencies={currencies} rates={rates} commissionRates={commissionRates}
            accentColor={sectionColor("rates")}
            autoOpenSheet={pendingOpen === "rates"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "config" && <ConfigTab schools={schools} activities={activities} currencies={currencies} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} navSections={navSections} appSettings={appSettings} />}
        {tab === "summary" && <SummaryTab worklog={worklog} rates={rates} comisiones={comisiones} commissionRates={commissionRates} activities={activities} schools={schools} currencies={currencies} colleaguePayments={colleaguePayments} />}
      </main>

      {/* Barra inferior — 5 destinos de uso diario.
          translateZ(0) fuerza una capa de composición propia en iOS Safari:
          evita el parpadeo/"desaparece un instante" que puede darse en
          elementos fixed cuando la barra de direcciones se oculta al hacer
          scroll. */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", transform: "translateZ(0)" }}
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1">
          {PRIMARY_TABS.map((t) => {
            const Icon = t.icon;
            const active = bottomTabActive === t.id;
            const c = sectionColor(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 transition-colors"
                style={{ color: active ? c : "#9CA3AF" }}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span className="text-[10.5px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
