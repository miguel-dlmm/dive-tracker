import React, { useMemo, useState } from "react";
import { HandCoins, RotateCcw, SlidersHorizontal, ChevronDown, PartyPopper, Check } from "lucide-react";
import { NAVY, TEAL, SUN } from "./App";
import {
  Money, MoneyLine, Select, MultiSelect, DatePicker, Field, colorFor, EntryTitle,
  isPendingStatus, oppositeStatus, useToast,
} from "./shared";
import { buildIncomeEntries } from "./rateCalc";

// "Cobrado recientemente" se limita a los últimos 10 — no es un histórico.
// Ver más allá de eso es exactamente para lo que ya existen los filtros de
// fecha (ver docs/ADR/0004-home-dashboard-operativo-instructor.md).
const RECENT_PAID_LIMIT = 10;

const SOURCE_OPTIONS = ["Registro", "Comisiones", "Compañeros"];
const SOURCE_KEY = { Registro: "ganado", Comisiones: "comision", Compañeros: "companeros" };
const SOURCE_LABEL = { comision: "Comisión", companeros: "Compañero" };

function PaymentRowTitle({ entry, schoolColor, activityColor }) {
  if (entry._source === "companeros") {
    return (
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="truncate font-medium text-gray-800">{entry.colleague_name}</span>
        <span className="shrink-0 text-gray-400">· {entry.school}</span>
      </div>
    );
  }
  return <EntryTitle school={entry.school} activity={entry.activity} schoolColor={schoolColor(entry.school)} activityColor={activityColor(entry.activity)} />;
}

function PaymentRow({ entry, schoolColor, activityColor, currencyRows, isPending, justCollected, onToggle }) {
  return (
    <div className={`px-4 py-3 text-sm transition-colors ${justCollected ? "bg-teal-50/70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <PaymentRowTitle entry={entry} schoolColor={schoolColor} activityColor={activityColor} />
        <Money amount={entry.total} code={entry.currency} currencyRows={currencyRows} className="shrink-0 font-semibold" style={{ color: NAVY }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 pl-3.5">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-gray-400">
          <span className="truncate">
            {entry.date}{SOURCE_LABEL[entry._source] ? ` · ${SOURCE_LABEL[entry._source]}` : ""}
          </span>
          {justCollected && (
            <span className="flex shrink-0 items-center gap-0.5 font-medium" style={{ color: TEAL }}>
              <Check size={11} aria-hidden="true" /> Recién cobrado
            </span>
          )}
        </span>
        <button
          onClick={onToggle}
          className={`flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors ${isPending ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
          style={isPending ? { backgroundColor: TEAL } : {}}
        >
          {isPending ? (
            <><HandCoins size={14} aria-hidden="true" /> Cobrar</>
          ) : (
            <><RotateCcw size={13} aria-hidden="true" /> Deshacer</>
          )}
        </button>
      </div>
    </div>
  );
}

// schools / activities / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], updateRow, bulkUpdateWhere }
// Cubre las 3 fuentes de dinero (Registro, Comisiones, Compañeros) en una
// sola experiencia — ver docs/ADR/0004-home-dashboard-operativo-instructor.md.
export default function PaymentsTab({ schools, activities, paymentStatuses, currencies, rates, commissionRates, worklog, comisiones, colleaguePayments }) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");

  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  const [sourceFilter, setSourceFilter] = useState(""); // "" = todas las fuentes
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: [] });
  const [paidOpen, setPaidOpen] = useState(false);
  // Pagos marcados como cobrados en esta visita a la pantalla — para que el
  // usuario vea adónde ha ido lo que acaba de tocar sin tener que buscarlo
  // (se abre el grupo solo, y quedan arriba del todo, resaltados). No hace
  // falta limpiarlo con un temporizador: al salir de la pantalla se pierde
  // solo, y mientras tanto no hace daño seguir viéndolo destacado.
  const [justCollectedKeys, setJustCollectedKeys] = useState(() => new Set());

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

  const pending = useMemo(
    () => filteredEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => a.date.localeCompare(b.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  // Los recién cobrados en esta visita van primero, sea cual sea su fecha
  // — es donde el usuario espera encontrarlos justo después de tocar
  // "Cobrar" (ver docs/ADR/0004, adenda "confirmación de cobro").
  const paid = useMemo(() => {
    const list = filteredEntries.filter((e) => !isPendingStatus(e.status, paymentStatuses.rows));
    return [...list].sort((a, b) => {
      const aJust = justCollectedKeys.has(`${a._source}-${a.id}`);
      const bJust = justCollectedKeys.has(`${b._source}-${b.id}`);
      if (aJust !== bJust) return aJust ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
  }, [filteredEntries, paymentStatuses.rows, justCollectedKeys]);
  const paidRecent = paid.slice(0, RECENT_PAID_LIMIT);

  const pendingTotals = useMemo(() => {
    const map = {};
    pending.forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [pending]);

  const tableFor = (source) => (source === "ganado" ? worklog : source === "comision" ? comisiones : colleaguePayments);

  const toggleStatus = async (entry) => {
    const target = oppositeStatus(entry.status, paymentStatuses.rows);
    const key = `${entry._source}-${entry.id}`;
    try {
      await tableFor(entry._source).updateRow(entry.id, { status: target });
      if (isPendingStatus(target, paymentStatuses.rows)) {
        toast?.success("Pago marcado como pendiente");
      } else {
        // Cobrado: abrir el grupo y resaltar el pago para que el usuario
        // vea adónde ha ido, sin tener que buscarlo ni hacer scroll.
        setJustCollectedKeys((prev) => new Set(prev).add(key));
        setPaidOpen(true);
        toast?.success("Pago marcado como cobrado");
      }
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

  // Todo lo "pendiente" comparte el mismo estado por construcción
  // (isPendingStatus se basa en is_default, y solo puede haber un estado
  // is_default a la vez) — no hace falta comprobar estados distintos antes
  // de invertir en bloque. Esta acción solo existe para cobrar en bloque
  // (el botón no se ofrece sobre el grupo Cobrado), así que siempre va en
  // esa dirección — no hace falta una rama para "marcar todos pendientes".
  const collectAllPending = async () => {
    if (pending.length === 0) return;
    const targetStatus = oppositeStatus(pending[0].status, paymentStatuses.rows);
    const bySource = { ganado: [], comision: [], companeros: [] };
    pending.forEach((e) => bySource[e._source].push(e.id));
    try {
      let count = 0;
      const movedKeys = [];
      for (const [source, ids] of Object.entries(bySource)) {
        if (ids.length === 0) continue;
        count += await tableFor(source).bulkUpdateWhere((e) => ids.includes(e.id), { status: targetStatus });
        ids.forEach((id) => movedKeys.push(`${source}-${id}`));
      }
      setJustCollectedKeys((prev) => { const next = new Set(prev); movedKeys.forEach((k) => next.add(k)); return next; });
      setPaidOpen(true);
      toast?.success(`${count} ${count === 1 ? "pago cobrado" : "pagos cobrados"}`);
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
          {pending.length === 0 ? "Nada pendiente" : `${pending.length} ${pending.length === 1 ? "pago" : "pagos"}`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-44">
          <Select value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} placeholder="Todas las fuentes" />
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="flex min-h-11 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-600"
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Pendiente</h3>
          {pending.length > 0 && (
            <button onClick={collectAllPending} className="text-xs font-semibold" style={{ color: TEAL }}>
              Cobrar todos
            </button>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <PartyPopper size={26} className="text-gray-300" aria-hidden="true" />
            <p className="text-sm text-gray-400">
              {hasActiveFilters ? "Sin pagos pendientes con estos filtros." : "Estás al día — nada pendiente de cobrar."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pending.map((e) => (
              <PaymentRow key={`${e._source}-${e.id}`} entry={e} schoolColor={schoolColor} activityColor={activityColor} currencyRows={currencies.rows} isPending onToggle={() => toggleStatus(e)} />
            ))}
          </div>
        )}
      </div>

      {paidRecent.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <button onClick={() => setPaidOpen((o) => !o)} aria-expanded={paidOpen} className="flex w-full items-center justify-between px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Cobrado recientemente</h3>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${paidOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {paidOpen && (
            <div className="divide-y divide-gray-100">
              {paidRecent.map((e) => (
                <PaymentRow
                  key={`${e._source}-${e.id}`} entry={e} schoolColor={schoolColor} activityColor={activityColor} currencyRows={currencies.rows}
                  isPending={false} justCollected={justCollectedKeys.has(`${e._source}-${e.id}`)} onToggle={() => toggleStatus(e)}
                />
              ))}
              {paid.length > paidRecent.length && (
                <p className="px-4 py-3 text-center text-xs text-gray-400">
                  Mostrando los {RECENT_PAID_LIMIT} más recientes de {paid.length} — usa "Filtrar" para ver un periodo concreto.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
