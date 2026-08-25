import React, { useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { Money, Select, MultiSelect, Field, colorFor, StatusSwitch, oppositeStatus, DatePicker, EntryTitle, useToast } from "./shared";

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / worklog: { rows: [...], updateRow, bulkUpdateWhere }
// No hay alta aquí — Pagos solo cambia el estado (único campo editable).
export default function PaymentsTab({ schools, activities, paymentStatuses, currencies, rates, worklog }) {
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: [], status: "" });

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");
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
    if (filters.activity && filters.activity.length > 0) list = list.filter((e) => filters.activity.includes(e.activity));
    if (filters.status) list = list.filter((e) => e.status === filters.status);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [worklog.rows, filters]);

  const toast = useToast();

  const toggleSingle = async (e) => {
    try {
      await worklog.updateRow(e.id, { status: oppositeStatus(e.status, paymentStatuses.rows) });
    } catch {
      toast?.error("No se pudo cambiar el estado. Inténtalo de nuevo.");
    }
  };

  const distinctStatuses = new Set(filtered.map((e) => e.status));
  const invertDisabled = filtered.length === 0 || distinctStatuses.size > 1;
  const invertTarget = distinctStatuses.size === 1 ? oppositeStatus([...distinctStatuses][0], paymentStatuses.rows) : null;

  const invertAllFiltered = async () => {
    if (invertDisabled) return;
    const ids = new Set(filtered.map((e) => e.id));
    try {
      const count = await worklog.bulkUpdateWhere((e) => ids.has(e.id), { status: invertTarget });
      toast?.success(`${count} pagos actualizados a "${invertTarget}"`);
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

  const hasFilters = filters.from || filters.to || filters.school || (filters.activity && filters.activity.length > 0) || filters.status;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>{filtered.length} pagos</h3>
          {hasFilters && (
            <button onClick={() => setFilters({ from: "", to: "", school: "", activity: [], status: "" })} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-y border-gray-100 bg-gray-50/60 px-4 py-3 sm:grid-cols-5">
          <Field label="Desde">
            <DatePicker value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} placeholder="Sin límite" />
          </Field>
          <Field label="Hasta">
            <DatePicker value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} placeholder="Sin límite" />
          </Field>
          <Field label="Escuela">
            <Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" />
          </Field>
          <Field label="Actividad">
            <MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Todas" />
          </Field>
          <Field label="Estado">
            <Select value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={presentValues("status")} placeholder="Todos" />
          </Field>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin registros con estos filtros.</p>}
          {filtered.map((e) => (
            <div key={e.id} className="px-4 py-3 text-sm">
              <EntryTitle school={e.school} activity={e.activity} schoolColor={schoolColor(e.school)} activityColor={activityColor(e.activity)} />
              <div className="mt-2 truncate pl-3.5 text-xs text-gray-400">{e.date}</div>
              <div className="mt-2 flex items-center justify-end gap-2.5">
                <Money amount={totalFor(e)} code={rateFor(e.school, e.activity)?.currency} currencyRows={currencies.rows} className="font-semibold" style={{ color: NAVY }} />
                <StatusSwitch value={e.status} onChange={() => toggleSingle(e)} paymentStatusRows={paymentStatuses.rows} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
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
