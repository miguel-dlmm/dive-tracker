import React, { useState } from "react";
import { Waves, Home as HomeIcon, ListChecks, BarChart3, Loader2, Handshake, Users } from "lucide-react";
import { useSupabaseTable } from "./useSupabaseTable";
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
// casi blanco, tinta oscura para texto. Los colores de Registro y
// Comisiones NO están aquí — vienen de la tabla nav_sections.
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

// Barra inferior: los 5 destinos que se usan a diario. Pagos, Tarifas y
// Configuración ya no viven en un menú aparte — son accesos rápidos
// dentro de Home, más "de app" que un overflow escondido.
const PRIMARY_TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "log", label: "Registro", icon: ListChecks },
  { id: "comisiones", label: "Comisiones", icon: Handshake },
  { id: "colegas", label: "Compañeros", icon: Users },
  { id: "summary", label: "Resumen", icon: BarChart3 },
];

export default function App() {
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

  const [tab, setTab] = useState("home");

  const loaded = schools.loaded && activities.loaded && paymentTypes.loaded && paymentStatuses.loaded
    && currencies.loaded && rates.loaded && commissionRates.loaded && worklog.loaded
    && comisiones.loaded && colleaguePayments.loaded && navSections.loaded;

  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  // Pagos/Tarifas/Configuración son accesos secundarios (desde Home) —
  // si estás en alguno, la barra inferior no resalta ninguno de sus 5 items.
  const bottomTabActive = PRIMARY_TABS.some((t) => t.id === tab) ? tab : null;

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <Loader2 className="animate-spin" style={{ color: TEAL }} size={26} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-5 py-4">
          <Waves size={20} style={{ color: TEAL }} strokeWidth={2.2} />
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight" style={{ color: NAVY }}>Ocean Pulse</h1>
            <p className="text-[10.5px] font-medium text-gray-400">by Ocean Flow</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-5">
        {tab === "home" && <HomeTab worklog={worklog} rates={rates} activities={activities} schools={schools} currencies={currencies} navSections={navSections} onNavigate={setTab} />}
        {tab === "log" && <WorkLogTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} accentColor={sectionColor("log")} />}
        {tab === "comisiones" && <ComisionesTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} commissionRates={commissionRates} comisiones={comisiones} accentColor={sectionColor("comisiones")} />}
        {tab === "payments" && <PaymentsTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} />}
        {tab === "colegas" && <CompanerosTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} colleaguePayments={colleaguePayments} />}
        {tab === "rates" && <RatesTab schools={schools} activities={activities} paymentTypes={paymentTypes} currencies={currencies} rates={rates} commissionRates={commissionRates} />}
        {tab === "config" && <ConfigTab schools={schools} activities={activities} currencies={currencies} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} navSections={navSections} />}
        {tab === "summary" && <SummaryTab worklog={worklog} rates={rates} comisiones={comisiones} commissionRates={commissionRates} activities={activities} schools={schools} currencies={currencies} colleaguePayments={colleaguePayments} />}
      </main>

      {/* Barra inferior — 5 destinos de uso diario */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1">
          {PRIMARY_TABS.map((t) => {
            const Icon = t.icon;
            const active = bottomTabActive === t.id;
            const c = ["log", "comisiones"].includes(t.id) ? sectionColor(t.id) : TEAL;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-2.5 transition-colors"
                style={{ color: active ? c : "#9CA3AF" }}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10.5px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
