import React, { useState, useMemo } from "react";
import { Plus, Check, X, Search, SlidersHorizontal, GraduationCap, Handshake } from "lucide-react";
import { NAVY, TEAL } from "./App";
import {
  inputCls, Select, MultiSelect, Field, colorFor, RowMenu, Money, MoneyInput,
  EntryTitle, useToast, Sheet, MOVEMENT_TYPE_META, lighten, Fab, shortDate,
} from "./shared";

// Rediseño 2026-08-30 — Tarifas pasa a hablar el mismo idioma visual que Mi
// trabajo: una única lista (antes dos pestañas de página, "Instructor"/
// "Comisión", cada una con su propia tabla montada por separado) con
// acento de color por tipo a la izquierda de cada fila (mismo criterio que
// EntryRow — TEAL para Curso, SUN para Comisión, ver MOVEMENT_TYPE_META),
// y el tipo como un filtro más dentro de "Filtrar" en vez de un modo de
// página — igual que Mi trabajo NO usa el tipo como control de primer
// nivel (ver docs/ADR/0005). Rates y commission_rates SIGUEN siendo dos
// tablas separadas (ninguna decisión de negocio cambia aquí, solo
// presentación) — se combinan únicamente en esta capa, con el mismo
// patrón que buildActivityEntries ya usa para worklog/comisiones.
const TYPE_META = { ganado: MOVEMENT_TYPE_META.ganado, comision: MOVEMENT_TYPE_META.comision };
const TYPE_OPTIONS = ["Curso", "Comisión"];
const TYPE_KEY = { "Curso": "ganado", "Comisión": "comision" };
const TYPE_LABEL = { ganado: "Curso", comision: "Comisión" };
const CREATE_TYPES = [
  { key: "ganado", label: "Curso", icon: GraduationCap },
  { key: "comision", label: "Comisión", icon: Handshake },
];

// schools / activities / paymentTypes / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates: { rows, insertRow, updateRow, deleteRow }
// worklog / comisiones: { rows: [...] } — para comprobar si una tarifa está en uso antes de dejar borrarla
// accentColor: color de sección (nav_sections), para el botón flotante de crear
export default function RatesTab({ schools, activities, paymentTypes, currencies, rates, commissionRates, worklog, comisiones, accentColor = TEAL }) {
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  // El tipo de pago ya no se elige en ningún formulario — toda tarifa nueva
  // se crea como "Per Person" (si no existe esa fila en payment_types, cae
  // al is_default de la tabla y, si tampoco hay, al primero).
  // WORKAROUND TEMPORAL (ver docs/BACKLOG.md y docs/ADR/0003): una cuenta
  // nueva nace con payment_types vacío (clone_setup_dataset no lo siembra),
  // así que sin este último fallback a "Per Person" el guardado de tarifa
  // queda bloqueado para todo instructor recién dado de alta. payment_type
  // como concepto está aprobado para eliminarse (ADR-0003) — este fallback
  // desaparece con esa migración, no antes.
  const defaultPaymentType = paymentTypes.rows.find((t) => t.name === "Per Person")?.name || paymentTypes.rows.find((t) => t.is_default)?.name || paymentTypes.rows[0]?.name || "Per Person";
  const toast = useToast();

  const tableFor = (source) => (source === "ganado" ? rates : commissionRates);
  const entriesForSource = (source) => (source === "ganado" ? worklog.rows : comisiones.rows);

  const emptyForm = { school: "", activity: "", payment_type: defaultPaymentType, currency: defaultCurrency, rate: "" };
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Filtros colapsables detrás de un botón "Filtrar" (mismo patrón que Mi
  // trabajo, ver filtersOpen/activeFilterCount en MiTrabajoTab.jsx).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ type: "", school: "", activity: [] });
  // creating: tipo elegido en la hoja — solo relevante al CREAR (ver
  // switchType); al editar, se fija al tipo real de la fila y no cambia
  // (mover una tarifa de tabla sería un cambio de modelo, fuera de
  // alcance, mismo criterio que MovementSheet con el tipo de movimiento).
  const [creating, setCreating] = useState("ganado");
  // editingEntry (null = alta): crear y editar comparten la misma hoja y el
  // mismo `form`, igual que MovementSheet en Mi trabajo (ver
  // docs/ADR/0013-tarifas-editar-en-hoja.md).
  const [editingEntry, setEditingEntry] = useState(null);

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);
  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");

  // Única lista combinada — mismo patrón que buildActivityEntries
  // (rateCalc.js) para worklog/comisiones: dos tablas reales, una sola
  // vista de presentación. Orden: más recientes primero (created_at desc,
  // igual que Movimientos) — feedback explícito 2026-08-30. `created_at`
  // todavía no existe en `rates`/`commission_rates` en la base de datos
  // real (columna pendiente de migración, ver docs/ADR/0019) — hasta que
  // se aplique, todas las filas comparan como "sin fecha" (empatan) y el
  // criterio de desempate (escuela/tipo/curso) decide el orden, igual que
  // antes de este cambio. En cuanto exista la columna, el orden por fecha
  // entra en vigor sin tocar nada más aquí.
  const allRows = useMemo(() => {
    const ganado = rates.rows.map((r) => ({ ...r, _source: "ganado" }));
    const comision = commissionRates.rows.map((r) => ({ ...r, _source: "comision" }));
    // Curso antes que Comisión dentro de la misma escuela (desempate): es
    // el caso dominante (ver docs/ADR/0005 — el FAB de Mi trabajo entra
    // directo a "Curso impartido"), un orden alfabético por _source lo
    // dejaría al revés por casualidad ("comision" < "ganado").
    const TYPE_RANK = { ganado: 0, comision: 1 };
    return [...ganado, ...comision].sort((a, b) =>
      (new Date(b.created_at || 0) - new Date(a.created_at || 0))
      || a.school.localeCompare(b.school) || TYPE_RANK[a._source] - TYPE_RANK[b._source] || a.activity.localeCompare(b.activity)
    );
  }, [rates.rows, commissionRates.rows]);

  const presentValues = (key) => [...new Set(allRows.map((r) => r[key]).filter(Boolean))].sort();
  const hasFilters = filters.type || filters.school || (filters.activity && filters.activity.length > 0);
  const activeFilterCount = [Boolean(filters.type), Boolean(filters.school), filters.activity.length > 0].filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = allRows;
    if (filters.type) list = list.filter((r) => r._source === TYPE_KEY[filters.type]);
    if (filters.school) list = list.filter((r) => r.school === filters.school);
    if (filters.activity && filters.activity.length > 0) list = list.filter((r) => filters.activity.includes(r.activity));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => [r.school, r.activity].some((v) => String(v ?? "").toLowerCase().includes(q)));
    }
    return list;
  }, [allRows, query, filters]);

  const closeSheet = () => { setSheetOpen(false); setEditingEntry(null); };

  // Moneda: smart default por escuela, no un desplegable que haya que
  // tocar cada vez (feedback explícito 2026-08-30 — "quitar la edición de
  // moneda, pero que siga viéndose"). Mismo criterio que lastActivityFor
  // en MovementSheet.jsx: la moneda de la tarifa más reciente ya guardada
  // para esa escuela, no un valor global fijo — una escuela en THB sigue
  // proponiendo THB para su siguiente tarifa. Sin ninguna tarifa previa
  // para esa escuela, cae al default de la app (emptyForm.currency).
  const lastCurrencyFor = (school) => {
    const matches = allRows.filter((r) => r.school === school);
    if (matches.length === 0) return defaultCurrency;
    return [...matches].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0].currency;
  };

  const openCreateSheet = () => {
    setForm(emptyForm);
    setCreating("ganado");
    setEditingEntry(null);
    setSheetOpen(true);
  };

  const startEdit = (r) => {
    setForm({ school: r.school, activity: r.activity, payment_type: r.payment_type, currency: r.currency, rate: r.rate });
    setCreating(r._source);
    setEditingEntry(r);
    setSheetOpen(true);
  };

  // Cambiar de tipo dentro de la propia hoja (solo al crear, ver
  // CREATE_TYPES) — conserva escuela/curso/moneda (siguen teniendo
  // sentido), reinicia el importe: la tarifa de Curso y la de Comisión
  // para la misma escuela+curso son casi siempre valores distintos,
  // arrastrar el número equivocado de un tipo a otro sería más confuso
  // que partir de cero.
  const switchType = (type) => {
    setCreating(type);
    setForm({ ...form, rate: "" });
  };

  const submitSheet = async () => {
    if (!form.school || !form.activity || !form.payment_type || !form.rate) return;
    try {
      if (editingEntry) {
        await tableFor(creating).updateRow(editingEntry.id, { ...form, rate: Number(form.rate) });
        toast?.success("Cambios guardados");
      } else {
        await tableFor(creating).insertRow({ ...form, rate: Number(form.rate) });
        toast?.success("Tarifa añadida");
      }
      closeSheet();
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  // Antes de borrar, comprobamos que ningún registro/comisión ya guardado
  // dependa de esta tarifa — si se borrara igualmente, esas filas se
  // quedarían sin tarifa que las emparejara y mostrarían 0,00 sin avisar.
  const deleteRate = async (r) => {
    const inUse = entriesForSource(r._source).filter((e) => e.school === r.school && e.activity === r.activity).length;
    if (inUse > 0) {
      throw new Error(`No se puede eliminar: hay ${inUse} ${inUse === 1 ? "registro que usa" : "registros que usan"} esta tarifa.`);
    }
    await tableFor(r._source).deleteRow(r.id);
  };

  const sheetTypeColor = TYPE_META[creating]?.color || NAVY;

  return (
    <div className="relative space-y-4 pb-16">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${filtersOpen ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-600"}`}
          style={filtersOpen ? { backgroundColor: TEAL } : {}}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtrar{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar tarifa" className={`${inputCls} w-full pl-9`} />
        </div>
      </div>

      {filtersOpen && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="grid grid-cols-2 gap-2">
            {/* label explícito en cada Select: sin él, el nombre accesible
                del botón es el placeholder ("Todos"/"Todas") — con varios
                filtros compartiendo el mismo placeholder genérico, quedarían
                indistinguibles para un lector de pantalla.
                Sin filtro "Pago" a propósito (2026-08-30, feedback
                explícito: quitar "per person" de todo el frontal) — ningún
                formulario expone `payment_type` y hoy vale siempre "Per
                Person" (ver docs/ADR/0003), así que filtrar por él nunca
                reducía la lista a nada: era una opción de filtro sin ningún
                efecto real, solo exponía el nombre interno del concepto. */}
            <Field label="Tipo"><Select value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={TYPE_OPTIONS} placeholder="Todos" label="Tipo" /></Field>
            {/* Con una sola escuela configurada, filtrar por escuela no
                filtra nada — se oculta hasta que exista una segunda
                (2026-08-30, reducción de complejidad). */}
            {schools.rows.length > 1 && (
              <Field label="Escuela"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" label="Escuela" /></Field>
            )}
            <Field label="Curso"><MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Todos" /></Field>
          </div>
          {hasFilters && (
            <button onClick={() => setFilters({ type: "", school: "", activity: [] })} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>{filtered.length} tarifas</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Sin resultados.</p>}
          {filtered.map((r) => (
            // Mismo lenguaje que EntryRow en Mi trabajo: borde izquierdo de
            // color por tipo (antes el tipo se deducía de en qué pestaña de
            // página estabas — ahora la propia fila lo dice, porque ya no
            // hay pestañas), título+importe arriba, metadato+acciones abajo,
            // mismo RowMenu "⋯" para Editar/Eliminar. "Editar" abre la misma
            // hoja que "Nueva tarifa", precargada.
            <div key={r.id} className="border-l-4 px-4 py-3.5 text-sm" style={{ borderColor: TYPE_META[r._source].color }}>
              <div className="flex items-start justify-between gap-2">
                {/* Icono de tipo visible (feedback explícito 2026-08-30:
                    "ahora no sale y quiero que se entienda de un vistazo")
                    — antes solo el color del borde izquierdo lo indicaba,
                    insuficiente por sí solo. Mismo icono que el selector de
                    tipo de la propia hoja (CREATE_TYPES), mismo color que
                    el borde — dos señales coherentes entre sí, no una
                    tercera forma nueva de decir lo mismo. */}
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  {r._source === "ganado"
                    ? <GraduationCap size={15} style={{ color: TYPE_META[r._source].color }} role="img" aria-label={TYPE_LABEL[r._source]} />
                    : <Handshake size={15} style={{ color: TYPE_META[r._source].color }} role="img" aria-label={TYPE_LABEL[r._source]} />}
                </span>
                <EntryTitle school={r.school} activity={r.activity} schoolColor={schoolColor(r.school)} activityColor={activityColor(r.activity)} />
                <span className="shrink-0 font-semibold tabular-nums" style={{ color: NAVY }}>
                  <Money amount={r.rate} code={r.currency} currencyRows={currencies.rows} style={{ color: NAVY }} />
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                {/* Fecha de alta de la tarifa (created_at, fijada sola al
                    crearla — no es un campo del formulario) en vez de
                    "Curso · Per Person": mismo dato y misma redacción que
                    ya usa Usuarios ("Alta: <fecha>"), sin ambigüedad sobre
                    qué fecha es. */}
                <span className="truncate text-xs text-gray-400">Alta: {shortDate(r.created_at)}</span>
                <RowMenu onEdit={() => startEdit(r)} onDelete={() => deleteRate(r)} itemLabel={`la tarifa de ${r.school} - ${r.activity}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Fab onClick={openCreateSheet} label="Nueva tarifa" color={accentColor} />

      <Sheet open={sheetOpen} onClose={closeSheet}>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: lighten(sheetTypeColor) }}>
              {creating === "ganado" ? <GraduationCap size={14} style={{ color: sheetTypeColor }} aria-hidden="true" /> : <Handshake size={14} style={{ color: sheetTypeColor }} aria-hidden="true" />}
            </span>
            <h3 className="text-sm font-semibold text-gray-800">
              {editingEntry ? `Editar tarifa de ${editingEntry.school} - ${editingEntry.activity}` : `Nueva tarifa de ${TYPE_LABEL[creating]}`}
            </h3>
          </div>
          <button onClick={closeSheet} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
        </div>

        {/* Selector de tipo integrado — mismo patrón que MovementSheet.
            Solo al crear: el tipo de una tarifa ya guardada no se cambia
            desde aquí (movería la fila entre tablas, fuera de alcance). */}
        {!editingEntry && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Tipo de tarifa">
            {CREATE_TYPES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={creating === key}
                onClick={() => switchType(key)}
                className="flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors"
                style={creating === key ? { backgroundColor: "white", color: TYPE_META[key].color, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "#6B7280" }}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}

        <p className="mb-3 text-xs text-gray-400">
          {creating === "ganado"
            ? "Lo que cobras por impartir tú el curso."
            : "Lo que cobras por traer a un cliente."}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Field label="Escuela">
            <Select value={form.school} onChange={(v) => setForm({ ...form, school: v, currency: lastCurrencyFor(v) })} options={schoolNames} />
          </Field>
          <Field label="Curso">
            <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activityNames} />
          </Field>
          {/* Moneda: visible, no editable (feedback 2026-08-30) — viaja como
              sufijo de la etiqueta de "Tarifa", mismo patrón ya usado en
              Ajuste de curso ("Importe · EUR", MovementSheet.jsx). Se
              deriva sola de la escuela (lastCurrencyFor), nunca se pierde
              el contexto de en qué moneda está esta tarifa, pero no hay
              ningún desplegable que tocar cada vez. */}
          <Field label={`Tarifa · ${form.currency}`}>
            <MoneyInput value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} />
          </Field>
        </div>

        <button
          onClick={submitSheet}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {editingEntry ? <Check size={16} /> : <Plus size={16} />} Guardar
        </button>
      </Sheet>
    </div>
  );
}
