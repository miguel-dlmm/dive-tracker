import React, { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { NAVY, TEAL, DISPLAY_FONT } from "./App";
import { inputCls, formatMoney, Select, colorFor, StatusSwitch, oppositeStatus } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / worklog: { rows: [...], updateRow, bulkUpdateWhere }
// No hay alta aquí — Pagos solo cambia el estado (único campo editable).
export default function PaymentsTab({ activities, paymentStatuses, currencies, rates, worklog }) {
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: "", status: "" });

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const rateFor = (sch, activity) => rates.rows.find((r) => r.school === sch && r.activity === activity);
  const totalFor = (e) => {
    const r = rateFor(e.school, e.activity);
    if (!r) return 0;
    return r.payment_type === "Per Person" ? r.rate * e.people : r.rate;
  };

  const presentValues = (key) => [...new Set(worklog.rows.map((r) => r[key]).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    let list = worklog.rows;
    if (filters.from) list = list.filter((e) => e.date >= filters.from);
    if (filters.to) list = list.filter((e) => e.date <= filters.to);
    if (filters.school) list = list.filter((e) => e.school === filters.school);
    if (filters.activity) list = list.filter((e) => e.activity === filters.activity);
    if (filters.status) list = list.filter((e) => e.status === filters.status);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [worklog.rows, filters]);

  const toggleSingle = async (e) => {
    await worklog.updateRow(e.id, { status: oppositeStatus(e.status, paymentStatuses.rows) });
  };

  const distinctStatuses = new Set(filtered.map((e) => e.status));
  const invertDisabled = filtered.length === 0 || distinctStatuses.size > 1;
  const invertTarget = distinctStatuses.size === 1 ? oppositeStatus([...distinctStatuses][0], paymentStatuses.rows) : null;

  const invertAllFiltered = async () => {
    if (invertDisabled) return;
    const ids = new Set(filtered.map((e) => e.id));
    await worklog.bulkUpdateWhere((e) => ids.has(e.id), { status: invertTarget });
  };

  const hasFilters = filters.from || filters.to || filters.school || filters.activity || filters.status;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-bold" style={{ fontFamily: DISPLAY_FONT, color: NAVY }}>{filtered.length} pagos</h3>
          {hasFilters && (
            <button onClick={() => setFilters({ from: "", to: "", school: "", activity: "", status: "" })} className="text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-gray-500">Desde</span>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={`${inputCls} py-1.5`} />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-gray-500">Hasta</span>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={`${inputCls} py-1.5`} />
          </label>
          <div className="w-28"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Escuela" /></div>
          <div className="w-28"><Select value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Actividad" /></div>
          <div className="w-28"><Select value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={presentValues("status")} placeholder="Estado" /></div>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin registros con estos filtros.</p>}
          {filtered.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="w-20 shrink-0 text-xs text-gray-400">{e.date}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium" style={{ color: activityColor(e.activity) }}>{e.activity}</div>
                <div className="text-xs text-gray-400">{e.school}</div>
              </div>
              <div className="shrink-0 text-right font-semibold" style={{ color: NAVY }}>{formatMoney(totalFor(e), e.currency, currencies.rows)}</div>
              <StatusSwitch value={e.status} onChange={() => toggleSingle(e)} paymentStatusRows={paymentStatuses.rows} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <span className="text-xs text-gray-500">
          {filtered.length === 0
            ? "No hay pagos filtrados."
            : distinctStatuses.size > 1
            ? "Estados distintos en la selección — filtra por estado para invertir."
            : `Los ${filtered.length} pagos filtrados pasarán a "${invertTarget}".`}
        </span>
        <button
          onClick={invertAllFiltered}
          disabled={invertDisabled}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: invertDisabled ? "#9CA3AF" : TEAL }}
        >
          <RefreshCw size={13} /> Invertir todos
        </button>
      </div>
    </div>
  );
}
