import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { Plus, Minus, X, Check, Loader2, StickyNote, GraduationCap, Handshake, Users } from "lucide-react";
import { TEAL, SUN, CORAL, GREEN } from "./App";
import {
  inputCls, formatMoney, Field, Select, MoneyInput,
  DatePicker, lighten, useToast, useBodyScrollLock, todayStr,
} from "./shared";
import { DURATION, sheetVariants, usePrefersReducedMotion } from "./motion";
import { computeRateTotal, buildActivityEntries } from "./rateCalc";

// Única fuente de verdad para crear/editar un movimiento (Curso/Comisión/
// Ajuste) — extraído de MiTrabajoTab.jsx para que Home pueda abrir esta
// misma experiencia sin cambiar de pestaña antes de guardar (ver
// docs/ADR/0005, addendum). Mi trabajo (FAB, editar fila) y Home (acceso
// rápido, calendario) montan este mismo componente; el comportamiento no
// cambia según quién lo abra, solo qué pasa después de guardar (eso lo
// decide `onSaved`, no este componente).
const CREATE_TYPES = [
  { key: "ganado", label: "Curso impartido", icon: GraduationCap }, // formación/certificación — más reconocible a tamaño pequeño que un icono náutico genérico
  { key: "comision", label: "Comisión", icon: Handshake },
  { key: "companeros", label: "Ajuste de curso", icon: Users },
];

// Mismo cálculo que rowAccent en MiTrabajoTab, pero pensado para el
// formulario (icono de la cabecera + pestaña activa) — Curso/Comisión
// tienen color de marca fijo; Ajuste sigue el signo del importe en vivo,
// igual que en la lista una vez guardado.
function formAccentColor(creating, amount) {
  if (creating === "ganado") return TEAL;
  if (creating === "comision") return SUN;
  return Number(amount) < 0 ? CORAL : GREEN;
}

// Moneda favorita — preferencia personal del instructor, no dato de
// negocio (no vive en Supabase a propósito, ver docs/ADR/0007). Solo
// lectura aquí desde 2026-08-30: escribirla (antes, el botón "Usar X como
// favorita" en el propio formulario) queda para la futura pantalla
// "Configuración → Moneda favorita" (ver docs/BACKLOG.md) — misma clave de
// localStorage, mismo formato, nada que migrar cuando se construya.
const favoriteCurrencyKey = (userId) => `oceanpulse:favoriteCurrency:${userId || "anon"}`;
function getFavoriteCurrency(userId) {
  try { return localStorage.getItem(favoriteCurrencyKey(userId)); } catch { return null; }
}

// Notas se expande sola con el contenido — sin WYSIWYG, pero más cómoda en
// móvil que un input de una sola línea para un par de frases.
function useAutoResizeTextarea(value) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

// request: null | { type: "ganado"|"comision"|"companeros", editingEntry: entry|null, date?: string }
//   - type + editingEntry: null → crear ese tipo, con fecha de hoy salvo que se pase `date`.
//   - editingEntry presente → editar esa entrada (type se ignora, se usa entry._source).
// onClose(): el usuario cierra sin guardar (X, backdrop, arrastrar).
// onSaved(entry, { isNew }): se dispara SOLO tras un guardado real con éxito, justo antes de cerrar.
// accentColor: color del botón "Guardar" y del stepper de tarifa — el mismo
// sea cual sea el punto de entrada (FAB de Mi trabajo, acceso rápido de
// Home, calendario de Home): todos crean/editan el mismo tipo de dato.
export default function MovementSheet({
  request, onClose, onSaved,
  schools, activities, paymentTypes, paymentStatuses, currencies, rates, commissionRates,
  worklog, comisiones, colleaguePayments,
  accentColor = TEAL, userId = null,
}) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  // WORKAROUND TEMPORAL (ver docs/BACKLOG.md y docs/ADR/0003): una cuenta
  // nueva nace con payment_types vacío — sin este fallback, el alta de
  // tarifa al vuelo queda bloqueada.
  const defaultPaymentType = paymentTypes.rows.find((t) => t.name === "Per Person")?.name || paymentTypes.rows.find((t) => t.is_default)?.name || paymentTypes.rows[0]?.name || "Per Person";

  // 2026-08-30: la moneda deja de elegirse por movimiento — pasa a ser una
  // configuración global (ver docs/BACKLOG.md, "Configuración → Moneda
  // favorita"). Se sigue leyendo la misma preferencia de siempre
  // (localStorage, ADR-0007), pero ya no hay ningún campo en este
  // formulario desde el que cambiarla — esa gestión explícita queda para
  // la futura pantalla de Configuración, todavía sin implementar.
  const favoriteCurrency = getFavoriteCurrency(userId);

  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const activityEntries = useMemo(
    () => buildActivityEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  const tableFor = (source) => (source === "ganado" ? worklog : source === "comision" ? comisiones : colleaguePayments);
  const ratesTableFor = (type) => (type === "ganado" ? rates : commissionRates);
  const rateFor = (type, school, activity) => ratesTableFor(type).rows.find((r) => r.school === school && r.activity === activity);
  // Mismo criterio que RatesTab.jsx (lastCurrencyFor) para la tarifa
  // creada al vuelo desde aquí (feedback 2026-08-30: moneda visible, no
  // editable, en el propio formulario de tarifa) — la de la tarifa más
  // reciente de esa escuela en cualquiera de las dos tablas, o el default
  // de la app si la escuela no tiene ninguna todavía.
  const lastCurrencyFor = (school) => {
    const matches = [...rates.rows, ...commissionRates.rows].filter((r) => r.school === school);
    if (matches.length === 0) return defaultCurrency;
    return [...matches].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0].currency;
  };

  const activitiesForSchool = (school) => {
    const names = [...new Set(rates.rows.filter((r) => r.school === school).map((r) => r.activity))];
    return names.length > 0 ? names : activityNames;
  };
  const colleagueSuggestions = (school) =>
    [...new Set(colleaguePayments.rows.filter((p) => p.school === school).map((p) => p.colleague_name))];
  // Smart default de Curso: la actividad que impartiste más recientemente
  // en esa escuela, no un valor global fijo.
  const lastActivityFor = (type, school) => {
    const source = type === "ganado" ? "ganado" : "comision";
    const matches = activityEntries.filter((e) => e._source === source && e.school === school);
    if (matches.length === 0) return null;
    return matches.reduce((latest, e) => (e.date > latest.date ? e : latest)).activity;
  };

  const [creating, setCreating] = useState(null); // null | "ganado" | "comision" | "companeros"
  const [form, setForm] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const notesRef = useAutoResizeTextarea(form?.notes);
  useBodyScrollLock(!!creating);
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();

  const [addingRate, setAddingRate] = useState(false);
  const [rateForm, setRateForm] = useState(null);
  const [savingRate, setSavingRate] = useState(false);

  // date por defecto a todayStr() (fecha local), no new Date().toISOString()
  // (fecha UTC) — con la hora local cerca de medianoche, toISOString()
  // podía mostrar el día de ayer/mañana según la zona horaria. "date ||
  // todayStr()" en el cuerpo, no un valor por defecto en la firma: un
  // valor por defecto de parámetro solo sustituye `undefined`, y la fecha
  // de `request` puede llegar como `null` explícito cuando no viene de un
  // día del calendario.
  const emptyFormFor = (type, school = defaultSchool, date) => {
    const base = { date: date || todayStr(), school, notes: "" };
    if (type === "companeros") return { ...base, activity: "", colleague_name: "", amount: "", currency: favoriteCurrency || defaultCurrency };
    return { ...base, activity: lastActivityFor(type, school) || defaultActivity, people: 1 };
  };

  // Inicializa el formulario cada vez que el padre pide abrir la hoja
  // (request cambia de identidad) — nunca en cada render, para no borrar
  // lo que el usuario ya ha escrito mientras la hoja sigue abierta con la
  // misma request. El padre es responsable de pasar un `request` estable
  // (guardado en su propio estado, no un objeto literal recreado en cada
  // render) para que esto funcione.
  useEffect(() => {
    if (!request) return;
    if (request.editingEntry) {
      const entry = request.editingEntry;
      setEditingEntry(entry);
      setCreating(entry._source);
      setForm(entry._source === "companeros"
        ? { date: entry.date, school: entry.school, activity: entry.activity, colleague_name: entry.colleague_name, amount: entry.amount, currency: entry.currency, notes: entry.notes || "" }
        : { date: entry.date, school: entry.school, activity: entry.activity, people: entry.people, notes: entry.notes || "" });
    } else {
      setEditingEntry(null);
      setCreating(request.type);
      setForm(emptyFormFor(request.type, defaultSchool, request.date));
    }
    setNotesOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Cambiar de tipo dentro de la propia hoja (selector Curso/Comisión/
  // Ajuste arriba) — sustituye a la hoja intermedia "¿Qué quieres
  // añadir?": el FAB entra directo al caso más frecuente (Curso
  // impartido, ver docs/ADR/0005) y este selector cubre el resto sin una
  // transición de hoja aparte. Solo aplica al crear. Conserva form.date en
  // vez de recalcular la de hoy — si se llegó con un día concreto (del
  // calendario), cambiar de tipo no debe perder esa fecha.
  const switchType = (type) => {
    setCreating(type);
    setForm(emptyFormFor(type, form?.school, form?.date));
    setAddingRate(false);
    setRateForm(null);
    setNotesOpen(false);
  };

  const closeSheet = () => {
    setCreating(null); setForm(null); setEditingEntry(null);
    setAddingRate(false); setRateForm(null); setNotesOpen(false);
    onClose?.();
  };

  const preview = useMemo(() => {
    if (!form || (creating !== "ganado" && creating !== "comision")) return null;
    const r = rateFor(creating, form.school, form.activity);
    if (!r) return null;
    return { rate: r.rate, total: computeRateTotal(r, form.people), currency: r.currency };
  }, [creating, form, rates.rows, commissionRates.rows]);

  const disableSaveCurso = creating !== "companeros" && (!form?.date || !form?.school || !form?.activity || !preview);
  const disableSaveAjuste = creating === "companeros" && (!form?.date || !form?.school || !form?.activity || !form?.colleague_name || form?.amount === "");
  const disableSave = creating === "companeros" ? disableSaveAjuste : disableSaveCurso;

  const saveEntry = async () => {
    if (disableSave) return;
    try {
      let saved;
      if (editingEntry) {
        const patch = creating === "companeros"
          ? { ...form, amount: Number(form.amount) }
          : { ...form, people: Number(form.people) || 0 };
        saved = await tableFor(creating).updateRow(editingEntry.id, patch);
        toast?.success("Cambios guardados");
      } else if (creating === "companeros") {
        saved = await colleaguePayments.insertRow({ ...form, amount: Number(form.amount), status: defaultStatus });
        toast?.success("Ajuste añadido");
      } else {
        saved = await tableFor(creating).insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
        toast?.success(creating === "ganado" ? "Curso añadido" : "Comisión añadida");
      }
      // onSaved se dispara con la operación ya confirmada por Supabase —
      // nunca de forma optimista — para que quien decide navegar tras
      // guardar (ver Home en App.jsx) lo haga solo cuando el movimiento
      // ya existe de verdad y se puede encontrar en Mi trabajo.
      onSaved?.(saved, { isNew: !editingEntry });
      closeSheet();
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const openInlineRate = () => {
    setRateForm({ school: form.school, activity: form.activity, payment_type: defaultPaymentType, currency: lastCurrencyFor(form.school), rate: "" });
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
  // Mismo icono que su fila en el selector de tipo — conecta visualmente
  // el tipo elegido con el formulario.
  const SheetIcon = CREATE_TYPES.find((t) => t.key === creating)?.icon;
  const typeColor = formAccentColor(creating, form?.amount);

  return (
    <AnimatePresence>
      {creating && form && (
        <motion.div
          key="movement-sheet-backdrop"
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/25"
          onClick={closeSheet}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reducedMotion ? 0.01 : DURATION.sm } }}
          exit={{ opacity: 0, transition: { duration: reducedMotion ? 0.01 : DURATION.sm } }}
        >
          <motion.div
            className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl"
            variants={sheetVariants(reducedMotion)}
            initial="initial" animate="animate" exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) closeSheet(); }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tirador — único punto que inicia el arrastre (dragListener={false}
                arriba), para no competir con el scroll o la selección normal
                dentro del formulario. Arrastrar hacia abajo para cerrar es el
                gesto nativo esperado en una hoja inferior de iOS. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 touch-none cursor-grab justify-center py-2.5 active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>
            <div
              className="overflow-y-auto px-4 pt-1"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {SheetIcon && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: lighten(typeColor) }}>
                      <SheetIcon size={14} style={{ color: typeColor }} aria-hidden="true" />
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-gray-800">{sheetTitle}</h3>
                </div>
                <button onClick={closeSheet} className="text-gray-400" aria-label="Cerrar"><X size={19} /></button>
              </div>

              {/* Selector de tipo integrado. Solo al crear: el tipo de una
                  entrada ya guardada no se cambia desde aquí (movería la
                  fila entre tablas distintas, fuera de alcance). */}
              {!editingEntry && (
                <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Tipo de movimiento">
                  {CREATE_TYPES.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={creating === key}
                      onClick={() => switchType(key)}
                      className="flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors"
                      style={creating === key ? { backgroundColor: "white", color: typeColor, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "#6B7280" }}
                    >
                      <Icon size={14} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Curso primero: es el único campo sin buen valor por
                  defecto — Fecha ya es hoy, Escuela ya trae la tuya de
                  Configuración (o la última que usaste en esa escuela, ver
                  lastActivityFor), Nº personas ya es 1. Notas al final,
                  colapsada, por ser el campo de menor frecuencia de uso. */}
              <div className="space-y-2.5">
                <Field label="Curso">
                  <Select
                    value={form.activity}
                    onChange={(v) => setForm({ ...form, activity: v })}
                    options={creating === "companeros" ? activitiesForSchool(form.school) : activityNames}
                    className="min-h-14 text-base"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Escuela">
                    <Select
                      value={form.school}
                      onChange={(v) => setForm(creating === "companeros" ? { ...form, school: v, activity: "" } : { ...form, school: v })}
                      options={schoolNames}
                    />
                  </Field>
                  <Field label="Fecha">
                    <DatePicker value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
                  </Field>
                </div>

                <div className="space-y-2.5 border-t border-gray-100 pt-2.5">
                  {creating === "companeros" ? (
                    // 2026-08-30: Moneda deja de ser un campo del formulario
                    // (ver docs/BACKLOG.md, "Configuración → Moneda
                    // favorita") — form.currency sigue existiendo (se sigue
                    // guardando en el registro), pero ahora se resuelve solo
                    // (favorita guardada, o la de la app por defecto) y se
                    // muestra como referencia junto a "Importe", no como un
                    // desplegable aparte. Al quitar esa columna, Instructor
                    // relacionado e Importe pasan a compartir fila — ninguno
                    // de los dos necesita el ancho completo, y así el
                    // formulario ocupa una fila menos en móvil.
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Instructor relacionado">
                        <input
                          list="movement-sheet-colleague-names"
                          value={form.colleague_name}
                          onChange={(e) => setForm({ ...form, colleague_name: e.target.value })}
                          className={`${inputCls} w-full`}
                          placeholder="Ana, Marc..."
                        />
                        <datalist id="movement-sheet-colleague-names">
                          {colleagueSuggestions(form.school).map((n) => <option key={n} value={n} />)}
                        </datalist>
                      </Field>
                      <Field
                        label={`Importe · ${form.currency}`}
                        hint="Positivo si te paga a ti; negativo si le pagas tú a él/ella"
                      >
                        <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="90 ó -30" />
                      </Field>
                    </div>
                  ) : (
                    // Nº personas y Total emparejados: el total es
                    // consecuencia directa de las personas, así que vive
                    // justo al lado del dato que lo modifica.
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Nº personas">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, people: String(Math.max(0, Number(form.people || 0) - 1)) })}
                            aria-label="Menos personas"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 active:bg-gray-50"
                          >
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <input
                            type="number" min={0} value={form.people}
                            onChange={(e) => setForm({ ...form, people: e.target.value })}
                            className={`${inputCls} w-full text-center`}
                          />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, people: String(Number(form.people || 0) + 1) })}
                            aria-label="Más personas"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 active:bg-gray-50"
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </Field>
                      <Field label="Total">
                        {preview ? (
                          <div className="flex h-11 flex-col justify-center rounded-md px-2.5" style={{ backgroundColor: "#F0FDFA" }}>
                            <span className="text-sm font-semibold tabular-nums" style={{ color: TEAL }}>
                              {formatMoney(preview.total, preview.currency, currencies.rows)}
                            </span>
                            <span className="text-[10px] leading-tight text-gray-400">
                              {formatMoney(preview.rate, preview.currency, currencies.rows)} / persona
                            </span>
                          </div>
                        ) : form.school && form.activity ? (
                          <button
                            type="button" onClick={openInlineRate}
                            aria-label="Añadir tarifa"
                            className="flex h-11 w-full items-center justify-center rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 text-xs font-semibold text-amber-700"
                          >
                            Añadir tarifa
                          </button>
                        ) : (
                          <div className="flex h-11 items-center rounded-md bg-gray-50 px-2.5 text-sm text-gray-300">—</div>
                        )}
                      </Field>
                    </div>
                  )}

                  {/* Edición de tarifa en línea, no una tarjeta aparte: un
                      borde de acento a la izquierda en vez de caja con
                      sombra — se siente como una expansión del propio
                      formulario. */}
                  {creating !== "companeros" && addingRate && (
                    <div className="space-y-2 border-l-2 pl-3" style={{ borderColor: "#FCD34D" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Tarifa — {form.school} · {form.activity}</span>
                        <button type="button" onClick={() => { setAddingRate(false); setRateForm(null); }} disabled={savingRate} aria-label="Cancelar" className="text-gray-400">
                          <X size={13} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Moneda visible, no editable (feedback 2026-08-30,
                            mismo criterio que RatesTab.jsx) — derivada sola
                            de la tarifa más reciente de esta escuela, nunca
                            un desplegable que haya que tocar aquí. */}
                        <span className="shrink-0 text-xs font-medium text-gray-400">{rateForm.currency}</span>
                        <MoneyInput value={rateForm.rate} onChange={(v) => setRateForm({ ...rateForm, rate: v })} placeholder="Tarifa" aria-label={`Tarifa · ${rateForm.currency}`} className="flex-1" />
                        <button
                          type="button"
                          onClick={saveRate}
                          disabled={savingRate || !rateForm.rate}
                          aria-label={savingRate ? "Guardando tarifa" : "Guardar tarifa"}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ backgroundColor: accentColor }}
                        >
                          {savingRate ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {notesOpen || form.notes ? (
                  <Field label="Notas">
                    <textarea
                      ref={notesRef}
                      value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2} placeholder="Opcional" autoFocus={notesOpen && !form.notes}
                      className="w-full resize-none overflow-hidden rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-offset-1"
                      style={{ minHeight: "4.5rem" }}
                    />
                  </Field>
                ) : (
                  <div className="flex justify-center">
                    <button
                      type="button" onClick={() => setNotesOpen(true)}
                      className="flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
                    >
                      <StickyNote size={13} aria-hidden="true" /> Añadir nota
                    </button>
                  </div>
                )}
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
