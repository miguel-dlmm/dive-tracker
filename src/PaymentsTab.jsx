import React, { useMemo, useState } from "react";
import { BadgeCheck, RotateCcw, SlidersHorizontal, PartyPopper } from "lucide-react";
import { NAVY, TEAL, SUN } from "./App";
import {
  Money, MoneyLine, Select, MultiSelect, DatePicker, Field, colorFor,
  isPendingStatus, oppositeStatus, useToast,
} from "./shared";
import { buildIncomeEntries } from "./rateCalc";

// "Cobrados" se limita a los últimos 10 — no es un histórico infinito. Ver
// más allá es para lo que ya existen los filtros de fecha (ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md).
const RECENT_PAID_LIMIT = 10;

const SOURCE_OPTIONS = ["Registro", "Comisiones", "Compañeros"];
const SOURCE_KEY = { Registro: "ganado", Comisiones: "comision", Compañeros: "companeros" };
const SOURCE_LABEL = { comision: "Comisión", companeros: "Compañero" };

// Sin marcador delante del texto — la identificación del elemento viene de
// la jerarquía tipográfica (peso, tamaño, color), no de un punto de color.
function PaymentRowTitle({ entry, activityColor }) {
  if (entry._source === "companeros") {
    return (
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight text-gray-900">{entry.colleague_name}</p>
        <p className="mt-0.5 truncate text-[11.5px] font-medium text-gray-400">{entry.school}</p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-[15px] font-semibold leading-tight" style={{ color: activityColor(entry.activity) }}>{entry.activity}</p>
      <p className="mt-0.5 truncate text-[11.5px] font-medium text-gray-400">{entry.school}</p>
    </div>
  );
}

function PaymentRow({ entry, activityColor, currencyRows, isPending, onToggle }) {
  return (
    <div className="px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <PaymentRowTitle entry={entry} activityColor={activityColor} />
        <Money amount={entry.total} code={entry.currency} currencyRows={currencyRows} className="shrink-0 font-semibold" style={{ color: NAVY }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-gray-400">
          {entry.date}{SOURCE_LABEL[entry._source] ? ` · ${SOURCE_LABEL[entry._source]}` : ""}
        </span>
        <button
          onClick={onToggle}
          className={`flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors ${isPending ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
          style={isPending ? { backgroundColor: TEAL } : {}}
        >
          {isPending ? (
            <><BadgeCheck size={14} aria-hidden="true" /> Confirmar cobro</>
          ) : (
            <><RotateCcw size={13} aria-hidden="true" /> Marcar pendiente</>
          )}
        </button>
      </div>
    </div>
  );
}

function emptyMessage(statusFilter, hasActiveFilters) {
  if (statusFilter === "pendientes") {
    return hasActiveFilters ? "Sin pagos pendientes con estos filtros." : "Estás al día — nada pendiente de cobrar.";
  }
  return hasActiveFilters ? "Sin pagos cobrados con estos filtros." : "Todavía no has marcado ningún pago como cobrado.";
}

// activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], updateRow, bulkUpdateWhere }
// Cubre las 3 fuentes de dinero (Registro, Comisiones, Compañeros) en una
// sola experiencia — ver docs/ADR/0004-home-dashboard-operativo-instructor.md.
export default function PaymentsTab({ activities, paymentStatuses, currencies, rates, commissionRates, worklog, comisiones, colleaguePayments }) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");

  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  const [statusFilter, setStatusFilter] = useState("pendientes"); // "pendientes" | "cobrados"
  const [sourceFilter, setSourceFilter] = useState(""); // "" = todas las fuentes
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: [] });

  const presentValues = (key) => [...new Set(incomeEntries.map((e) => e[key]).filter(Boolean))].sort();

  const hasActiveFilters = Boolean(sourceFilter || filters.from || filters.to || filters.school || filters.activity.length > 0);
  const clearFilters = () => { setSourceFilter(""); setFilters({ from: "", to: "", school: "", activity: [] }); };

  const filteredEntries = useMemo(() => {
    let list = incomeEntries;
    if (sourceFilter) list = list.filter((e) => e._source === SOURCE_KEY[sourceFilter]);
    if (filters.from) list = list.filter((e) => e.date >= filters.from);
    if (filters.to) list = list.filter((e) => e.date <= filters.to);
    if (filters.school) list = list.filter((e) => e.school === filters.school);
    if (filters.activity.length > 0) list = list.filter((e) => filters.activity.includes(e.activity));
    return list;
  }, [incomeEntries, sourceFilter, filters]);

  // Pendientes: nunca se recortan (lo que se debe, se debe ver entero) y se
  // ordenan de más antiguo a más reciente — lo más urgente primero.
  const pendingAll = useMemo(
    () => filteredEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => a.date.localeCompare(b.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  // Cobrados: sí se recortan a los RECENT_PAID_LIMIT más recientes.
  const paidAll = useMemo(
    () => filteredEntries.filter((e) => !isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => b.date.localeCompare(a.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  const paidCapped = paidAll.slice(0, RECENT_PAID_LIMIT);
  const showPaidCapHint = statusFilter === "cobrados" && paidAll.length > paidCapped.length;

  const visibleList = statusFilter === "pendientes" ? pendingAll : paidCapped;

  const pendingTotals = useMemo(() => {
    const map = {};
    pendingAll.forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [pendingAll]);

  const tableFor = (source) => (source === "ganado" ? worklog : source === "comision" ? comisiones : colleaguePayments);

  const toggleStatus = async (entry) => {
    const target = oppositeStatus(entry.status, paymentStatuses.rows);
    try {
      await tableFor(entry._source).updateRow(entry.id, { status: target });
      if (isPendingStatus(target, paymentStatuses.rows)) {
        toast?.success("Pago marcado como pendiente");
      } else if (statusFilter === "pendientes") {
        // Va a desaparecer de esta lista porque ya no cumple el filtro —
        // el toast deja claro qué ha pasado y cómo volver a verlo, para
        // que no parezca que se ha perdido.
        toast?.success('Pago marcado como cobrado — cámbialo a "Cobrados" para verlo');
      } else {
        toast?.success("Pago marcado como cobrado");
      }
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

  // Todo lo "pendiente" comparte el mismo estado por construcción
  // (isPendingStatus se basa en is_default, y solo puede haber un estado
  // is_default a la vez) — no hace falta comprobar estados distintos antes
  // de invertir en bloque. Esta acción solo cobra (nunca lo contrario), así
  // que no hace falta una rama para "marcar todos pendientes".
  const collectAllPending = async () => {
    if (pendingAll.length === 0) return;
    const targetStatus = oppositeStatus(pendingAll[0].status, paymentStatuses.rows);
    const bySource = { ganado: [], comision: [], companeros: [] };
    pendingAll.forEach((e) => bySource[e._source].push(e.id));
    try {
      let count = 0;
      for (const [source, ids] of Object.entries(bySource)) {
        if (ids.length === 0) continue;
        count += await tableFor(source).bulkUpdateWhere((e) => ids.includes(e.id), { status: targetStatus });
      }
      const msg = statusFilter === "pendientes"
        ? `${count} ${count === 1 ? "pago cobrado" : "pagos cobrados"} — cambia a "Cobrados" para verlos`
        : `${count} ${count === 1 ? "pago cobrado" : "pagos cobrados"}`;
      toast?.success(msg);
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="rounded-lg p-4 text-white" style={{ backgroundColor: SUN }}>
        <div className="text-xs font-medium opacity-80">Pendiente de cobrar</div>
        <div className="mt-1 text-2xl font-bold tabular-nums">
          {Object.keys(pendingTotals).length === 0 ? "—" : <MoneyLine totals={pendingTotals} currencyRows={currencies.rows} />}
        </div>
        <div className="mt-0.5 text-xs opacity-80">
          {pendingAll.length === 0 ? "Nada pendiente" : `${pendingAll.length} ${pendingAll.length === 1 ? "pago" : "pagos"}`}
        </div>
      </div>

      {/* Pendientes/Cobrados como pestañas de texto subrayadas, no una
          caja con borde tipo panel de ajustes — la pantalla es de acción
          diaria, no de configuración; el número en "Pendientes" refuerza
          de un vistazo la pregunta que responde la pantalla por defecto. */}
      <div className="flex items-center gap-5 border-b border-gray-200">
        {[["pendientes", `Pendientes${pendingAll.length > 0 ? ` · ${pendingAll.length}` : ""}`], ["cobrados", "Cobrados"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            aria-pressed={statusFilter === key}
            className="min-h-11 border-b-2 pb-2 text-[15px] font-semibold transition-colors"
            style={statusFilter === key ? { borderColor: TEAL, color: NAVY } : { borderColor: "transparent", color: "#9CA3AF" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-44">
          <Select value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} placeholder="Todas las fuentes" />
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${filtersOpen ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-600"}`}
          style={filtersOpen ? { backgroundColor: TEAL } : {}}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtrar
        </button>
      </div>

      {filtersOpen && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field label="Desde"><DatePicker value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} placeholder="Sin límite" /></Field>
            <Field label="Hasta"><DatePicker value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} placeholder="Sin límite" /></Field>
            <Field label="Escuela"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" /></Field>
            <Field label="Actividad"><MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Todas" /></Field>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {statusFilter === "pendientes" && pendingAll.length > 0 && (
        <div className="flex justify-end">
          <button onClick={collectAllPending} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
            Confirmar todos
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {visibleList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            {statusFilter === "pendientes" && !hasActiveFilters && <PartyPopper size={26} className="text-gray-300" aria-hidden="true" />}
            <p className="text-sm text-gray-400">{emptyMessage(statusFilter, hasActiveFilters)}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleList.map((e) => (
              <PaymentRow
                key={`${e._source}-${e.id}`} entry={e} activityColor={activityColor} currencyRows={currencies.rows}
                isPending={statusFilter === "pendientes"} onToggle={() => toggleStatus(e)}
              />
            ))}
            {showPaidCapHint && (
              <p className="px-4 py-3 text-center text-xs text-gray-400">
                Mostrando los {RECENT_PAID_LIMIT} cobrados más recientes de {paidAll.length} — usa "Filtrar" para ver un periodo concreto.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
