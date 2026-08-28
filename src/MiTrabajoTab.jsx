import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Pencil, Check, RotateCcw, MoreVertical, SlidersHorizontal, PartyPopper, ListChecks, Handshake, Users } from "lucide-react";
import { NAVY, TEAL, SUN, CORAL, GREEN } from "./App";
import {
  inputCls, formatMoney, Money, Field, Select, MultiSelect, CurrencySearchSelect, MoneyInput,
  DatePicker, EditActions, DeleteButton, AppLoading, colorFor, isPendingStatus, oppositeStatus, useToast,
  useClickOutside, useEscapeClose,
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

function emptyMessage(statusFilter, hasActiveFilters) {
  if (statusFilter === "pendientes") {
    return hasActiveFilters ? "Sin elementos pendientes con estos filtros." : "Estás al día — nada pendiente.";
  }
  return hasActiveFilters ? "Sin elementos cobrados con estos filtros." : "Todavía no has marcado nada como cobrado.";
}

// schools / activities / paymentTypes / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], insertRow, updateRow, deleteRow, bulkUpdateWhere }
// appConfig: { rows: [...] } — icono de carga al dar de alta una tarifa al vuelo
// accentColor: color de sección (nav_sections), para el FAB
// autoOpenType: "log" | "comisiones" | null — llegado desde el acceso rápido de Home
// Unifica Registro + Comisiones + Compañeros en una única experiencia — ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md. Adaptador puro sobre el
// modelo actual (sin migración de datos ni cambio de esquema): sigue
// escribiendo sobre worklog/comisiones/colleague_payments de siempre.
export default function MiTrabajoTab({
  schools, activities, paymentTypes, paymentStatuses, currencies,
  rates, commissionRates, worklog, comisiones, colleaguePayments,
  appConfig, accentColor = TEAL, autoOpenType = null, onAutoOpened,
}) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
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

  // -----------------------------------------------------------------
  // Edición en línea — un formulario distinto por tipo, igual que las
  // 3 pantallas actuales de las que viene cada uno.
  // -----------------------------------------------------------------
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState({});

  const activitiesForSchool = (school) => {
    const names = [...new Set(rates.rows.filter((r) => r.school === school).map((r) => r.activity))];
    return names.length > 0 ? names : activityNames;
  };
  const colleagueSuggestions = (school) =>
    [...new Set(colleaguePayments.rows.filter((p) => p.school === school).map((p) => p.colleague_name))];

  const startEdit = (entry) => {
    setEditingKey(`${entry._source}-${entry.id}`);
    if (entry._source === "companeros") {
      setEditForm({ date: entry.date, school: entry.school, activity: entry.activity, colleague_name: entry.colleague_name, amount: entry.amount, currency: entry.currency, notes: entry.notes || "" });
    } else {
      setEditForm({ date: entry.date, school: entry.school, activity: entry.activity, people: entry.people, notes: entry.notes || "" });
    }
  };
  const saveEdit = async (entry) => {
    try {
      const patch = entry._source === "companeros"
        ? { ...editForm, amount: Number(editForm.amount) }
        : { ...editForm, people: Number(editForm.people) || 0 };
      await tableFor(entry._source).updateRow(entry.id, patch);
      setEditingKey(null);
      toast?.success("Cambios guardados");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  // -----------------------------------------------------------------
  // Creación — FAB con selector de tipo previo, luego formulario
  // específico reutilizado de Registro/Comisiones/Compañeros.
  // -----------------------------------------------------------------
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(null); // null | "ganado" | "comision" | "companeros"
  const [form, setForm] = useState(null);
  const fabVisible = useHideFabOnScroll();

  const [rateSheetOpen, setRateSheetOpen] = useState(false);
  const [rateForm, setRateForm] = useState(null);
  const [savingRate, setSavingRate] = useState(false);

  const emptyFormFor = (type) => {
    const base = { date: new Date().toISOString().slice(0, 10), school: defaultSchool, notes: "" };
    if (type === "companeros") return { ...base, activity: "", colleague_name: "", amount: "", currency: defaultCurrency };
    return { ...base, activity: defaultActivity, people: 1 };
  };
  const openCreate = (type) => {
    setCreating(type);
    setForm(emptyFormFor(type));
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

  const addEntry = async () => {
    if (disableSave) return;
    try {
      if (creating === "companeros") {
        await colleaguePayments.insertRow({ ...form, amount: Number(form.amount), status: defaultStatus });
        toast?.success("Ajuste añadido");
      } else {
        await tableFor(creating).insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
        toast?.success(creating === "ganado" ? "Curso añadido" : "Comisión añadida");
      }
      setCreating(null);
      setForm(null);
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const openRateSheet = () => {
    setRateForm({ school: form.school || defaultSchool, activity: form.activity || defaultActivity, payment_type: defaultPaymentType, currency: defaultCurrency, rate: "" });
    setRateSheetOpen(true);
  };
  const saveRate = async () => {
    if (!rateForm.school || !rateForm.activity || !rateForm.payment_type || !rateForm.rate) return;
    setSavingRate(true);
    try {
      await ratesTableFor(creating).insertRow({ ...rateForm, rate: Number(rateForm.rate) });
      setRateSheetOpen(false);
      toast?.success("Tarifa añadida");
    } catch {
      toast?.error("No se pudo guardar la tarifa. Inténtalo de nuevo.");
    } finally {
      setSavingRate(false);
    }
  };

  const creationTitle = { ganado: "Nuevo curso impartido", comision: "Nueva comisión", companeros: "Nuevo ajuste de curso" }[creating];

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
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtrar
        </button>
        {statusFilter === "pendientes" && pendingAll.length > 0 && (
          <button onClick={collectAllPending} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
            Confirmar todos
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Desde"><DatePicker value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} placeholder="Sin límite" /></Field>
            <Field label="Hasta"><DatePicker value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} placeholder="Sin límite" /></Field>
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
        {visibleList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            {statusFilter === "pendientes" && !hasActiveFilters && <PartyPopper size={26} className="text-gray-300" aria-hidden="true" />}
            <p className="text-sm text-gray-400">{emptyMessage(statusFilter, hasActiveFilters)}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleList.map((e) => {
              const key = `${e._source}-${e.id}`;
              if (editingKey === key) {
                if (e._source === "companeros") {
                  return (
                    <div key={key} className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-6">
                      <DatePicker value={editForm.date} onChange={(v) => setEditForm({ ...editForm, date: v })} />
                      <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                      <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activitiesForSchool(editForm.school)} />
                      <input value={editForm.colleague_name} onChange={(ev) => setEditForm({ ...editForm, colleague_name: ev.target.value })} className={inputCls} />
                      <MoneyInput value={editForm.amount} onChange={(v) => setEditForm({ ...editForm, amount: v })} />
                      <CurrencySearchSelect value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} currencyRows={currencies.rows} />
                      <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-5`} />
                      <EditActions onSave={() => saveEdit(e)} onCancel={() => setEditingKey(null)} />
                    </div>
                  );
                }
                return (
                  <div key={key} className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-5">
                    <div className="col-span-2 sm:col-span-1"><DatePicker value={editForm.date} onChange={(v) => setEditForm({ ...editForm, date: v })} /></div>
                    <Select value={editForm.school} onChange={(v) => setEditForm({ ...editForm, school: v })} options={schoolNames} />
                    <Select value={editForm.activity} onChange={(v) => setEditForm({ ...editForm, activity: v })} options={activityNames} />
                    <input type="number" value={editForm.people} onChange={(ev) => setEditForm({ ...editForm, people: ev.target.value })} className={inputCls} />
                    <input value={editForm.notes} onChange={(ev) => setEditForm({ ...editForm, notes: ev.target.value })} placeholder="Notas" className={`${inputCls} col-span-2 sm:col-span-4`} />
                    <EditActions onSave={() => saveEdit(e)} onCancel={() => setEditingKey(null)} />
                  </div>
                );
              }
              return (
                <EntryRow
                  key={key} entry={e} activityColor={activityColor} currencyRows={currencies.rows}
                  isPending={statusFilter === "pendientes"}
                  onToggle={() => toggleStatus(e)}
                  onEdit={() => startEdit(e)}
                  onDelete={() => tableFor(e._source).deleteRow(e.id)}
                />
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
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={() => { setCreating(null); setForm(null); }}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{creationTitle}</h3>
              <button onClick={() => { setCreating(null); setForm(null); }} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            {creating === "companeros" && (
              <p className="mb-3 text-xs text-gray-400">Importe positivo si te paga a ti; negativo si le pagas tú a él/ella.</p>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
              <Field label="Curso">
                <Select value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} options={creating === "companeros" ? activitiesForSchool(form.school) : activityNames} />
              </Field>

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
                  <Field label="Importe (puede ser negativo)">
                    <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="90 ó -30" />
                  </Field>
                  <Field label="Moneda">
                    <CurrencySearchSelect value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} currencyRows={currencies.rows} />
                  </Field>
                </>
              ) : (
                <Field label="Nº personas">
                  <input type="number" min={0} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} className={`${inputCls} w-full`} />
                </Field>
              )}

              <div className="col-span-2 sm:col-span-3">
                <Field label="Notas">
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} w-full`} placeholder="Opcional" />
                </Field>
              </div>
            </div>

            {creating !== "companeros" && (
              <div className="mt-3 rounded-md bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                {preview ? (
                  <span>
                    Tarifa: <b>{formatMoney(preview.rate, preview.currency, currencies.rows)}</b> ({preview.paymentType}) →
                    {" "}Total: <b style={{ color: TEAL }}>{formatMoney(preview.total, preview.currency, currencies.rows)}</b>
                  </span>
                ) : form.school && form.activity ? (
                  <span className="text-amber-600">
                    Sin tarifa{creating === "comision" ? " de comisión" : ""} configurada —{" "}
                    <button type="button" onClick={openRateSheet} className="font-semibold underline underline-offset-2">
                      añadir tarifa
                    </button>.
                  </span>
                ) : (
                  <span>Elige escuela y curso para ver el importe estimado.</span>
                )}
              </div>
            )}

            <button
              onClick={addEntry}
              disabled={disableSave}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={16} aria-hidden="true" /> Guardar
            </button>
          </div>
        </div>
      )}

      {rateSheetOpen && rateForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25" onClick={() => !savingRate && setRateSheetOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Nueva tarifa{creating === "comision" ? " de comisión" : ""}</h3>
              <button onClick={() => setRateSheetOpen(false)} disabled={savingRate} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field label="Escuela">
                <Select value={rateForm.school} onChange={(v) => setRateForm({ ...rateForm, school: v })} options={schoolNames} />
              </Field>
              <Field label="Curso">
                <Select value={rateForm.activity} onChange={(v) => setRateForm({ ...rateForm, activity: v })} options={activityNames} />
              </Field>
              <Field label="Moneda">
                <CurrencySearchSelect value={rateForm.currency} onChange={(v) => setRateForm({ ...rateForm, currency: v })} currencyRows={currencies.rows} />
              </Field>
              <Field label="Tarifa">
                <MoneyInput value={rateForm.rate} onChange={(v) => setRateForm({ ...rateForm, rate: v })} />
              </Field>
            </div>

            <button
              onClick={saveRate}
              disabled={savingRate || !rateForm.school || !rateForm.activity || !rateForm.payment_type || !rateForm.rate}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={16} aria-hidden="true" /> Guardar
            </button>
          </div>
        </div>
      )}

      {savingRate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80">
          <AppLoading iconName={appConfig?.rows?.[0]?.logo_icon} color={accentColor} label="Guardando tarifa" />
        </div>
      )}
    </div>
  );
}
