import React, { useMemo } from "react";
import { Handshake, ListChecks } from "lucide-react";
import { TEAL, SUN, AQUA } from "./App";
import { Money, MonthCalendar, colorFor } from "./shared";
import { computeRateTotal } from "./rateCalc";

// worklog / rates / comisiones / commissionRates / colleaguePayments / activities /
// schools / currencies / navSections: hooks de useSupabaseTable
// onQuickCreate: (tabId) => cambia de pestaña y abre su hoja de creación sola
export default function HomeTab({ worklog, rates, comisiones, commissionRates, colleaguePayments, activities, schools, currencies, navSections, onQuickCreate }) {
  const now = new Date();
  const SOURCE_META = {
    ganado: { label: "Ganado", color: TEAL },
    comision: { label: "Comisión", color: SUN },
    companeros: { label: "Compañeros", color: AQUA },
  };
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;

  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const rateTotal = (e, ratesTable) => {
    const r = ratesTable.rows.find((r) => r.school === e.school && r.activity === e.activity);
    return { total: computeRateTotal(r, e.people), currency: r?.currency || e.currency || fallbackCurrency };
  };

  // Ganado es el único que cuenta para el KPI del mes y el color de los
  // puntos del calendario (ver notas en CLAUDE.md); comisiones y pagos de
  // compañeros solo se suman para que, al pulsar un día, se vean TODAS sus
  // ocurrencias — no solo las de Registro.
  const ganadoEntries = useMemo(() => worklog.rows.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" })), [worklog.rows, rates.rows, fallbackCurrency]);
  const comisionEntries = useMemo(() => comisiones.rows.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" })), [comisiones.rows, commissionRates.rows, fallbackCurrency]);
  const companerosEntries = useMemo(() => colleaguePayments.rows.map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" })), [colleaguePayments.rows]);

  const monthEntries = useMemo(() => ganadoEntries.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }), [ganadoEntries]);

  const monthAllEntries = useMemo(() => [...ganadoEntries, ...comisionEntries, ...companerosEntries].filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }), [ganadoEntries, comisionEntries, companerosEntries]);

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
        entries={monthAllEntries}
        dotColor={TEAL}
        currencyRows={currencies.rows}
        activityColor={activityColor}
        autoSelectFirstDay
        detailed
        groupBySource
        sourceMeta={SOURCE_META}
      />
    </div>
  );
}
