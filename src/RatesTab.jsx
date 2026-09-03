import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Check, X, Search, SlidersHorizontal, GraduationCap, Handshake } from "lucide-react";
import { NAVY, TEAL } from "./App";
import {
  inputCls, Select, MultiSelect, Field, colorFor, RowMenu, Money, MoneyInput,
  EntryTitle, useToast, Sheet, MOVEMENT_TYPE_META, lighten, Fab, shortDate,
} from "./shared";
import { listItemVariants, usePrefersReducedMotion } from "./motion";

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
// TYPE_OPTIONS/TYPE_KEY se quedan en español fijo a propósito (i18n, Fase 2):
// son a la vez el texto mostrado y la clave de búsqueda del Select de
// filtro (shared.jsx Select no separa value/label) — traducir el texto
// rompería TYPE_KEY[filters.type]. El label visible SÍ se traduce en
// render vía t(`common:movementTypes.${_source}`) — misma fuente única
// que usan HomeTab/SummaryTab/MiTrabajoTab, consolidada en common.json
// para no repetir la traducción de "Curso"/"Comisión"/"Ajuste" en cada
// pantalla (pedido explícito del usuario, 2026-09-01). Estas dos
// constantes solo alimentan ese Select en concreto. Mismo criterio ya
// aplicado en MiTrabajoTab.jsx.
const TYPE_OPTIONS = ["Curso", "Comisión"];
const TYPE_KEY = { "Curso": "ganado", "Comisión": "comision" };
const CREATE_TYPES = [
  { key: "ganado", icon: GraduationCap },
  { key: "comision", icon: Handshake },
];

// schools / activities / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates: { rows, insertRow, updateRow, deleteRow }
// worklog / comisiones: { rows: [...] } — para comprobar si una tarifa está en uso antes de dejar borrarla
// accentColor: color de sección (nav_sections), para el botón flotante de crear
export default function RatesTab({ schools, activities, currencies, rates, commissionRates, worklog, comisiones, accentColor = TEAL }) {
  const { t } = useTranslation("rates");
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();

  const tableFor = (source) => (source === "ganado" ? rates : commissionRates);
  const entriesForSource = (source) => (source === "ganado" ? worklog.rows : comisiones.rows);

  // payment_type: "Per Person" — literal fijo, no una elección real (ver
  // ADR-0003, pasos 1-2: la columna sigue en BD por ahora con NOT NULL,
  // pero deja de ser un concepto que el usuario vea o elija; el importe
  // siempre es tarifa × personas, ver rateCalc.js). Solo hace falta al
  // CREAR (insert) — al editar (ver startEdit) ni se lee ni se reenvía,
  // la columna ya tiene un valor de cuando se creó la fila.
  const emptyForm = { school: "", activity: "", payment_type: "Per Person", currency: defaultCurrency, rate: "" };
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
    setForm({ school: r.school, activity: r.activity, currency: r.currency, rate: r.rate });
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
    if (!form.school || !form.activity || !form.rate) return;
    try {
      if (editingEntry) {
        await tableFor(creating).updateRow(editingEntry.id, { ...form, rate: Number(form.rate) });
        toast?.success(t("toasts.saved"));
      } else {
        await tableFor(creating).insertRow({ ...form, rate: Number(form.rate) });
        toast?.success(t("toasts.added"));
      }
      closeSheet();
    } catch {
      toast?.error(t("toasts.saveError"));
    }
  };

  // Antes de borrar, comprobamos que ningún registro/comisión ya guardado
  // dependa de esta tarifa — si se borrara igualmente, esas filas se
  // quedarían sin tarifa que las emparejara y mostrarían 0,00 sin avisar.
  const deleteRate = async (r) => {
    const inUse = entriesForSource(r._source).filter((e) => e.school === r.school && e.activity === r.activity).length;
    if (inUse > 0) {
      throw new Error(t("deleteInUse", { count: inUse }));
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
          <SlidersHorizontal size={15} aria-hidden="true" /> {t("filter.button")}{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search.placeholder")} aria-label={t("search.ariaLabel")} className={`${inputCls} w-full pl-9`} />
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
            <Field label={t("filter.type")}><Select value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={TYPE_OPTIONS} placeholder={t("filter.typeAll")} label={t("filter.type")} /></Field>
            {/* Con una sola escuela configurada, filtrar por escuela no
                filtra nada — se oculta hasta que exista una segunda
                (2026-08-30, reducción de complejidad). */}
            {schools.rows.length > 1 && (
              <Field label={t("filter.school")}><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder={t("filter.schoolAll")} label={t("filter.school")} /></Field>
            )}
            <Field label={t("filter.course")}><MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder={t("filter.courseAll")} /></Field>
          </div>
          {hasFilters && (
            <button onClick={() => setFilters({ type: "", school: "", activity: [] })} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              {t("filter.clear")}
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>{t("list.count", { count: filtered.length })}</h3>
        </div>

        <div>
          {/* Vacío: mismo tratamiento neutro que Mi trabajo (centrado,
              py-10 — auditoría de estilo 2026-09-04, antes py-6 sin
              centrar verticalmente, un desvío accidental de la misma
              "sin resultados" que ESTILO.md ya documenta como estado
              neutro). Sin icono (a diferencia de "estás al día" en Mi
              trabajo): un catálogo vacío no es una buena noticia que
              confirmar, solo una lista sin filas todavía. */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <p className="text-sm text-gray-400">{t("list.empty")}</p>
            </div>
          )}
          {/* AnimatePresence + listItemVariants (motion.js) — mismo
              vocabulario de "fila de lista que entra/sale" que ya usan
              ExpandableCard y el desglose de Resumen (auditoría de estilo
              2026-09-04): antes una fila desaparecía de golpe al borrarla,
              la única lista con alta/baja de la app sin ninguna
              transición. No se toca la coreografía a medida de Mi trabajo
              (colapso de alto con retraso, toggle de estado, "Deshacer")
              — mucho más compleja por motivos propios (cambiar de pestaña
              sin perder la fila) que Tarifas no tiene: aquí borrar es
              definitivo, listItemVariants ya cubre el caso entero. */}
          <AnimatePresence initial={false}>
            {filtered.map((r) => (
              // Vuelta explícita al lenguaje de EntryRow en Mi trabajo
              // (feedback 2026-08-30, tercera vuelta: "no quiero seguir con
              // la versión de una sola línea... quiero que vuelva a una
              // presentación más parecida a Movimientos" — la versión de una
              // sola línea de la vuelta anterior queda descartada, no
              // conservada como alternativa). Borde izquierdo de color por
              // tipo, título+importe arriba, metadato (fecha de alta + tipo,
              // mismo formato "fecha · tipo" que la fila de Movimientos)
              // + RowMenu abajo — misma estructura de dos líneas, no una
              // tercera variante propia de Tarifas. Sin "divide-y" entre
              // filas (feedback explícito, cuarta vuelta): la línea de
              // separación entre cards ya se descartó en Mi trabajo por
              // ruido visual — el borde izquierdo de color y el propio
              // padding ya distinguen una fila de la siguiente.
              <motion.div key={r.id} {...listItemVariants(reducedMotion)} className="border-l-4 px-4 py-3.5 text-sm" style={{ borderColor: TYPE_META[r._source].color }}>
                <div className="flex items-start justify-between gap-2">
                  <EntryTitle school={r.school} activity={r.activity} schoolColor={schoolColor(r.school)} activityColor={activityColor(r.activity)} />
                  <span className="shrink-0 font-semibold tabular-nums" style={{ color: NAVY }}>
                    <Money amount={r.rate} code={r.currency} currencyRows={currencies.rows} style={{ color: NAVY }} />
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-gray-400">
                    {t("list.createdOn", { date: shortDate(r.created_at), type: t(`common:movementTypes.${r._source}`) })}
                  </span>
                  <RowMenu onEdit={() => startEdit(r)} onDelete={() => deleteRate(r)} itemLabel={t("rowMenu.itemLabel", { school: r.school, activity: r.activity })} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <Fab onClick={openCreateSheet} label={t("fab")} color={accentColor} />

      <Sheet open={sheetOpen} onClose={closeSheet}>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: lighten(sheetTypeColor) }}>
              {creating === "ganado" ? <GraduationCap size={14} style={{ color: sheetTypeColor }} aria-hidden="true" /> : <Handshake size={14} style={{ color: sheetTypeColor }} aria-hidden="true" />}
            </span>
            {/* Sin subtítulo de fecha aquí (una vuelta anterior la puso al
                retirarla del listado) — la fecha de alta ha vuelto al
                listado (metadato "Alta: ... · Tipo", ver más arriba), así
                que repetirla aquí sería redundante. */}
            <h3 className="text-sm font-semibold text-gray-800">
              {editingEntry ? t("sheet.editTitle", { school: editingEntry.school, activity: editingEntry.activity }) : t("sheet.createTitle", { type: t(`common:movementTypes.${creating}`) })}
            </h3>
          </div>
          <button onClick={closeSheet} className="text-gray-400" aria-label={t("sheet.close")}><X size={19} /></button>
        </div>

        {/* Selector de tipo integrado — mismo patrón que MovementSheet.
            Solo al crear: el tipo de una tarifa ya guardada no se cambia
            desde aquí (movería la fila entre tablas, fuera de alcance). */}
        {!editingEntry && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label={t("sheet.typeTablistLabel")}>
            {CREATE_TYPES.map(({ key, icon: Icon }) => (
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
                {t(`common:movementTypes.${key}`)}
              </button>
            ))}
          </div>
        )}

        <p className="mb-3 text-xs text-gray-400">
          {creating === "ganado" ? t("sheet.hintGanado") : t("sheet.hintComision")}
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Field label={t("sheet.school")}>
            <Select value={form.school} onChange={(v) => setForm({ ...form, school: v, currency: lastCurrencyFor(v) })} options={schoolNames} />
          </Field>
          <Field label={t("sheet.course")}>
            <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={activityNames} />
          </Field>
          {/* Moneda: visible, no editable (feedback 2026-08-30) — viaja como
              sufijo de la etiqueta de "Tarifa", mismo patrón ya usado en
              Ajuste de curso ("Importe · EUR", MovementSheet.jsx). Se
              deriva sola de la escuela (lastCurrencyFor), nunca se pierde
              el contexto de en qué moneda está esta tarifa, pero no hay
              ningún desplegable que tocar cada vez. */}
          <Field label={t("sheet.rateLabel", { currency: form.currency })}>
            <MoneyInput value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} />
          </Field>
        </div>

        <button
          onClick={submitSheet}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {editingEntry ? <Check size={16} /> : <Plus size={16} />} {t("sheet.save")}
        </button>
      </Sheet>
    </div>
  );
}
