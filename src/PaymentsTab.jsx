import { useMemo, useState } from "react";
import { ChevronDown, Check, PartyPopper } from "lucide-react";
import { NAVY, TEAL, SUN } from "./App";
import { Money, MoneyLine, DatePicker, Field, colorFor, isPendingStatus, oppositeStatus, useToast } from "./shared";
import { buildIncomeEntries } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";

const SOURCE_LABEL = { comision: "Comisión", companeros: "Ajuste" };

// Fila de detalle dentro de un grupo — solo lectura (crear/editar/borrar
// vive en "Mi trabajo", ver docs/ADR/0005-mi-trabajo-unificacion-economica.md).
function GroupDetailRow({ entry, activityColor, currencyRows }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <div className="min-w-0">
        <span className="truncate font-medium" style={{ color: activityColor(entry.activity) }}>{entry.activity}</span>
        <span className="ml-1.5 text-xs text-gray-400">
          {entry.date}{SOURCE_LABEL[entry._source] ? ` · ${SOURCE_LABEL[entry._source]}` : ""}
        </span>
      </div>
      <Money amount={entry.total} code={entry.currency} currencyRows={currencyRows} className="shrink-0 font-semibold" style={{ color: NAVY }} />
    </div>
  );
}

// Tarjeta de escuela — la unidad de trabajo de esta pantalla. "Cobrar todo"
// sí lleva peso visual (fondo sólido): a diferencia de Mi trabajo, aquí no
// hay un FAB con el que competir, y es la única acción de la pantalla.
// El punto de color hace doble función como checkbox de selección — mismo
// patrón que "tocar el avatar para seleccionar" de Gmail/Mail: no añade un
// elemento más a la fila, reutiliza uno que ya estaba.
function SchoolGroup({ school, entries, totals, expanded, selected, onToggleExpand, onToggleSelect, onCollect, activityColor, currencyRows, schoolColor }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button" onClick={onToggleSelect} aria-pressed={selected}
          aria-label={selected ? `Quitar ${school} de la selección` : `Seleccionar ${school}`}
          className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2"
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors"
            style={selected ? { backgroundColor: schoolColor } : { border: `2px solid ${schoolColor}` }}
          >
            {selected && <Check size={11} className="text-white" aria-hidden="true" />}
          </span>
        </button>
        <button type="button" onClick={onToggleExpand} aria-expanded={expanded} className="-my-1 flex min-h-11 min-w-0 flex-1 items-center gap-1.5 py-1 text-left">
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-gray-800">{school}</span>
            <span className="block text-xs text-gray-400">{entries.length} {entries.length === 1 ? "elemento" : "elementos"}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-sm font-bold tabular-nums" style={{ color: NAVY }}>
            <MoneyLine totals={totals} currencyRows={currencyRows} />
          </span>
          <button type="button" onClick={onCollect} className="min-h-8 rounded-md px-3 text-xs font-semibold text-white" style={{ backgroundColor: TEAL }}>
            Cobrar todo
          </button>
        </div>
      </div>
      {expanded && (
        <div className="divide-y divide-gray-100 border-t border-gray-100 px-4">
          {entries.map((e) => <GroupDetailRow key={`${e._source}-${e.id}`} entry={e} activityColor={activityColor} currencyRows={currencyRows} />)}
        </div>
      )}
    </div>
  );
}

// activities / schools / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], bulkUpdateWhere }
// Herramienta de LIQUIDACIÓN, no un listado más de la actividad diaria (eso
// ya lo cubre "Mi trabajo" con más detalle: crear/editar/borrar/filtrar por
// tipo). Pagos se especializa en cerrar cuentas por lotes agrupando por
// escuela — el eje real por el que un instructor cobra (no por periodo: el
// periodo sigue disponible como filtro, no como agrupación — un instructor
// no "cierra enero", cierra con una escuela concreta; y no por tipo: eso ya
// es el filtro de Mi trabajo). Solo ingresos (nunca ajustes negativos: no
// tiene sentido "cobrar" una deuda que tú debes) — ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md.
export default function PaymentsTab({ activities, schools, paymentStatuses, currencies, rates, commissionRates, worklog, comisiones, colleaguePayments }) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");

  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  const [filters, setFilters] = useState({ from: "", to: "" });
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const hasFilter = Boolean(filters.from || filters.to);

  const pendingAll = useMemo(() => {
    let list = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows));
    if (filters.from) list = list.filter((e) => e.date >= filters.from);
    if (filters.to) list = list.filter((e) => e.date <= filters.to);
    return list;
  }, [incomeEntries, filters, paymentStatuses.rows]);

  const groups = useMemo(() => {
    const bySchool = {};
    pendingAll.forEach((e) => { (bySchool[e.school] ||= []).push(e); });
    return Object.entries(bySchool)
      .map(([school, entries]) => {
        const totals = {};
        entries.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.total; });
        return { school, entries: [...entries].sort((a, b) => a.date.localeCompare(b.date)), totals };
      })
      .sort((a, b) => a.school.localeCompare(b.school));
  }, [pendingAll]);

  const grandTotals = useMemo(() => {
    const map = {};
    pendingAll.forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [pendingAll]);

  const tableFor = (source) => (source === "ganado" ? worklog : source === "comision" ? comisiones : colleaguePayments);

  const collectEntries = async (entries, successMessage) => {
    if (entries.length === 0) return false;
    const targetStatus = oppositeStatus(entries[0].status, paymentStatuses.rows);
    const bySource = { ganado: [], comision: [], companeros: [] };
    entries.forEach((e) => bySource[e._source].push(e.id));
    try {
      let count = 0;
      for (const [source, ids] of Object.entries(bySource)) {
        if (ids.length === 0) continue;
        count += await tableFor(source).bulkUpdateWhere((e) => ids.includes(e.id), { status: targetStatus });
      }
      toast?.success(successMessage(count));
      return true;
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
      return false;
    }
  };

  const collectSchool = (school, entries) =>
    collectEntries(entries, (count) => `${count} ${count === 1 ? "elemento cobrado" : "elementos cobrados"} de ${school}`);

  const toggleExpand = (school) => setExpanded((x) => ({ ...x, [school]: !x[school] }));
  const toggleSelect = (school) => setSelected((s) => {
    const next = new Set(s);
    next.has(school) ? next.delete(school) : next.add(school);
    return next;
  });
  const allSelected = groups.length > 0 && groups.every((g) => selected.has(g.school));
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(groups.map((g) => g.school)));

  // Un grupo cobrado individualmente ("Cobrar todo") desaparece solo de
  // `groups` en el siguiente render — no hace falta limpiar `selected` a
  // mano, `selectedEntries` ya no lo encuentra.
  const selectedEntries = useMemo(() => groups.filter((g) => selected.has(g.school)).flatMap((g) => g.entries), [groups, selected]);
  const selectedTotals = useMemo(() => {
    const map = {};
    selectedEntries.forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [selectedEntries]);
  const collectSelected = async () => {
    const ok = await collectEntries(selectedEntries, (count) => `${count} ${count === 1 ? "elemento cobrado" : "elementos cobrados"} de ${selected.size} ${selected.size === 1 ? "escuela" : "escuelas"}`);
    if (ok) setSelected(new Set());
  };

  return (
    <div className="space-y-4 pb-24">
      <PendingCollectionCard totals={grandTotals} count={pendingAll.length} currencyRows={currencies.rows} color={SUN} />
      {groups.length > 0 && (
        <div className="-mt-2.5 flex items-center justify-between text-xs text-gray-400">
          <span>Repartido en {groups.length} {groups.length === 1 ? "escuela" : "escuelas"}</span>
          <button onClick={toggleSelectAll} className="min-h-9 font-medium hover:text-gray-600">
            {allSelected ? "Ninguna" : "Seleccionar todas"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Desde"><DatePicker value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} placeholder="Sin límite" /></Field>
        <Field label="Hasta"><DatePicker value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} placeholder="Sin límite" /></Field>
      </div>
      {hasFilter && (
        <button onClick={() => setFilters({ from: "", to: "" })} className="-mt-2 min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
          Limpiar periodo
        </button>
      )}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-10 text-center">
          <PartyPopper size={26} className="text-gray-300" aria-hidden="true" />
          <p className="text-sm text-gray-400">{hasFilter ? "Nada pendiente con este periodo." : "Estás al día — nada pendiente de cobrar."}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => (
            <SchoolGroup
              key={g.school} school={g.school} entries={g.entries} totals={g.totals}
              expanded={!!expanded[g.school]} selected={selected.has(g.school)}
              onToggleExpand={() => toggleExpand(g.school)} onToggleSelect={() => toggleSelect(g.school)}
              onCollect={() => collectSchool(g.school, g.entries)}
              activityColor={activityColor} currencyRows={currencies.rows} schoolColor={schoolColor(g.school)}
            />
          ))}
        </div>
      )}

      {/* Barra de selección — misma altura de despeje que el FAB de Mi
          trabajo (bottom-24), para quedar siempre por encima de la barra
          de navegación inferior. Con relleno sólido: aquí no compite con
          ningún FAB, es la única acción global de la pantalla. */}
      {selected.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-24 z-20 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg px-4 py-3 text-white shadow-lg"
          style={{ backgroundColor: TEAL, left: "1rem", right: "1rem" }}
        >
          <div className="min-w-0">
            <div className="text-xs opacity-80">{selected.size} {selected.size === 1 ? "escuela" : "escuelas"}</div>
            <div className="text-sm font-bold tabular-nums"><MoneyLine totals={selectedTotals} currencyRows={currencies.rows} /></div>
          </div>
          <button onClick={collectSelected} className="min-h-11 shrink-0 rounded-md bg-white/15 px-4 text-sm font-semibold">
            Cobrar seleccionadas
          </button>
        </div>
      )}
    </div>
  );
}
