import React, { useMemo } from "react";
import { Wallet, Settings2, Handshake, ListChecks, Users } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { Money, MonthCalendar, colorFor } from "./shared";

const SHORTCUTS = [
  { id: "payments", label: "Pagos", icon: Wallet },
  { id: "rates", label: "Tarifas", icon: Settings2 },
];

// worklog / rates / activities / schools / currencies / navSections: hooks de useSupabaseTable
// onNavigate: (tabId) => cambia de pestaña — se pasa setTab desde App.jsx
// onQuickCreate: (tabId) => cambia de pestaña y abre su hoja de creación sola
export default function HomeTab({ worklog, rates, activities, schools, currencies, navSections, onNavigate, onQuickCreate }) {
  const now = new Date();
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;

  const rateFor = (school, activity) => rates.rows.find((r) => r.school === school && r.activity === activity);
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";

  const withTotals = useMemo(() => worklog.rows.map((e) => {
    const r = rateFor(e.school, e.activity);
    const total = r ? (r.payment_type === "Per Person" ? r.rate * e.people : r.rate) : 0;
    return { ...e, total, currency: r?.currency || e.currency || fallbackCurrency };
  }), [worklog.rows, rates.rows, fallbackCurrency]);

  const monthEntries = useMemo(() => withTotals.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }), [withTotals]);

  const monthTotals = useMemo(() => {
    const map = {};
    monthEntries.forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [monthEntries]);

  return (
    <div className="space-y-4">
      {/* Accesos directos de creación */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onQuickCreate("log")} className="flex items-center justify-between rounded-lg p-4 text-white transition-transform active:scale-[0.98]" style={{ backgroundColor: sectionColor("log") }}>
          <div className="text-left">
            <div className="text-xs opacity-80">Registro</div>
            <div className="text-sm font-semibold">+ Nuevo</div>
          </div>
          <ListChecks size={20} />
        </button>
        <button onClick={() => onQuickCreate("comisiones")} className="flex items-center justify-between rounded-lg p-4 text-white transition-transform active:scale-[0.98]" style={{ backgroundColor: sectionColor("comisiones") }}>
          <div className="text-left">
            <div className="text-xs opacity-80">Comisiones</div>
            <div className="text-sm font-semibold">+ Nueva</div>
          </div>
          <Handshake size={20} />
        </button>
      </div>

      {/* KPI del mes */}
      <div className="rounded-lg p-4 text-white" style={{ backgroundColor: TEAL }}>
        <div className="text-xs font-medium opacity-80">Ganado este mes</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">
          {Object.keys(monthTotals).length === 0 ? (
            "—"
          ) : (
            Object.entries(monthTotals).map(([code, amt], i) => (
              <span key={code}>{i > 0 && " + "}<Money amount={amt} code={code} currencyRows={currencies.rows} /></span>
            ))
          )}
        </div>
      </div>

      <MonthCalendar
        year={now.getFullYear()}
        month={now.getMonth()}
        entries={monthEntries}
        dotColor={TEAL}
        currencyRows={currencies.rows}
        activityColor={activityColor}
      />

      {/* Accesos rápidos a lo menos frecuente */}
      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Accesos rápidos</h2>
        <div className="grid grid-cols-3 gap-2">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
              >
                <Icon size={20} style={{ color: NAVY }} />
                <span className="text-xs font-medium text-gray-700">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
