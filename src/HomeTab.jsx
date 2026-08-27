import React, { useMemo } from "react";
import { Handshake, ListChecks } from "lucide-react";
import { TEAL, SUN, AQUA } from "./App";
import { Money, MonthCalendar, colorFor, isPendingStatus } from "./shared";
import { computeRateTotal } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";

// worklog / rates / comisiones / commissionRates / colleaguePayments / activities /
// schools / currencies / navSections / paymentStatuses: hooks de useSupabaseTable
// onQuickCreate: (tabId) => cambia de pestaña y abre su hoja de creación sola
export default function HomeTab({ worklog, rates, comisiones, commissionRates, colleaguePayments, activities, schools, currencies, navSections, paymentStatuses, onQuickCreate }) {
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

  // ganado/comision/companeros: se mantienen separadas porque el calendario
  // de abajo necesita distinguir la fuente de cada apunte del día (incluye
  // pagos de compañeros en cualquier sentido, también los que tú pagas).
  const ganadoEntries = useMemo(() => worklog.rows.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" })), [worklog.rows, rates.rows, fallbackCurrency]);
  const comisionEntries = useMemo(() => comisiones.rows.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" })), [comisiones.rows, commissionRates.rows, fallbackCurrency]);
  const companerosEntries = useMemo(() => colleaguePayments.rows.map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" })), [colleaguePayments.rows]);

  const monthAllEntries = useMemo(() => [...ganadoEntries, ...comisionEntries, ...companerosEntries].filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }), [ganadoEntries, comisionEntries, companerosEntries]);

  // Base común de las dos métricas financieras del dashboard (ver
  // docs/ADR/0004-home-dashboard-operativo-instructor.md): dinero que
  // generas o te deben — Registro + Comisiones + pagos de compañeros que TE
  // pagan a ti. Los pagos de compañeros con importe negativo (tú le pagas a
  // alguien) quedan fuera de las dos: es un concepto distinto ("lo que
  // debo yo"), que hoy no tiene su propio KPI. "Generado este mes" y
  // "Pendiente de cobrar" parten de este mismo array — solo cambia el
  // filtro que le aplican, nunca la fuente de datos.
  const incomeEntries = useMemo(
    () => [...ganadoEntries, ...comisionEntries, ...companerosEntries.filter((p) => p.total > 0)],
    [ganadoEntries, comisionEntries, companerosEntries]
  );

  // "Generado este mes": filtro de fecha (mes actual), sin filtro de
  // estado — cuenta lo cobrado y lo pendiente por igual, porque ya lo has
  // generado aunque todavía no te lo hayan pagado.
  const monthTotals = useMemo(() => {
    const map = {};
    incomeEntries
      .filter((e) => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
      .forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [incomeEntries]);

  // "Pendiente de cobrar": sin filtro de fecha (una deuda de hace 2 meses
  // sigue siendo una deuda), solo estado pendiente.
  const pendingSummary = useMemo(() => {
    const pendingEntries = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows));
    const totals = {};
    pendingEntries.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.total; });
    return { totals, count: pendingEntries.length };
  }, [incomeEntries, paymentStatuses.rows]);

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

      {/* Pendiente de cobrar — información financiera principal (ADR-0004).
          onPress queda sin definir a propósito: no hay todavía pantalla de
          Pagos a la que navegar. */}
      <PendingCollectionCard
        totals={pendingSummary.totals}
        count={pendingSummary.count}
        currencyRows={currencies.rows}
        color={SUN}
      />

      {/* KPI del mes — información secundaria (ADR-0004). Se llama "Generado"
          y no "Ganado" porque desde este entregable cuenta las 3 fuentes
          (Registro + Comisiones + Compañeros que te pagan), no solo lo que
          impartes tú — "Ganado" ya no describe con precisión ese total. */}
      <div className="rounded-lg p-4 text-white" style={{ backgroundColor: TEAL }} data-testid="generated-this-month-card">
        <div className="text-xs font-medium opacity-80">Generado este mes</div>
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
