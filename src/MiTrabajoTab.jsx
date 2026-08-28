import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Pencil, Check, RotateCcw, MoreVertical, SlidersHorizontal, PartyPopper, ListChecks, Handshake, Users, Star } from "lucide-react";
import { NAVY, TEAL, SUN, CORAL, GREEN } from "./App";
import {
  inputCls, formatMoney, Money, Field, Select, MultiSelect, CurrencySearchSelect, MoneyInput,
  DatePicker, DateRangePicker, DeleteButton, colorFor, lighten, isPendingStatus, oppositeStatus, useToast,
  useClickOutside, useEscapeClose, todayStr, addDays,
} from "./shared";
import { computeRateTotal, buildActivityEntries, buildIncomeEntries } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";

// "Cobrados" se limita a los últimos 10 — mismo criterio que Pagos, ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md.
const RECENT_PAID_LIMIT = 10;

// El tipo no es un selector de primer nivel — vive dentro de "Filtrar",
// junto a fecha/escuela/curso, no como control permanente (ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md).
const TYPE_OPTIONS = ["Curso", "Comisión", "Ajuste de curso"];
const TYPE_KEY = { "Curso": "ganado", "Comisión": "comision", "Ajuste de curso": "companeros" };
const SOURCE_LABEL = { comision: "Comisión", companeros: "Ajuste" };
const CREATE_TYPES = [
  { key: "ganado", label: "Curso impartido", icon: ListChecks },
  { key: "comision", label: "Comisión", icon: Handshake },
  { key: "companeros", label: "Ajuste de curso", icon: Users },
];

// Sin marcador delante del texto (ver Pagos) — para el ajuste, el curso
// lidera igual que en Curso/Comisión, con el instructor relacionado como
// detalle secundario, porque el ajuste sigue estando ligado a un curso.
function EntryRowTitle({ entry, activityColor }) {
  const isAjuste = entry._source === "companeros";
  return (
    <div className="min-w-0">
      <p className="truncate text-[15px] font-semibold leading-tight" style={{ color: activityColor(entry.activity) }}>
        {entry.activity || "—"}
      </p>
      <p className="mt-0.5 truncate text-[11.5px] font-medium text-gray-400">
        {entry.school}{isAjuste && entry.colleague_name ? ` · con ${entry.colleague_name}` : ""}
      </p>
    </div>
  );
}

// "Confirmar cobro" no describe bien saldar una deuda hacia un compañero
// (importe negativo) — el resto del vocabulario ("Marcar pendiente") se
// mantiene igual porque sí es correcto en ambos sentidos.
function actionLabel(entry, isPending) {
  if (!isPending) return "Marcar pendiente";
  return entry._source === "companeros" && entry.total < 0 ? "Marcar liquidado" : "Confirmar cobro";
}

// Menú "⋯" para Editar/Eliminar — la acción de menor frecuencia de la fila
// (ver docs/ADR/0005-mi-trabajo-unificacion-economica.md, revisión de
// jerarquía de acciones): antes eran 2 iconos siempre visibles compitiendo
// con el cambio de estado; ahora quedan agrupados detrás de un único
// control, sin perder alcance (siguen a un toque de distancia).
function RowMenu({ onEdit, onDelete, itemLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  useEscapeClose(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2 text-gray-300 hover:text-gray-600"
      >
        <MoreVertical size={17} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button" role="menuitem"
            onClick={() => { setOpen(false); onEdit(); }}
            className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} aria-hidden="true" /> Editar
          </button>
          <DeleteButton variant="menuItem" onConfirm={onDelete} itemLabel={itemLabel} />
        </div>
      )}
    </div>
  );
}

// El cambio de estado es la acción de más frecuencia de la fila — se
// mantiene ligera (texto+icono, sin relleno de color) para no competir con
// el FAB, que es la única acción con fondo sólido de toda la pantalla (ver
// misma nota de ADR-0005 sobre jerarquía de acciones).
function EntryRow({ entry, activityColor, currencyRows, isPending, onToggle, onEdit, onDelete }) {
  const isAjuste = entry._source === "companeros";
  const negative = isAjuste && entry.total < 0;
  const amountColor = isAjuste ? (negative ? CORAL : GREEN) : NAVY;
  return (
    <div className="px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <EntryRowTitle entry={entry} activityColor={activityColor} />
        <span className="shrink-0 font-semibold tabular-nums" style={{ color: amountColor }}>
          {isAjuste && (negative ? "− " : "+ ")}
          <Money amount={Math.abs(entry.total)} code={entry.currency} currencyRows={currencyRows} style={{ color: amountColor }} />
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-gray-400">
          {entry.date}{SOURCE_LABEL[entry._source] ? ` · ${SOURCE_LABEL[entry._source]}` : ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggle}
            className="flex min-h-9 items-center gap-1 rounded px-1.5 text-xs font-semibold transition-colors"
            style={{ color: isPending ? TEAL : "#6B7280" }}
          >
            {isPending ? <Check size={14} aria-hidden="true" /> : <RotateCcw size={13} aria-hidden="true" />}
            {actionLabel(entry, isPending)}
          </button>
          <RowMenu onEdit={onEdit} onDelete={onDelete} itemLabel={isAjuste ? `el ajuste con ${entry.colleague_name}` : `${entry.activity} en ${entry.school}`} />
        </div>
      </div>
    </div>
  );
}

// El FAB flota justo encima de las acciones (derecha) de cada fila — al
// hacer scroll, pasa literalmente por encima de ellas un instante. En vez
// de reposicionarlo o encogerlo de forma fija, se aparta durante el scroll
// activo hacia abajo (que es cuando de verdad "tapa" contenido) y vuelve en
// cuanto el usuario sube o se detiene — mismo patrón que el FAB de Gmail o
// el botón de tuitear en X. Ver docs/ADR/0005-mi-trabajo-unificacion-economica.md.
function useHideFabOnScroll() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < 40) setVisible(true);
      else if (delta > 6) setVisible(false);
      else if (delta < -6) setVisible(true);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return visible;
}

// Cabecera de grupo por día en la lista — "Hoy"/"Ayer" para orientarse de
// un vistazo, día+mes abreviado el resto. Ayuda a escanear rápido cuando
// hay muchos elementos, sin necesitar abrir "Filtrar" para acotar fechas.
const WEEKDAYS_SHORT_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_SHORT_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function dateGroupLabel(dateStr) {
  if (dateStr === todayStr()) return "Hoy";
  if (dateStr === addDays(todayStr(), -1)) return "Ayer";
  const [, m, d] = dateStr.split("-").map(Number);
  const weekday = (new Date(dateStr + "T00:00:00").getDay() + 6) % 7;
  return `${WEEKDAYS_SHORT_ES[weekday]}, ${d} ${MONTHS_SHORT_ES[m - 1]}`;
}

function emptyMessage(statusFilter, hasActiveFilters) {
  if (statusFilter === "pendientes") {
    return hasActiveFilters ? "Sin elementos pendientes con estos filtros." : "Estás al día — nada pendiente.";
  }
  return hasActiveFilters ? "Sin elementos cobrados con estos filtros." : "Todavía no has marcado nada como cobrado.";
}

// schools / activities / paymentTypes / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], insertRow, updateRow, deleteRow, bulkUpdateWhere }
// accentColor: color de sección (nav_sections), para el FAB
// autoOpenType: "log" | "comisiones" | null — llegado desde el acceso rápido de Home
// userId: profile.user_id — clave de la moneda favorita en localStorage (ver más abajo)
// Unifica Registro + Comisiones + Compañeros en una única experiencia — ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md. Adaptador puro sobre el
// modelo actual (sin migración de datos ni cambio de esquema): sigue
// escribiendo sobre worklog/comisiones/colleague_payments de siempre.
// Moneda favorita — preferencia personal del instructor, no dato de
// negocio (no vive en Supabase a propósito): un instructor casi siempre
// cobra Ajustes en la misma moneda, y hoy el valor por defecto es el
// global de Configuración, no el suyo. localStorage evita una migración
// de esquema para una preferencia de un solo campo, de un solo
// dispositivo — si algún día hace falta sincronizarla entre dispositivos,
// eso sí sería motivo para moverla a `profiles` (columna nueva, con su
// propia migración).
const favoriteCurrencyKey = (userId) => `oceanpulse:favoriteCurrency:${userId || "anon"}`;
function getFavoriteCurrency(userId) {
  try { return localStorage.getItem(favoriteCurrencyKey(userId)); } catch { return null; }
}
function setFavoriteCurrency(userId, code) {
  try { localStorage.setItem(favoriteCurrencyKey(userId), code); } catch { /* localStorage no disponible — no es crítico, se ignora */ }
}

export default function MiTrabajoTab({
  schools, activities, paymentTypes, paymentStatuses, currencies,
  rates, commissionRates, worklog, comisiones, colleaguePayments,
  accentColor = TEAL, autoOpenType = null, onAutoOpened, userId = null,
}) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const [favoriteCurrency, setFavoriteCurrencyState] = useState(() => getFavoriteCurrency(userId));
  const markFavoriteCurrency = (code) => {
    setFavoriteCurrency(userId, code);
    setFavoriteCurrencyState(code);
    toast?.success(`${code} guardada como moneda favorita`);
  };
  // WORKAROUND TEMPORAL (ver docs/BACKLOG.md y docs/ADR/0003): igual que en
  // WorkLogTab/ComisionesTab, una cuenta nueva nace con payment_types
  // vacío — sin este fallback, el alta de tarifa al vuelo queda bloqueada.
  const defaultPaymentType = paymentTypes.rows.find((t) => t.name === "Per Person")?.name || paymentTypes.rows.find((t) => t.is_default)?.name || paymentTypes.rows[0]?.name || "Per Person";

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const activityEntries = useMemo(
    () => buildActivityEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );
  // La cabecera "Pendiente de cobrar" es una cifra más estrecha que la
  // lista de abajo: solo lo que te deben a ti, igual que en Home/Pagos —
  // un ajuste negativo pendiente aparece en la lista pero no aquí.
  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  const [statusFilter, setStatusFilter] = useState("pendientes"); // "pendientes" | "cobrados"
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: [], type: "" });

  const presentValues = (key) => [...new Set(activityEntries.map((e) => e[key]).filter(Boolean))].sort();
  const hasActiveFilters = Boolean(filters.type || filters.from || filters.to || filters.school || filters.activity.length > 0);
  // Desde/Hasta cuentan como un único filtro de "Periodo" — es un solo
  // control (DateRangePicker), no dos independientes.
  const activeFilterCount = [Boolean(filters.from || filters.to), Boolean(filters.school), filters.activity.length > 0, Boolean(filters.type)].filter(Boolean).length;
  const clearFilters = () => setFilters({ from: "", to: "", school: "", activity: [], type: "" });

  const filteredEntries = useMemo(() => {
    let list = activityEntries;
    if (filters.type) list = list.filter((e) => e._source === TYPE_KEY[filters.type]);
    if (filters.from) list = list.filter((e) => e.date >= filters.from);
    if (filters.to) list = list.filter((e) => e.date <= filters.to);
    if (filters.school) list = list.filter((e) => e.school === filters.school);
    if (filters.activity.length > 0) list = list.filter((e) => filters.activity.includes(e.activity));
    return list;
  }, [activityEntries, filters]);

  const pendingAll = useMemo(
    () => filteredEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => a.date.localeCompare(b.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  const paidAll = useMemo(
    () => filteredEntries.filter((e) => !isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => b.date.localeCompare(a.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  const paidCapped = paidAll.slice(0, RECENT_PAID_LIMIT);
  const showPaidCapHint = statusFilter === "cobrados" && paidAll.length > paidCapped.length;
  const visibleList = statusFilter === "pendientes" ? pendingAll : paidCapped;

  const pendingTotals = useMemo(() => {
    const map = {};
    incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [incomeEntries, paymentStatuses.rows]);
  const pendingIncomeCount = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).length;

  const tableFor = (source) => (source === "ganado" ? worklog : source === "comision" ? comisiones : colleaguePayments);
  // Sin esto, la pantalla mostraba "Estás al día — nada pendiente" durante
  // el instante entre montar y recibir la primera respuesta de Supabase —
  // un usuario nuevo lo leía como "esta app no tiene nada", no como
  // "cargando". Un esqueleto breve evita ese vistazo equivocado.
  const dataLoaded = worklog.loaded && comisiones.loaded && colleaguePayments.loaded && rates.loaded && commissionRates.loaded;

  const toggleStatus = async (entry) => {
    const target = oppositeStatus(entry.status, paymentStatuses.rows);
    try {
      await tableFor(entry._source).updateRow(entry.id, { status: target });
      if (isPendingStatus(target, paymentStatuses.rows)) {
        toast?.success("Marcado como pendiente");
      } else if (statusFilter === "pendientes") {
        toast?.success('Marcado como cobrado — cámbialo a "Cobrados" para verlo');
      } else {
        toast?.success("Marcado como cobrado");
      }
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

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
        ? `${count} ${count === 1 ? "elemento confirmado" : "elementos confirmados"} — cambia a "Cobrados" para verlos`
        : `${count} ${count === 1 ? "elemento confirmado" : "elementos confirmados"}`;
      toast?.success(msg);
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

  const activitiesForSchool = (school) => {
    const names = [...new Set(rates.rows.filter((r) => r.school === school).map((r) => r.activity))];
    return names.length > 0 ? names : activityNames;
  };
  const colleagueSuggestions = (school) =>
    [...new Set(colleaguePayments.rows.filter((p) => p.school === school).map((p) => p.colleague_name))];

  // -----------------------------------------------------------------
  // Creación y edición comparten la misma hoja inferior — misma
  // disposición de campos, mismo botón "Guardar", solo cambia el título
  // y si se hace insert o update al confirmar. Antes la edición usaba una
  // fila en línea de hasta 6 columnas dentro de la propia lista: en móvil
  // eso obligaba a repartir 6 campos en 3 filas de 2 columnas muy
  // estrechas, con dos selects abiertos pudiendo solaparse entre sí. Un
  // único formulario para ambos casos es también el patrón habitual en
  // apps profesionales (Linear, Stripe) y coincide con la convención ya
  // establecida de "crear = hoja inferior" (ver CLAUDE.md) — editar sigue
  // la misma convención en vez de tener un patrón de interacción propio.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(null); // null | "ganado" | "comision" | "companeros"
  const [form, setForm] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null); // null = creando; si no, la entrada que se está editando
  // Solo se sugiere "usar como favorita" tras un cambio activo del usuario
  // en esta sesión del formulario — no en el valor preseleccionado al
  // abrir, aunque ese valor también sea distinto de la favorita guardada.
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const fabVisible = useHideFabOnScroll();

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setCreating(entry._source);
    setForm(entry._source === "companeros"
      ? { date: entry.date, school: entry.school, activity: entry.activity, colleague_name: entry.colleague_name, amount: entry.amount, currency: entry.currency, notes: entry.notes || "" }
      : { date: entry.date, school: entry.school, activity: entry.activity, people: entry.people, notes: entry.notes || "" });
    setCurrencyTouched(false);
  };
  const closeSheet = () => { setCreating(null); setForm(null); setEditingEntry(null); setAddingRate(false); setRateForm(null); setCurrencyTouched(false); };

  // Antes "añadir tarifa" abría una segunda hoja apilada encima de la de
  // crear/editar — un modal encadenado. Ahora es un bloque que se expande
  // dentro de la misma hoja (Escuela/Curso ya se conocen por contexto, solo
  // hace falta Moneda + Tarifa) — un paso y una transición menos.
  const [addingRate, setAddingRate] = useState(false);
  const [rateForm, setRateForm] = useState(null);
  const [savingRate, setSavingRate] = useState(false);

  const emptyFormFor = (type) => {
    const base = { date: new Date().toISOString().slice(0, 10), school: defaultSchool, notes: "" };
    if (type === "companeros") return { ...base, activity: "", colleague_name: "", amount: "", currency: favoriteCurrency || defaultCurrency };
    return { ...base, activity: defaultActivity, people: 1 };
  };
  const openCreate = (type) => {
    setCreating(type);
    setForm(emptyFormFor(type));
    setEditingEntry(null);
    setCurrencyTouched(false);
    setPickerOpen(false);
  };

  // Llegado desde el acceso directo de Home: abre directamente el
  // formulario del tipo correspondiente, sin pasar por el selector.
  useEffect(() => {
    if (autoOpenType === "log") openCreate("ganado");
    else if (autoOpenType === "comisiones") openCreate("comision");
    if (autoOpenType) onAutoOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ratesTableFor = (type) => (type === "ganado" ? rates : commissionRates);
  const rateFor = (type, school, activity) => ratesTableFor(type).rows.find((r) => r.school === school && r.activity === activity);

  const preview = useMemo(() => {
    if (!form || (creating !== "ganado" && creating !== "comision")) return null;
    const r = rateFor(creating, form.school, form.activity);
    if (!r) return null;
    return { rate: r.rate, paymentType: r.payment_type, total: computeRateTotal(r, form.people), currency: r.currency };
  }, [creating, form, rates.rows, commissionRates.rows]);

  const disableSaveCurso = creating !== "companeros" && (!form?.date || !form?.school || !form?.activity || !preview);
  const disableSaveAjuste = creating === "companeros" && (!form?.date || !form?.school || !form?.activity || !form?.colleague_name || form?.amount === "");
  const disableSave = creating === "companeros" ? disableSaveAjuste : disableSaveCurso;

  const saveEntry = async () => {
    if (disableSave) return;
    try {
      if (editingEntry) {
        const patch = creating === "companeros"
          ? { ...form, amount: Number(form.amount) }
          : { ...form, people: Number(form.people) || 0 };
        await tableFor(creating).updateRow(editingEntry.id, patch);
        toast?.success("Cambios guardados");
      } else if (creating === "companeros") {
        await colleaguePayments.insertRow({ ...form, amount: Number(form.amount), status: defaultStatus });
        toast?.success("Ajuste añadido");
      } else {
        await tableFor(creating).insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
        toast?.success(creating === "ganado" ? "Curso añadido" : "Comisión añadida");
      }
      closeSheet();
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const openInlineRate = () => {
    setRateForm({ school: form.school, activity: form.activity, payment_type: defaultPaymentType, currency: defaultCurrency, rate: "" });
    setAddingRate(true);
  };
  const saveRate = async () => {
    if (!rateForm.school || !rateForm.activity || !rateForm.payment_type || !rateForm.rate) return;
    setSavingRate(true);
    try {
      await ratesTableFor(creating).insertRow({ ...rateForm, rate: Number(rateForm.rate) });
      setAddingRate(false);
      setRateForm(null);
      toast?.success("Tarifa añadida");
    } catch {
      toast?.error("No se pudo guardar la tarifa. Inténtalo de nuevo.");
    } finally {
      setSavingRate(false);
    }
  };

  const sheetTitle = editingEntry
    ? { ganado: "Editar curso impartido", comision: "Editar comisión", companeros: "Editar ajuste de curso" }[creating]
    : { ganado: "Nuevo curso impartido", comision: "Nueva comisión", companeros: "Nuevo ajuste de curso" }[creating];
  // Mismo icono que su fila en "¿Qué quieres añadir?" — conecta visualmente
  // el paso 1 (elegir tipo) con el paso 2 (el formulario), y da a la hoja
  // la misma identidad visual que ya usa el resto de "Movimientos".
  const SheetIcon = CREATE_TYPES.find((t) => t.key === creating)?.icon;

  return (
    <div className="relative space-y-4 pb-24">
      <PendingCollectionCard totals={pendingTotals} count={pendingIncomeCount} currencyRows={currencies.rows} color={SUN} />

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

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${filtersOpen ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-600"}`}
          style={filtersOpen ? { backgroundColor: TEAL } : {}}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtrar{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
        {statusFilter === "pendientes" && pendingAll.length > 0 && (
          <button onClick={collectAllPending} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
            Confirmar todos
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <Field label="Periodo">
            <DateRangePicker from={filters.from} to={filters.to} onChange={(r) => setFilters({ ...filters, ...r })} />
          </Field>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Escuela"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" /></Field>
            <Field label="Curso"><MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Todos" /></Field>
            <Field label="Tipo"><Select value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={TYPE_OPTIONS} placeholder="Todos" /></Field>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {!dataLoaded ? (
          <div className="divide-y divide-gray-100" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3.5 w-32 rounded bg-gray-200" />
                  <div className="h-3.5 w-14 rounded bg-gray-200" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="h-3 w-20 rounded bg-gray-100" />
                  <div className="h-3 w-16 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            {statusFilter === "pendientes" && !hasActiveFilters && <PartyPopper size={26} className="text-gray-300" aria-hidden="true" />}
            <p className="text-sm text-gray-400">{emptyMessage(statusFilter, hasActiveFilters)}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleList.map((e, i) => {
              const showGroupHeader = i === 0 || visibleList[i - 1].date !== e.date;
              return (
                <React.Fragment key={`${e._source}-${e.id}`}>
                  {showGroupHeader && (
                    <div className="bg-gray-50/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {dateGroupLabel(e.date)}
                    </div>
                  )}
                  <EntryRow
                    entry={e} activityColor={activityColor} currencyRows={currencies.rows}
                    isPending={statusFilter === "pendientes"}
                    onToggle={() => toggleStatus(e)}
                    onEdit={() => startEdit(e)}
                    onDelete={() => tableFor(e._source).deleteRow(e.id)}
                  />
                </React.Fragment>
              );
            })}
            {showPaidCapHint && (
              <p className="px-4 py-3 text-center text-xs text-gray-400">
                Mostrando los {RECENT_PAID_LIMIT} cobrados más recientes de {paidAll.length} — usa "Filtrar" para ver un periodo concreto.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setPickerOpen(true)}
        aria-label="Añadir"
        aria-hidden={!fabVisible}
        tabIndex={fabVisible ? 0 : -1}
        className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-90"
        style={{
          backgroundColor: accentColor, width: 52, height: 52,
          opacity: fabVisible ? 1 : 0,
          transform: fabVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.7)",
          pointerEvents: fabVisible ? "auto" : "none",
        }}
      >
        <Plus size={24} aria-hidden="true" />
      </button>

      {pickerOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={() => setPickerOpen(false)}>
          <div
            className="w-full max-w-3xl rounded-t-xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">¿Qué quieres añadir?</h3>
              <button onClick={() => setPickerOpen(false)} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            <div className="space-y-2">
              {CREATE_TYPES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => openCreate(key)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-gray-200 px-4 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Icon size={18} style={{ color: accentColor }} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {creating && form && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={closeSheet}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {SheetIcon && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: lighten(accentColor) }}>
                    <SheetIcon size={14} style={{ color: accentColor }} aria-hidden="true" />
                  </span>
                )}
                <h3 className="text-sm font-semibold text-gray-800">{sheetTitle}</h3>
              </div>
              <button onClick={closeSheet} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            {creating === "companeros" && (
              <p className="mb-3 text-xs text-gray-400">Importe positivo si te paga a ti; negativo si le pagas tú a él/ella.</p>
            )}

            {/* Fecha+Escuela primero (contexto), Curso siempre en su propia
                fila: depende de Escuela y sus nombres pueden ser largos —
                emparejarlo con otro select ancho es lo que provocaba paneles
                solapados (ver comentario de Select en shared.jsx). Campos
                específicos del tipo debajo, Notas siempre al final por ser
                el de menor frecuencia de uso. */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Fecha">
                  <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
                </Field>
                <Field label="Escuela">
                  <Select
                    value={form.school}
                    onChange={(v) => setForm(creating === "companeros" ? { ...form, school: v, activity: "" } : { ...form, school: v })}
                    options={schoolNames}
                  />
                </Field>
              </div>
              <Field label="Curso">
                <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={creating === "companeros" ? activitiesForSchool(form.school) : activityNames} />
              </Field>

              {/* Separa visualmente "contexto" (cuándo/dónde) de "detalle"
                  (qué importe, con quién) — mismo criterio de agrupación que
                  el panel de filtros (Periodo aparte de Escuela/Curso/Tipo). */}
              <div className="space-y-2.5 border-t border-gray-100 pt-2.5">
                {creating === "companeros" ? (
                  <>
                    <Field label="Instructor relacionado">
                      <input
                        list="mi-trabajo-colleague-names"
                        value={form.colleague_name}
                        onChange={(e) => setForm({ ...form, colleague_name: e.target.value })}
                        className={`${inputCls} w-full`}
                        placeholder="Ana, Marc..."
                      />
                      <datalist id="mi-trabajo-colleague-names">
                        {colleagueSuggestions(form.school).map((n) => <option key={n} value={n} />)}
                      </datalist>
                    </Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Importe (puede ser negativo)">
                        <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="90 ó -30" />
                      </Field>
                      <Field label="Moneda">
                        <CurrencySearchSelect
                          value={form.currency}
                          onChange={(v) => { setForm({ ...form, currency: v }); setCurrencyTouched(true); }}
                          currencyRows={currencies.rows}
                        />
                      </Field>
                    </div>
                    {currencyTouched && form.currency && form.currency !== favoriteCurrency && (
                      <button
                        type="button"
                        onClick={() => markFavoriteCurrency(form.currency)}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        style={{ borderColor: TEAL, color: TEAL }}
                      >
                        <Star size={11} aria-hidden="true" /> Usar {form.currency} como favorita
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-28">
                    <Field label="Nº personas">
                      <input type="number" min={0} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} className={`${inputCls} w-full`} />
                    </Field>
                  </div>
                )}

                {creating !== "companeros" && (
                  <div
                    className="rounded-lg border px-3 py-2.5 text-xs"
                    style={
                      preview ? { borderColor: "#99F6E4", backgroundColor: "#F0FDFA", color: "#374151" }
                      : { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", color: "#4B5563" }
                    }
                  >
                    {preview ? (
                      <span>
                        Tarifa: <b>{formatMoney(preview.rate, preview.currency, currencies.rows)}</b> ({preview.paymentType}) →
                        {" "}Total: <b style={{ color: TEAL }}>{formatMoney(preview.total, preview.currency, currencies.rows)}</b>
                      </span>
                    ) : addingRate ? (
                      <div className="space-y-2">
                        <p className="font-medium text-gray-700">
                          Nueva tarifa{creating === "comision" ? " de comisión" : ""} — {form.school} · {form.activity}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Moneda">
                            <CurrencySearchSelect value={rateForm.currency} onChange={(v) => setRateForm({ ...rateForm, currency: v })} currencyRows={currencies.rows} />
                          </Field>
                          <Field label="Tarifa">
                            <MoneyInput value={rateForm.rate} onChange={(v) => setRateForm({ ...rateForm, rate: v })} />
                          </Field>
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={saveRate}
                            disabled={savingRate || !rateForm.rate}
                            className="min-h-9 flex-1 rounded-md text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: accentColor }}
                          >
                            {savingRate ? "Guardando..." : "Guardar tarifa"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAddingRate(false); setRateForm(null); }}
                            disabled={savingRate}
                            className="min-h-9 rounded-md border border-gray-200 px-3 text-xs font-medium text-gray-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : form.school && form.activity ? (
                      <span className="text-amber-600">
                        Sin tarifa{creating === "comision" ? " de comisión" : ""} configurada —{" "}
                        <button type="button" onClick={openInlineRate} className="font-semibold underline underline-offset-2">
                          añadir tarifa
                        </button>.
                      </span>
                    ) : (
                      <span>Elige escuela y curso para ver el importe estimado.</span>
                    )}
                  </div>
                )}
              </div>

              <Field label="Notas">
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} w-full`} placeholder="Opcional" />
              </Field>
            </div>

            <button
              onClick={saveEntry}
              disabled={disableSave}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {editingEntry ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} Guardar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
