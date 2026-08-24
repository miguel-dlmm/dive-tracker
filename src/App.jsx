import React, { useState } from "react";
import { Waves, ListChecks, Wallet, BarChart3, Loader2, Handshake, Menu, X, Settings2, SlidersHorizontal, Users } from "lucide-react";
import { useSupabaseTable } from "./useSupabaseTable";
import WorkLogTab from "./WorkLogTab";
import ComisionesTab from "./ComisionesTab";
import RatesTab from "./RatesTab";
import ConfigTab from "./ConfigTab";
import PaymentsTab from "./PaymentsTab";
import CompanerosTab from "./CompanerosTab";
import SummaryTab from "./SummaryTab";

// ---------------------------------------------------------------
// Paleta — profesional y contenida: un único acento (teal apagado),
// fondo neutro casi blanco, tinta oscura para texto. Coral/verde
// se quedan solo para semántica (negativo/positivo, estados), no
// como color decorativo de marca.
// ---------------------------------------------------------------
export const NAVY = "#0F172A";   // texto / tinta
export const TEAL = "#0F766E";   // marca / acción principal (apagado, no neón)
export const AQUA = "#0D9488";   // variante del acento, para el segundo KPI
export const CORAL = "#C2542F";  // contraste cálido, uso semántico
export const GREEN = "#15803D";  // positivo, uso semántico
export const SUN = "#B45309";
export const BG = "#F7F8F8";     // fondo neutro, casi blanco

export const DISPLAY_FONT = "'Inter', sans-serif";
export const BODY_FONT = "'Inter', sans-serif";

const PRIMARY_TABS = [
  { id: "log", label: "Registro", icon: ListChecks },
  { id: "comisiones", label: "Comisiones", icon: Handshake },
  { id: "payments", label: "Pagos", icon: Wallet },
  { id: "summary", label: "Resumen", icon: BarChart3 },
];
const MORE_TABS = [
  { id: "colegas", label: "Compañeros", icon: Users },
  { id: "rates", label: "Tarifas", icon: Settings2 },
  { id: "config", label: "Configuración", icon: SlidersHorizontal },
];
const ALL_TABS = [...PRIMARY_TABS, ...MORE_TABS];

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

  const [tab, setTab] = useState("log");
  const [moreOpen, setMoreOpen] = useState(false);
  const loaded = schools.loaded && activities.loaded && paymentTypes.loaded && paymentStatuses.loaded
    && currencies.loaded && rates.loaded && commissionRates.loaded && worklog.loaded
    && comisiones.loaded && colleaguePayments.loaded;

  const isMoreActive = MORE_TABS.some((t) => t.id === tab);

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
            <h1 className="text-[15px] font-bold tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: NAVY }}>DiveFlow</h1>
            <p className="text-[10.5px] font-medium text-gray-400">by Ocean Flow</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-5">
        {tab === "log" && <WorkLogTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} />}
        {tab === "comisiones" && <ComisionesTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} commissionRates={commissionRates} comisiones={comisiones} />}
        {tab === "payments" && <PaymentsTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} />}
        {tab === "colegas" && <CompanerosTab schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} colleaguePayments={colleaguePayments} />}
        {tab === "rates" && <RatesTab schools={schools} activities={activities} paymentTypes={paymentTypes} rates={rates} commissionRates={commissionRates} />}
        {tab === "config" && <ConfigTab schools={schools} activities={activities} currencies={currencies} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} />}
        {tab === "summary" && <SummaryTab worklog={worklog} rates={rates} activities={activities} schools={schools} currencies={currencies} colleaguePayments={colleaguePayments} />}
      </main>

      {/* Barra inferior — navegación mobile-first */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1">
          {PRIMARY_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 transition-colors"
                style={{ color: active ? TEAL : "#9CA3AF" }}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10.5px] font-medium">{t.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 transition-colors"
            style={{ color: isMoreActive ? TEAL : "#9CA3AF" }}
          >
            <Menu size={19} strokeWidth={isMoreActive ? 2.2 : 1.8} />
            <span className="text-[10.5px] font-medium">Más</span>
          </button>
        </div>
      </nav>

      {/* Hoja inferior "Más" */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={() => setMoreOpen(false)}>
          <div
            className="w-full max-w-3xl rounded-t-xl bg-white p-5 pb-8 shadow-xl"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ fontFamily: DISPLAY_FONT, color: NAVY }}>Más</h2>
              <button onClick={() => setMoreOpen(false)} className="text-gray-400"><X size={19} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {MORE_TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors"
                    style={active ? { backgroundColor: "#F0FDFA", borderColor: "#CCFBF1", color: TEAL } : { backgroundColor: "white", borderColor: "#E5E7EB", color: NAVY }}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
