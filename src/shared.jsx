import React, { useState, useRef, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import * as Icons from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { ChevronDown, Check, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight, X, Loader2, Plus, MoreVertical, Pencil, HelpCircle } from "lucide-react";
// Desde colors.js, no desde "./App" — ver colors.js para el porqué (ciclo
// de imports con App.jsx, real y ya provocaba un ReferenceError en
// desarrollo, no solo una fragilidad teórica).
import { NAVY, TEAL, SUN, CORAL, GREEN } from "./colors";
import { DURATION, panelVariants, sheetVariants, listItemVariants, usePrefersReducedMotion } from "./motion";

export const inputCls = "min-h-11 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-offset-1";

// =================================================================
// Toasts — mensaje genérico de confirmación/error para cualquier
// operación de creación/edición/borrado. ToastProvider se monta una
// vez en App.jsx; cualquier componente llama a useToast().success(...)
// o .error(...).
// =================================================================
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // action opcional ({ label, onClick }) — para acciones rápidas de un
  // toque que conviene poder deshacer sin frenar el flujo (p. ej. marcar
  // un cobro por error): el toast en sí ya es la capa de seguridad, no un
  // diálogo de confirmación previo. Con acción, se queda más tiempo en
  // pantalla (da margen real a pulsar "Deshacer") que un toast normal.
  const push = useCallback((type, message, action) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 3000);
  }, []);
  const api = useMemo(() => ({
    success: (m, opts) => push("success", m, opts?.action),
    error: (m, opts) => push("error", m, opts?.action),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* top: la cabecera (App.jsx) mide ~4.75rem (padding + botones
          min-h-11) — un top-4 fijo caía dentro de ese espacio y el toast
          tapaba la cabecera. env(safe-area-inset-top) suma el notch, igual
          que la barra inferior ya hace con safe-area-inset-bottom. */}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ top: "calc(env(safe-area-inset-top) + 5rem)" }}
        aria-live="polite" aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg"
            style={{ backgroundColor: t.type === "success" ? GREEN : CORAL }}
          >
            {t.type === "success" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
            {t.message}
            {t.action && (
              <button
                type="button"
                onClick={() => { t.action.onClick(); setToasts((ts) => ts.filter((x) => x.id !== t.id)); }}
                className="-my-1 ml-1 rounded px-1.5 py-1 text-sm font-semibold underline underline-offset-2"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// =================================================================
// Loading genérico de la app — un icono que "se rellena" en bucle.
// El icono es configurable desde Configuración (tabla app_config),
// para poder cambiarlo por el logo oficial cuando esté listo, sin
// tocar código.
// =================================================================
export function AppLoading({ iconName = "Waves", color = TEAL, size = 40, label = "Cargando" }) {
  const Icon = Icons[iconName] || Icons.Waves;
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-label={label}>
      <div className="relative" style={{ width: size, height: size }}>
        <Icon size={size} style={{ color: "#E5E7EB" }} strokeWidth={2} aria-hidden="true" />
        <div className="absolute inset-0" style={{ animation: "oceanFill 1.6s ease-in-out infinite" }}>
          <Icon size={size} style={{ color }} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Hoja inferior con motion — extraída de MovementSheet.jsx (2026-08-30):
// esa hoja fue la primera en tener animación real (deslizar desde abajo)
// y arrastrar hacia abajo para cerrar, pero cada pantalla con su propia
// hoja de creación/edición (Tarifas, los 5 catálogos de Configuración)
// había quedado con un `<div>` fijo sin animar — la misma estructura
// visual, sin la interacción. Este componente es exactamente esa
// estructura, reutilizable: fondo + panel con `sheetVariants` (mismos
// tokens de motion de toda la app) + tirador que inicia el arrastre
// (dragListener={false} en el panel para no competir con el scroll o la
// selección de texto dentro del formulario). El contenido (cabecera,
// campos, botón de guardar) sigue siendo responsabilidad de quien la usa
// — este componente no impone estructura interna, solo el contenedor.
// className, opcional: para casos que necesitan un z-index más alto
// (p. ej. una hoja que puede abrirse sobre otra pantalla ya con overlays).
export function Sheet({ open, onClose, children, className = "", zIndexClass = "z-40" }) {
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();
  // Bloquea el scroll del fondo mientras la hoja está abierta — vive aquí,
  // no en cada pantalla que la usa, para que nadie pueda olvidarlo (antes
  // cada `<div className="fixed inset-0">` suelto dependía de que su
  // pantalla llamara aparte a useBodyScrollLock).
  useBodyScrollLock(open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-black/25`}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reducedMotion ? 0.01 : DURATION.sm } }}
          exit={{ opacity: 0, transition: { duration: reducedMotion ? 0.01 : DURATION.sm } }}
        >
          <motion.div
            className={`flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl ${className}`}
            variants={sheetVariants(reducedMotion)}
            initial="initial" animate="animate" exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose?.(); }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 touch-none cursor-grab justify-center py-2.5 active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="overflow-y-auto px-4 pt-1" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =================================================================
// Diálogo de confirmación centrado — sustituye al chip inline de
// "¿Eliminar? Sí/No", que quedaba poco visible. Con estado de carga
// mientras se ejecuta la acción.
// =================================================================
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, confirmLabel = "Eliminar", danger = true }) {
  useEscapeClose(open, loading ? () => {} : onCancel);
  useBodyScrollLock(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={loading ? undefined : onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="mb-1 text-sm font-semibold text-gray-800">{title}</h3>
        <p className="mb-4 text-sm text-gray-500">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="min-h-11 rounded-md border border-gray-200 px-3.5 text-sm font-medium text-gray-600 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium text-white disabled:opacity-70"
            style={{ backgroundColor: danger ? CORAL : TEAL }}
          >
            {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Botones "Guardar / Cancelar" unificados para cualquier formulario de
// edición en línea (antes cada pantalla tenía su propio estilo).
export function EditActions({ onSave, onCancel, saveLabel = "Guardar" }) {
  return (
    <div className="flex justify-end gap-2">
      <button onClick={onSave} className="flex min-h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-white" style={{ backgroundColor: TEAL }}>
        <Check size={13} aria-hidden="true" /> {saveLabel}
      </button>
      <button onClick={onCancel} className="min-h-9 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-500">
        Cancelar
      </button>
    </div>
  );
}

export function focusRingStyle() {
  return {};
}

// Fecha corta ES, o "—" si no hay valor — mismo formato en cualquier
// listado que muestre "cuándo se dio de alta esto" (Usuarios, Tarifas).
export function shortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString("es-ES") : "—";
}

export function formatMoney(amount, code, currencyRows) {
  const cur = currencyRows.find((c) => c.code === code);
  const symbol = cur?.symbol || code || "";
  const n = (amount || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n} ${symbol}`;
}

// Cifra monetaria "de verdad": tabular-nums para que las columnas de
// importes alineen, símbolo de moneda más apagado que la cifra — el
// patrón que comparten Stripe y Mercury en sus paneles financieros.
export function Money({ amount, code, currencyRows, className = "", muted = false, style = {} }) {
  const cur = currencyRows.find((c) => c.code === code);
  const symbol = cur?.symbol || code || "";
  const n = (amount || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <span className={`tabular-nums ${className}`} style={{ color: muted ? "#6B7280" : undefined, ...style }}>
      {n}
      <span className="ml-0.5 text-[0.82em] font-normal text-gray-400">{symbol}</span>
    </span>
  );
}

// `hint` es opcional: una aclaración corta que no merece ocupar espacio
// fijo en pantalla (p. ej. "importe positivo/negativo según quién paga a
// quién" en Ajuste de curso) — un icono "?" junto a la etiqueta la
// muestra/oculta al tocarlo, en vez de un párrafo siempre visible debajo
// del campo. type="button" + preventDefault: el icono vive dentro del
// mismo <label> que el campo (para que el campo siga teniendo nombre
// accesible por asociación); sin esto, el clic en el icono también
// activaría/enfocaría el campo por delegación del <label>.
export function Field({ label, hint, children }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="relative flex items-center gap-0.5 text-xs font-medium text-gray-500">
        {label}
        {hint && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowHint((v) => !v); }}
            aria-expanded={showHint}
            aria-label={showHint ? "Ocultar ayuda" : "Ayuda"}
            className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2 text-gray-400"
          >
            <HelpCircle size={13} aria-hidden="true" />
          </button>
        )}
        {/* Flotante (position:absolute), no dentro del flujo del documento —
            antes era un <span> normal debajo de la etiqueta, así que un
            hint largo (p. ej. "Importe" en Ajuste de compañeros,
            MovementSheet.jsx) estiraba esa celda de una fila en grid de 2
            columnas y descuadraba el formulario frente a la celda vecina.
            Bug real reportado por el usuario. */}
        {hint && showHint && (
          <span className="absolute left-0 top-full z-20 mt-1 w-56 max-w-[75vw] rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-normal italic normal-case text-gray-500 shadow-lg">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

// Botón de eliminar con confirmación en dos pasos, en el propio sitio
// (sin modal): primer clic pide confirmación, segundo clic (o "Sí")
// ejecuta. Se usa en cualquier "eliminar" de la app.
// Botón de eliminar — diálogo de confirmación centrado (no un chip
// inline, que quedaba poco visible), con loading mientras se ejecuta
// y un toast de confirmación al terminar.
// variant "icon" (por defecto, sin cambios): botón solo-icono, para usarlo
// suelto junto a otras acciones. variant "menuItem": fila de ancho completo
// con icono+texto y role="menuitem", para vivir dentro de un menú "⋯" (ver
// RowMenu en MiTrabajoTab.jsx) — mismo flujo de confirmación en ambos casos.
// optimistic=true: cierra el diálogo al instante en vez de esperar a
// onConfirm — lo necesita cualquier fila que quiera reproducir su propia
// animación de salida (el diálogo, al ser un modal a pantalla completa,
// tapa la lista mientras está abierto; si se queda abierto durante la
// animación, esta transcurre oculta detrás y nunca se llega a ver). El
// error, si lo hay, se sigue avisando por toast — solo cambia cuándo se
// cierra el diálogo, no el manejo de errores.
export function DeleteButton({ onConfirm, size = 15, label = "Eliminar", itemLabel = "este elemento", variant = "icon", optimistic = false }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    if (optimistic) {
      setOpen(false);
      try {
        await onConfirm();
        toast?.success("Eliminado correctamente");
      } catch (e) {
        toast?.error(e?.message || "No se pudo eliminar. Inténtalo de nuevo.");
      }
      return;
    }
    setLoading(true);
    try {
      await onConfirm();
      toast?.success("Eliminado correctamente");
      setOpen(false);
    } catch (e) {
      toast?.error(e?.message || "No se pudo eliminar. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {variant === "menuItem" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-red-500 hover:bg-red-50"
        >
          <Trash2 size={14} aria-hidden="true" /> {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded p-2 text-gray-300 hover:text-red-500"
        >
          <Trash2 size={size} aria-hidden="true" />
        </button>
      )}
      <ConfirmDialog
        open={open}
        title="¿Eliminar este registro?"
        message={`Vas a eliminar ${itemLabel}. Esta acción no se puede deshacer.`}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        loading={loading}
      />
    </>
  );
}

// Selector de fecha propio — el <input type="date"> nativo no se cerraba
// bien al elegir día y su diseño no se puede controlar entre navegadores.
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS_ES = ["L", "M", "X", "J", "V", "S", "D"];
const pad2 = (n) => String(n).padStart(2, "0");
function parseDateStr(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

export function DatePicker({ value, onChange, placeholder }) {
  const { open, setOpen, anchorRef, panelRef, pos } = useFloatingDropdown();
  const parsed = parseDateStr(value);
  const today = new Date();
  const [viewY, setViewY] = useState(parsed?.y ?? today.getFullYear());
  const [viewM, setViewM] = useState(parsed?.m ?? today.getMonth());

  useEffect(() => {
    if (!open) return;
    const p = parseDateStr(value);
    setViewY(p?.y ?? today.getFullYear());
    setViewM(p?.m ?? today.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstWeekday = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const display = parsed ? `${pad2(parsed.d)}/${pad2(parsed.m + 1)}/${parsed.y}` : (placeholder || "Fecha");

  const selectDay = (d) => {
    onChange(`${viewY}-${pad2(viewM + 1)}-${pad2(d)}`);
    setOpen(false);
  };
  const goPrev = () => { if (viewM === 0) { setViewM(11); setViewY(viewY - 1); } else setViewM(viewM - 1); };
  const goNext = () => { if (viewM === 11) { setViewM(0); setViewY(viewY + 1); } else setViewM(viewM + 1); };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={placeholder || "Elegir fecha"}
        className={`${inputCls} flex min-h-11 w-full items-center gap-1.5 text-left`}
      >
        <CalendarIcon size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
        <span className={parsed ? "text-gray-800" : "text-gray-400"}>{display}</span>
      </button>
      <FloatingPanel open={open} pos={pos} panelRef={panelRef} matchWidth={false} role="dialog" aria-label="Selector de fecha" className="w-64 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={goPrev} aria-label="Mes anterior" className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold text-gray-800">{MONTHS_ES[viewM]} {viewY}</span>
          <button type="button" onClick={goNext} aria-label="Mes siguiente" className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-400">
          {WEEKDAYS_ES.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            const isSelected = d && parsed && parsed.y === viewY && parsed.m === viewM && parsed.d === d;
            const isToday = d && viewY === today.getFullYear() && viewM === today.getMonth() && d === today.getDate();
            return (
              <button
                type="button"
                key={i}
                disabled={!d}
                aria-label={d ? `${d} de ${MONTHS_ES[viewM]}` : undefined}
                aria-selected={isSelected || undefined}
                onClick={() => d && selectDay(d)}
                className="flex h-9 items-center justify-center rounded-md text-xs transition-colors"
                style={isSelected ? { backgroundColor: TEAL, color: "white", fontWeight: 600 } : isToday ? { color: TEAL, fontWeight: 600 } : { color: d ? "#374151" : "transparent" }}
              >
                {d || ""}
              </button>
            );
          })}
        </div>
      </FloatingPanel>
    </>
  );
}

// Utilidades de fecha en formato YYYY-MM-DD (mismo formato que value en
// toda la app) — sin librería de fechas, para los accesos rápidos de
// DateRangePicker y las cabeceras de fecha de las listas.
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function startOfWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // semana empieza en lunes
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const startOfMonth = (dateStr) => dateStr.slice(0, 8) + "01";
const formatDMY = (dateStr) => {
  const p = parseDateStr(dateStr);
  return p ? `${pad2(p.d)}/${pad2(p.m + 1)}/${p.y}` : "";
};

const RANGE_PRESETS = [
  { label: "Hoy", range: () => ({ from: todayStr(), to: todayStr() }) },
  { label: "Esta semana", range: () => ({ from: startOfWeek(todayStr()), to: todayStr() }) },
  { label: "Este mes", range: () => ({ from: startOfMonth(todayStr()), to: todayStr() }) },
  { label: "Últimos 30 días", range: () => ({ from: addDays(todayStr(), -29), to: todayStr() }) },
];

// Selector de rango de fechas — un único calendario compartido para
// "Desde" y "Hasta" en vez de dos DatePicker independientes, con el
// periodo intermedio coloreado. Patrón tomado de los selectores de rango
// de apps de reserva (Airbnb, Google Flights), simplificado para este
// caso: aquí no hace falta bloquear fechas ni previsualizar dos meses a
// la vez.
//
// Tocar "Desde" inicia un rango: la fecha elegida fija el inicio y el
// propio selector seguirá abierto pidiendo el fin, con "OK" como salida
// para quedarse solo con el inicio (sin fin). Tocar "Hasta" es siempre
// independiente — una única fecha, se aplica y cierra al momento, sin
// pasar por "Desde" primero.
export function DateRangePicker({ from, to, onChange }) {
  const { open, setOpen, anchorRef, panelRef, pos } = useFloatingDropdown();
  const [mode, setMode] = useState("range"); // "range" (vía Desde) | "end-only" (vía Hasta)
  const [step, setStep] = useState("from"); // "from" | "to"

  const today = new Date();
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());

  useEffect(() => {
    if (!open) return;
    const ref = (step === "from" ? from : to || from) || todayStr();
    const p = parseDateStr(ref) || { y: today.getFullYear(), m: today.getMonth() };
    setViewY(p.y);
    setViewM(p.m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const openFrom = () => { setMode("range"); setStep("from"); setOpen(true); };
  const openTo = () => { setMode("end-only"); setStep("to"); setOpen(true); };

  const selectDay = (dateStr) => {
    if (step === "from") {
      onChange({ from: dateStr, to: "" });
      setStep("to");
      return;
    }
    if (mode === "range" && from && dateStr < from) {
      // Fecha de fin anterior al inicio — se reinicia el inicio en vez de
      // aceptar un rango invertido, y se sigue pidiendo un fin nuevo.
      onChange({ from: dateStr, to: "" });
      return;
    }
    onChange({ from, to: dateStr });
    setOpen(false);
  };

  const applyPreset = (preset) => { onChange(preset.range()); setOpen(false); };

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstWeekday = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const goPrev = () => { if (viewM === 0) { setViewM(11); setViewY(viewY - 1); } else setViewM(viewM - 1); };
  const goNext = () => { if (viewM === 11) { setViewM(0); setViewY(viewY + 1); } else setViewM(viewM + 1); };

  return (
    <div ref={anchorRef}>
      <div className={`${inputCls} flex min-h-11 w-full items-stretch gap-0 p-0`}>
        <button type="button" onClick={openFrom} aria-label="Fecha desde" className="flex flex-1 items-center gap-1.5 truncate px-2.5 text-left">
          <CalendarIcon size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
          <span className={`truncate text-sm ${from ? "text-gray-800" : "text-gray-400"}`}>{from ? formatDMY(from) : "Desde"}</span>
        </button>
        <span className="flex items-center text-gray-300" aria-hidden="true"><ArrowRight size={13} /></span>
        <button type="button" onClick={openTo} aria-label="Fecha hasta" className="flex flex-1 items-center truncate px-2.5 text-left">
          <span className={`truncate text-sm ${to ? "text-gray-800" : "text-gray-400"}`}>{to ? formatDMY(to) : "Hasta"}</span>
        </button>
      </div>
      <FloatingPanel open={open} pos={pos} panelRef={panelRef} matchWidth={false} role="dialog" aria-label="Selector de rango de fechas" className="w-72 max-w-[90vw] p-3">
        <p className="mb-2 text-xs font-medium text-gray-500">
          {step === "from" ? "Elige la fecha de inicio" : mode === "range" ? "Elige la fecha de fin" : "Elige una fecha"}
        </p>
        {mode === "range" && step === "from" && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.label} type="button" onClick={() => applyPreset(p)}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={goPrev} aria-label="Mes anterior" className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold text-gray-800">{MONTHS_ES[viewM]} {viewY}</span>
          <button type="button" onClick={goNext} aria-label="Mes siguiente" className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-400">
          {WEEKDAYS_ES.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dateStr = `${viewY}-${pad2(viewM + 1)}-${pad2(d)}`;
            const isEndpoint = dateStr === from || dateStr === to;
            const inRange = from && to && dateStr > from && dateStr < to;
            const isToday = dateStr === todayStr();
            return (
              <button
                type="button" key={i} onClick={() => selectDay(dateStr)}
                aria-label={`${d} de ${MONTHS_ES[viewM]}`}
                aria-selected={isEndpoint || undefined}
                className="flex h-9 items-center justify-center text-xs transition-colors"
                style={
                  isEndpoint ? { backgroundColor: TEAL, color: "white", fontWeight: 600, borderRadius: 9999 }
                  : inRange ? { backgroundColor: "#F0FDFA", color: "#0F766E" }
                  : isToday ? { color: TEAL, fontWeight: 600 }
                  : { color: "#374151" }
                }
              >
                {d}
              </button>
            );
          })}
        </div>
        {mode === "range" && step === "to" && (
          <button
            type="button" onClick={() => setOpen(false)}
            className="mt-2 w-full rounded-md py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            OK — solo desde {formatDMY(from)}
          </button>
        )}
      </FloatingPanel>
    </div>
  );
}

// Input de importe: mientras escribes, número plano y libre; al perder el
// foco, se muestra formateado con separador de miles (es-ES). Así el campo
// de Tarifa/Importe también respeta el separador, no solo la visualización.
// allowNegative: el teclado numérico que iOS Safari muestra para
// inputMode="decimal" NO tiene tecla de signo menos (limitación conocida
// de la plataforma, no de esta app) — escribir un negativo a mano es
// imposible ahí. Bug real reportado por el usuario en "Ajuste de
// compañeros" (MovementSheet.jsx), el único uso de MoneyInput donde un
// negativo tiene sentido (pagas tú al compañero). En vez de cambiar el
// comportamiento de TODOS los usos de MoneyInput (tarifas, importes de
// curso... siempre positivos), un botón +/- opcional junto al campo
// permite invertir el signo sin depender de esa tecla — el usuario
// sigue pudiendo teclear "-" a mano donde el teclado sí la tenga
// (Android, escritorio), esto es un camino alternativo, no un reemplazo.
export function MoneyInput({ value, onChange, className = "", placeholder, "aria-label": ariaLabel, allowNegative = false }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value != null && value !== "" ? String(value) : "");

  useEffect(() => {
    if (!editing) setRaw(value != null && value !== "" ? String(value) : "");
  }, [value, editing]);

  const display = editing
    ? raw
    : (value !== "" && value != null ? Number(value).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const isNegative = Number(value) < 0;

  const toggleSign = () => {
    const flipped = -Number(value || 0);
    setRaw(String(flipped));
    onChange(String(flipped));
  };

  const input = (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={() => { setEditing(true); setRaw(value != null && value !== "" ? String(value) : ""); }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d.,-]/g, "").replace(",", ".");
        setRaw(e.target.value);
        onChange(v);
      }}
      onBlur={() => setEditing(false)}
      className={`${inputCls} w-full ${allowNegative ? "pl-10" : ""} ${className}`}
    />
  );

  if (!allowNegative) return input;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleSign}
        aria-label={isNegative ? "Cambiar a positivo" : "Cambiar a negativo"}
        className="absolute inset-y-0 left-0 flex min-h-11 w-11 items-center justify-center text-base font-semibold text-gray-500"
      >
        {isNegative ? "−" : "+"}
      </button>
      {input}
    </div>
  );
}

export function MoneyLine({ totals, currencyRows }) {
  const entries = Object.entries(totals || {});
  if (entries.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="tabular-nums">
      {entries.map(([code, amt], i) => (
        <span key={code}>{i > 0 && " + "}{formatMoney(amt, code, currencyRows)}</span>
      ))}
    </span>
  );
}

const CAL_MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const CAL_WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const CAL_NEUTRAL = "#94A3B8";

// Vocabulario único de "tipo de movimiento" (Curso/Comisión/Ajuste),
// consumido por Home, Resumen y Mi trabajo — antes cada pantalla tenía su
// propia copia (Home y Resumen decían "Ganado"/"Compañeros", vocabulario
// previo a la unificación en Mi trabajo, ADR-0005, que ya usa "Curso"/
// "Ajuste"; encontrado como bug real de datos desincronizados, no solo de
// estilo, al auditar Home). Curso/Comisión tienen color de marca fijo
// (TEAL/SUN, igual que en MiTrabajoTab); Ajuste no tiene uno propio en
// ningún sitio de la app — su color depende del signo del importe (ver
// rowAccent en MiTrabajoTab) — así que aquí usa el neutro del propio
// calendario en vez de inventarle una identidad de marca que no tiene.
export const MOVEMENT_TYPE_META = {
  ganado: { label: "Curso", color: TEAL },
  comision: { label: "Comisión", color: SUN },
  companeros: { label: "Ajuste", color: CAL_NEUTRAL },
};

// Mini calendario del mes — el día con actividad lleva un anillo de color;
// al pulsarlo se abre el desglose de ese día. `dotColor` admite un color fijo
// o, para calendarios con varias escuelas mezcladas, una función
// `(dayEntries) => color` (p.ej. el color de la escuela que más ha
// facturado ese día). El desglose al pulsar un día tiene tres modos:
// agregado por actividad (por defecto), `detailed` (una fila por apunte,
// con comentario — para el calendario ya filtrado a una escuela) o
// `groupBySource` (agrupado por Ganado/Comisión/Compañeros y luego por
// actividad — cuando el filtro superior está en "Total").
// onCreateForDay(dateStr): opcional — cuando se pasa, un día SIN actividad
// deja de estar inerte y se puede tocar para iniciar la creación de un
// movimiento ese día (antes cualquier día vacío estaba deshabilitado sin
// excepción); un día CON actividad conserva su comportamiento de siempre
// (alternar el desglose) y además gana un botón "+" dentro del propio
// desglose, para añadir un segundo movimiento ese día sin perder la vista
// de lo que ya hay. Sin este prop (p. ej. en Resumen, un calendario de
// solo análisis) el comportamiento es exactamente el de antes.
export function MonthCalendar({ year, month, entries, dotColor, currencyRows, activityColor, legend, caption, detailed = false, groupBySource = false, sourceMeta, autoSelectFirstDay = false, showSchool = false, onCreateForDay }) {
  const reducedMotion = usePrefersReducedMotion();
  const [selectedDay, setSelectedDayState] = useState(null);
  const userSelectedRef = useRef(false);
  const setSelectedDay = (day) => {
    userSelectedRef.current = true;
    setSelectedDayState(day);
  };
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  // Comparación por string ("YYYY-MM"/día), nunca parseando e.date con
  // `new Date(...)` — bug real corregido 2026-08-30 (mismo que
  // SummaryTab.jsx, ver la nota junto a withinRange ahí): un string de
  // fecha sin hora se interpreta como medianoche UTC, y
  // getFullYear()/getMonth()/getDate() la leen de vuelta en la zona
  // horaria LOCAL del navegador — en cualquier huso negativo (América,
  // incluida cualquier escuela en México/Caribe), un movimiento del día 1
  // de un mes podía desaparecer del calendario entero (agrupado bajo el
  // mes/día anterior, que ni siquiera se pinta en esta cuadrícula).
  const byDay = useMemo(() => {
    const map = {};
    const monthPrefix = `${year}-${pad2(month + 1)}`;
    entries.forEach((e) => {
      if (e.date.slice(0, 7) !== monthPrefix) return;
      const day = Number(e.date.slice(8, 10));
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }, [entries, year, month]);

  // Si se pide auto-selección, marca el primer día con datos en cuanto
  // llegan (p. ej. tras la carga asíncrona de Supabase) — pero solo
  // mientras el usuario no haya tocado el calendario, para no pisar una
  // selección manual con un re-render posterior.
  useEffect(() => {
    if (!autoSelectFirstDay || userSelectedRef.current) return;
    const days = Object.keys(byDay).map(Number);
    if (days.length > 0) setSelectedDayState(Math.min(...days));
  }, [autoSelectFirstDay, byDay]);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayList = (d) => byDay[d] || [];
  const colorForDay = (list) => (typeof dotColor === "function" ? (dotColor(list) || CAL_NEUTRAL) : dotColor);

  // Total del día — todas las fuentes juntas (Curso + Comisión + Ajuste),
  // igual criterio que "Generado este mes" en Home (no "Ganado": incluye
  // también lo que te pagan/pagas por Ajustes de curso, no solo cursos
  // impartidos). Por moneda, nunca sumado entre monedas distintas (mismo
  // criterio de seguridad que el resto de la app) — MoneyLine ya sabe
  // pintar más de una si el día mezcla monedas.
  const dayTotals = (list) => {
    const totals = {};
    list.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.total; });
    return totals;
  };

  // Agregado por actividad (comportamiento por defecto); si showSchool
  // está activo, se agrupa por escuela+actividad para poder mostrar la
  // escuela junto a cada línea. `allColleague` marca si TODAS las entradas
  // agrupadas bajo esa clave son Ajustes de curso (colleague_payments no
  // tiene concepto de persona, siempre suma 0) — solo entonces se oculta
  // el badge de personas al renderizar; un grupo mixto (curso + ajuste con
  // la misma actividad) sigue mostrando el recuento real de personas del
  // curso.
  const flatBreakdown = (list) => {
    const map = {};
    list.forEach((e) => {
      const key = showSchool ? `${e.school}||${e.activity}` : e.activity;
      if (!map[key]) map[key] = { activity: e.activity, school: e.school, people: 0, totals: {}, allColleague: true };
      map[key].people += e.people || 0;
      map[key].allColleague = map[key].allColleague && e._source === "companeros";
      map[key].totals[e.currency] = (map[key].totals[e.currency] || 0) + e.total;
    });
    return Object.values(map);
  };

  // Agrupado por fuente (Ganado / Comisión / Compañeros) y luego por actividad.
  const sourceGroupedBreakdown = (list) => {
    const bySource = {};
    list.forEach((e) => { (bySource[e._source] ||= []).push(e); });
    return Object.entries(bySource).map(([key, sourceList]) => ({
      key,
      label: sourceMeta?.[key]?.label || key,
      color: sourceMeta?.[key]?.color || CAL_NEUTRAL,
      activities: flatBreakdown(sourceList),
    }));
  };

  // Igual que sourceGroupedBreakdown, pero sin agregar por actividad: cada
  // ocurrencia (fila real de worklog/comisiones/pagos) se lista aparte. Para
  // el detalle de un solo día interesa ver cada evento tal cual quedó
  // registrado (con su comentario, sus personas...), no un total agregado
  // por actividad como en las vistas de mes/periodo.
  const sourceGroupedEntries = (list) => {
    const bySource = {};
    list.forEach((e) => { (bySource[e._source] ||= []).push(e); });
    return Object.entries(bySource).map(([key, entries]) => ({
      key,
      label: sourceMeta?.[key]?.label || key,
      color: sourceMeta?.[key]?.color || CAL_NEUTRAL,
      entries,
    }));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Encima de los días de la semana, dentro de la propia tarjeta —
          antes vivía como un párrafo aparte debajo de todo el calendario
          (feedback 2026-08-30: se leía como una nota a pie de página, no
          como instrucción de uso del propio calendario). Opcional: solo
          Home lo pasa hoy, Resumen no lo necesita. */}
      {caption && (
        <p className="mb-2 text-center text-[11px] text-gray-400">{caption}</p>
      )}
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {CAL_WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const list = d ? dayList(d) : [];
          const hasActivity = d && list.length > 0;
          const isSelected = d === selectedDay;
          const color = hasActivity ? colorForDay(list) : null;
          const creatable = d && !hasActivity && !!onCreateForDay;
          const dateStr = d ? `${year}-${pad2(month + 1)}-${pad2(d)}` : null;
          // Día de hoy — marcado con un punto bajo el número (mismo lenguaje
          // que el punto de "periodo actual" en TrendBars, SummaryTab.jsx):
          // sin él, un día con actividad se veía exactamente igual sea o no
          // el de hoy, así que "hoy" se perdía entre el resto del mes en
          // cuanto tenía algún movimiento. Se calcula con el mismo
          // dateStr/todayStr que usa el resto de la app, no una comparación
          // de Date() propia — cero riesgo de desajuste de huso horario.
          const isToday = d && dateStr === todayStr();
          const handleClick = () => {
            if (hasActivity) setSelectedDay(isSelected ? null : d);
            else if (creatable) onCreateForDay(dateStr);
          };
          return (
            <button
              key={i}
              type="button"
              disabled={!d || (!hasActivity && !creatable)}
              onClick={handleClick}
              aria-label={
                creatable ? `Añadir movimiento el ${d} de ${CAL_MONTHS[month]}${isToday ? " (hoy)" : ""}`
                : isToday ? `${d} de ${CAL_MONTHS[month]} (hoy)`
                : undefined
              }
              className="flex h-11 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90"
            >
              {d && (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs"
                  style={hasActivity
                    ? { border: `2px solid ${color}`, color: isSelected ? "white" : "#374151", backgroundColor: isSelected ? color : "transparent", fontWeight: 600 }
                    : creatable
                    ? { border: "1.5px dashed #D1D5DB", color: "#9CA3AF" }
                    : { color: "#9CA3AF" }}
                >
                  {d}
                </span>
              )}
              {d && (
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: NAVY, opacity: isToday ? 1 : 0 }} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {legend && legend.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-gray-100 pt-3">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden="true" />
              {l.label}
            </span>
          ))}
        </div>
      )}

      {/* Panel de detalle del día — animado con panelVariants (src/motion.js):
          comunica la transición de vistazo (la cuadrícula) a detalle (el
          desglose), en vez de aparecer/desaparecer de golpe. Sin key por
          selectedDay a propósito: cambiar de un día a otro con el panel ya
          abierto actualiza el contenido en el sitio, sin volver a animar
          la entrada — solo abrir/cerrar el panel dispara la transición. */}
      <AnimatePresence initial={false}>
        {selectedDay && (
        <motion.div {...panelVariants(reducedMotion)} className="mt-3 overflow-hidden rounded-md bg-gray-50">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Día {selectedDay} de {CAL_MONTHS[month]}</span>
            <div className="flex items-center gap-1">
              {onCreateForDay && (
                <button
                  onClick={() => onCreateForDay(`${year}-${pad2(month + 1)}-${pad2(selectedDay)}`)}
                  className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2 text-gray-400 hover:text-gray-600"
                  aria-label={`Añadir movimiento el ${selectedDay} de ${CAL_MONTHS[month]}`}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              )}
              <button onClick={() => setSelectedDay(null)} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2 text-gray-400 hover:text-gray-600" aria-label="Cerrar detalle del día"><X size={14} /></button>
            </div>
          </div>

          {groupBySource && detailed && (
            // Total del día — respuesta directa a "¿cuánto ha dado este
            // día?" sin tener que sumar mentalmente el desglose de abajo
            // (feedback 2026-08-30). Solo aquí (el detalle "por entrada"
            // de Home): el resto de vistas del calendario (agregado por
            // actividad, tabla) no lo necesitan porque agregan menos
            // información en primer lugar.
            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="text-xs font-medium text-gray-500">Generado el día</span>
              <span className="font-semibold" style={{ color: "#1F2937" }}>
                <MoneyLine totals={dayTotals(dayList(selectedDay))} currencyRows={currencyRows} />
              </span>
            </div>
          )}

          {groupBySource && detailed ? (
            <div className="space-y-3">
              {sourceGroupedEntries(dayList(selectedDay)).map((group) => (
                <div key={group.key}>
                  <div className="mb-1.5 text-xs font-semibold" style={{ color: group.color }}>{group.label}</div>
                  <ul className="space-y-1.5 pl-2">
                    {group.entries.map((e) => {
                      const isColleague = group.key === "companeros";
                      return (
                        <li key={e.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            {isColleague ? (
                              <div className="truncate font-medium text-gray-700">{e.colleague_name}</div>
                            ) : (
                              <div className="truncate font-medium" style={{ color: activityColor(e.activity) }}>{e.activity}</div>
                            )}
                            <div className="truncate text-[11px] text-gray-400">
                              {e.school}
                              {isColleague && e.activity && ` · ${e.activity}`}
                              {e.notes && ` · ${e.notes}`}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 pt-0.5 tabular-nums text-gray-600">
                            {!isColleague && <span className="text-xs text-gray-400">{e.people || 0}p</span>}
                            <span
                              className="font-semibold"
                              style={isColleague ? { color: e.total >= 0 ? GREEN : CORAL } : { color: "#1F2937" }}
                            >
                              <Money amount={Math.abs(e.total)} code={e.currency} currencyRows={currencyRows} />
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : groupBySource ? (
            <div className="space-y-2.5">
              {sourceGroupedBreakdown(dayList(selectedDay)).map((group) => (
                <div key={group.key}>
                  <div className="mb-1 text-xs font-semibold" style={{ color: group.color }}>{group.label}</div>
                  <ul className="space-y-1">
                    {group.activities.map((a) => (
                      <li key={a.activity} className="flex items-center justify-between pl-2 text-sm">
                        <span style={{ color: activityColor(a.activity) }} className="font-medium">{a.activity}</span>
                        <span className="flex items-center gap-2 tabular-nums text-gray-600">
                          {group.key !== "companeros" && <span className="text-xs text-gray-400">{a.people}p</span>}
                          <MoneyLine totals={a.totals} currencyRows={currencyRows} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : detailed ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="pb-1.5 text-left font-medium">Curso</th>
                  <th className="pb-1.5 text-left font-medium">Comentario</th>
                  <th className="w-10 pb-1.5 text-center font-medium">Pers.</th>
                  <th className="pb-1.5 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dayList(selectedDay).map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5 pr-2 align-top font-medium" style={{ color: activityColor(e.activity) }}>{e.activity}</td>
                    <td className="py-1.5 pr-2 align-top text-gray-500">{e.notes || "—"}</td>
                    <td className="w-10 py-1.5 text-center align-top tabular-nums text-gray-500">{e.people || 0}</td>
                    <td className="py-1.5 text-right align-top font-semibold tabular-nums text-gray-800">
                      <Money amount={e.total} code={e.currency} currencyRows={currencyRows} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul className="space-y-1.5">
              {flatBreakdown(dayList(selectedDay)).map((a) => (
                <li key={showSchool ? `${a.school}-${a.activity}` : a.activity} className="flex items-center justify-between text-sm">
                  <span className="flex flex-col">
                    <span style={{ color: activityColor(a.activity) }} className="font-medium">{a.activity}</span>
                    {showSchool && <span className="text-[11px] text-gray-400">{a.school}</span>}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums text-gray-600">
                    {!a.allColleague && <span className="text-xs text-gray-400">{a.people}p</span>}
                    <MoneyLine totals={a.totals} currencyRows={currencyRows} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Exportado (además de usarse internamente en Select/DatePicker/etc.) para
// que cualquier desplegable/menú nuevo (p. ej. el menú "⋯" de una fila) lo
// reutilice en vez de reinventar el patrón — ver convención en CLAUDE.md.
// pointerdown, no mousedown: en iOS Safari/Chrome, los eventos "mouse"
// sintéticos para un toque no se disparan con la misma fiabilidad que en
// escritorio (retraso o ausencia según el elemento tocado) — pointerdown
// unifica ratón/táctil/lápiz y sí se dispara de forma consistente al tocar
// cualquier elemento, sea o no "clicable" en el sentido clásico de iOS.
export function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onOutside]);
  return ref;
}

// Para la cabecera global (App.jsx): si el usuario ha hecho scroll más allá
// de `threshold`, la cabecera deja de leerse como "parte del contenido" y
// pasa a leerse como "flotando encima" — se le añade una sombra sutil, el
// mismo indicio de profundidad que usan Linear/Notion/Stripe en sus
// cabeceras sticky. No se usa `passive:false` porque no llama a
// preventDefault — el listener nunca bloquea el scroll real.
export function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(() => (typeof window !== "undefined" ? window.scrollY > threshold : false));
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

// Cierra con Escape — navegación por teclado básica en todos los
// desplegables (Select, SearchSelect, DatePicker).
export function useEscapeClose(open, onClose) {
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
}

// =================================================================
// Bloqueo de scroll de fondo — cualquier overlay que deba comportarse
// como capa modal (hoja inferior, ConfirmDialog, cualquier panel
// flotante vía useFloatingDropdown) llama a este hook con `active`. Un
// simple `overflow:hidden` en <body> no basta en iOS Safari: el "rebote"
// de scroll de fondo se sigue colando por debajo de un overlay fixed. La
// técnica que sí funciona ahí es fijar el body en su posición actual
// (position:fixed + top negativo con el scroll guardado) y restaurar el
// scroll exacto al soltar.
//
// Contador global, no un booleano: puede haber más de un overlay abierto
// a la vez (p. ej. un Select dentro de una hoja inferior ya abierta) y
// cada uno debe poder pedir/soltar el bloqueo sin desbloquear de más
// mientras otro overlay lo siga necesitando — el body solo se libera de
// verdad cuando el último lock activo se suelta.
// =================================================================
let scrollLockCount = 0;
let savedScrollY = 0;
function acquireScrollLock() {
  if (scrollLockCount === 0) {
    savedScrollY = window.scrollY;
    const s = document.body.style;
    s.position = "fixed";
    s.top = `-${savedScrollY}px`;
    s.left = "0";
    s.right = "0";
    s.overflow = "hidden";
  }
  scrollLockCount += 1;
}
function releaseScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    const s = document.body.style;
    s.position = "";
    s.top = "";
    s.left = "";
    s.right = "";
    s.overflow = "";
    // jsdom (tests) no implementa scrollTo — no es un fallo real, solo
    // ruido en la consola de test si no se protege.
    try { window.scrollTo(0, savedScrollY); } catch { /* no-op */ }
  }
}
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    acquireScrollLock();
    return () => releaseScrollLock();
  }, [active]);
}

// =================================================================
// Panel flotante compartido — Select, MultiSelect, SearchSelect,
// DatePicker, DateRangePicker y RowMenu (MiTrabajoTab) usan todos este
// mismo mecanismo, en vez de que cada uno resuelva "abrir/cerrar/no
// recortarse" por su cuenta.
//
// Investigado a raíz de un bug real en móvil (iOS/Chrome Android): los
// selects "no cerraban bien" y el de Moneda "salía hacia arriba y
// descuadraba la vista". La causa NO era el cierre en sí — DatePicker,
// por ejemplo, ya llamaba a setOpen(false) al elegir un día — sino el
// POSICIONAMIENTO: el panel se calculaba una única vez al abrir
// (position:absolute + una medición de espacio hecha en ese instante) y
// nunca se recalculaba. En un campo de texto (el buscador de moneda,
// p. ej.), el teclado virtual aparece DESPUÉS de esa medición y encoge
// el viewport visible — el panel quedaba en la posición vieja, debajo
// del teclado o cortado, el toque no llegaba a la opción real y por
// fuera parecía "no se cierra". Además, al vivir dentro del
// `overflow-y-auto` de la hoja inferior, cualquier stacking context o
// recorte de un ancestro podía tapar el panel sin que hubiera forma de
// evitarlo con position:absolute.
//
// La solución: un portal a document.body (fuera de cualquier ancestro
// que recorte) con position:fixed, y la posición se recalcula en vivo
// mientras el panel está abierto — no solo al abrirlo — escuchando
// window.visualViewport (la API correcta para detectar el teclado
// virtual, a diferencia de window.innerHeight, que no cambia con él) y
// scroll/resize normales.
function useFloatingPosition(open, anchorRef) {
  const [pos, setPos] = useState(null);
  const recalc = useCallback(() => {
    const el = anchorRef.current;
    if (!open || !el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.visualViewport?.height || window.innerHeight;
    const vw = window.visualViewport?.width || window.innerWidth;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 280 && spaceAbove > 280;
    setPos({
      left: rect.left,
      right: vw - rect.right, // alineación por la derecha (p. ej. RowMenu) — evita salirse por el borde derecho en vez de calcular un ancho que no se conoce de antemano
      width: rect.width,
      maxWidth: Math.max(160, vw - rect.left - 8),
      top: openUp ? null : rect.bottom + 4,
      bottom: openUp ? vh - rect.top + 4 : null,
    });
  }, [open, anchorRef]);

  useEffect(() => { recalc(); }, [recalc]);
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    vv?.addEventListener("resize", recalc);
    vv?.addEventListener("scroll", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
      vv?.removeEventListener("resize", recalc);
      vv?.removeEventListener("scroll", recalc);
    };
  }, [open, recalc]);

  return pos;
}

// Hook único para cualquier desplegable/calendario/menú: sustituye a
// useClickOutside + useEscapeClose + (antes) useDropdownFlip llamados
// sueltos en cada componente. anchorRef va en el disparador (el botón o
// input que abre el panel); panelRef va en <FloatingPanel> — el clic
// fuera comprueba los dos, porque una vez portado a document.body el
// panel deja de ser un descendiente DOM del disparador.
export function useFloatingDropdown() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    // pointerdown, no mousedown: ver la nota en useClickOutside — en iOS
    // Safari/Chrome, el toque de un dedo no genera mousedown de forma
    // fiable en cualquier elemento, mientras que pointerdown sí.
    function handler(e) {
      if (anchorRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);
  useEscapeClose(open, () => setOpen(false));
  // Cualquier panel flotante (Select, SearchSelect, DatePicker, RowMenu...)
  // bloquea el scroll de fondo mientras está abierto — ver useBodyScrollLock.
  useBodyScrollLock(open);

  const pos = useFloatingPosition(open, anchorRef);
  return { open, setOpen, anchorRef, panelRef, pos };
}

// Presentacional — cada llamador aporta su propio className (radio,
// padding, max-h, min-w-max...); esto solo resuelve portal + posición +
// el chip visual común (borde/fondo/sombra). matchWidth=false para
// paneles con ancho propio (calendarios), true para los que deben
// coincidir con el ancho del campo (selects).
export function FloatingPanel({ open, pos, panelRef, matchWidth = true, align = "left", className = "", role, "aria-label": ariaLabel, "aria-multiselectable": ariaMultiselectable, children }) {
  if (!open || !pos) return null;
  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={ariaLabel}
      aria-multiselectable={ariaMultiselectable}
      className={`fixed z-50 overscroll-contain rounded-md border border-gray-200 bg-white shadow-lg ${className}`}
      style={{
        left: align === "left" ? pos.left : undefined,
        right: align === "right" ? pos.right : undefined,
        maxWidth: pos.maxWidth,
        width: matchWidth ? pos.width : undefined,
        top: pos.top ?? undefined,
        bottom: pos.bottom ?? undefined,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// Menú "⋯" para Editar/Eliminar — extraído de MiTrabajoTab.jsx (2026-08-29)
// para que Tarifas pueda usar exactamente el mismo patrón de acciones de
// fila (ver docs/ADR/0012-tarifas-coherencia-mi-trabajo.md): "que aprender
// una pantalla facilite usar las demás" aplica igual de bien aquí que al
// menú agrupado de Configuración/Ayuda. Antes se recortaba en la última
// fila de una lista con overflow-hidden (esquinas redondeadas) — con
// FloatingPanel (portal a document.body) deja de depender de los
// ancestros.
// deleteDisabled/deleteDisabledReason (opcional): para el caso raro de una
// fila que nunca debe poder eliminarse desde aquí (p.ej. el estado de pago
// predeterminado, que decide qué cuenta como "pendiente" en toda la app —
// ver protectDefaultFromDelete en ConfigTab.jsx). En vez de un segundo
// componente o de omitir el menú entero, "Eliminar" se muestra desactivado
// con el motivo en el título — sigue siendo obvio que la opción existe,
// solo que no está disponible para esta fila en concreto.
// Tarjeta plegable — profundidad bajo demanda, sin pantalla ni selector
// aparte (ver docs/ADR/0009-rediseno-resumen.md). Extraída de SummaryTab.jsx
// 2026-08-30 al ganar un segundo consumidor real (Ayuda: cada categoría es
// una tarjeta que se despliega en el sitio, en vez de navegar a una
// pantalla nueva — ver docs/ADR/0011, addendum "de índice a guía viva").
// `subtitle` es opcional (Resumen no lo usa; Ayuda sí, para la descripción
// corta de la categoría, visible antes de desplegar).
// `open`/`onToggle` (opcionales, controlado): sin pasarlos, la tarjeta
// gestiona su propio estado (Resumen, sin necesidad de coordinar varias
// tarjetas entre sí). Ayuda SÍ los pasa — necesita saber en todo momento
// cuál está abierta para persistirlo en sessionStorage (ver HelpTab.jsx,
// "recargar mantiene la pantalla actual") y para que el gesto de "atrás"
// sepa qué colapsar.
export function ExpandableCard({ title, subtitle, icon: Icon, iconColor = NAVY, defaultOpen = false, open: controlledOpen, onToggle, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const toggle = () => (isControlled ? onToggle?.(!open) : setInternalOpen((o) => !o));
  const reduced = usePrefersReducedMotion();
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-2 px-4 py-3 text-left"
      >
        {Icon && <Icon size={16} style={{ color: iconColor }} aria-hidden="true" className="shrink-0" />}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-gray-800">{title}</span>
          {subtitle && <span className="block truncate text-xs text-gray-400">{subtitle}</span>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-gray-400 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div {...listItemVariants(reduced)} className="border-t border-gray-100 px-4 py-3">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Botón flotante de creación — convención #3 (CLAUDE.md): mismo lenguaje
// visual (fixed bottom-24 right-4, 52×52, color de acento de la sección)
// en toda pantalla de lista con FAB+hoja (Mi trabajo, Tarifas,
// Configuración). Extraído 2026-08-30 tras encontrar el mismo bloque de
// clases/estilo copiado en cada una de ellas. `visible` es opcional
// (por defecto siempre visible/interactivo): Mi trabajo lo usa para
// ocultar el FAB mientras el usuario baja por la lista, pero ninguna
// otra pantalla necesita ese comportamiento hoy — con `visible` sin
// pasar, el componente se comporta exactamente igual que un botón fijo
// normal.
export function Fab({ onClick, label, icon: Icon = Plus, color, visible = true }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-90"
      style={{
        backgroundColor: color, width: 52, height: 52,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.7)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Icon size={24} aria-hidden="true" />
    </button>
  );
}

export function RowMenu({ onEdit, onDelete, itemLabel, deleteDisabled = false, deleteDisabledReason }) {
  const { open, setOpen, anchorRef, panelRef, pos } = useFloatingDropdown();
  // Cierra el menú "⋯" en el mismo instante en que se CONFIRMA el borrado
  // dentro del diálogo — no al pulsar "Eliminar" en el menú, porque eso
  // solo abre el diálogo (que vive dentro de DeleteButton, dentro de este
  // mismo FloatingPanel): cerrar el menú en ese momento desmontaría el
  // FloatingPanel y con él el propio diálogo antes de que llegara a
  // mostrarse. En el momento de onConfirm, el diálogo ya se está cerrando
  // por su cuenta (DeleteButton es optimistic), así que cerrar el menú a
  // la vez no se nota — y sin esto, se veía el menú suelto un instante
  // detrás una vez cerrado el diálogo.
  const handleDeleteConfirmed = () => {
    setOpen(false);
    return onDelete();
  };
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={open}
        className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center p-2 text-gray-300 hover:text-gray-600"
      >
        <MoreVertical size={17} aria-hidden="true" />
      </button>
      <FloatingPanel open={open} pos={pos} panelRef={panelRef} matchWidth={false} align="right" role="menu" className="w-36 overflow-hidden py-1">
        <button
          type="button" role="menuitem"
          onClick={() => { setOpen(false); onEdit(); }}
          className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <Pencil size={14} aria-hidden="true" /> Editar
        </button>
        {/* optimistic: el diálogo cierra al instante en vez de esperar al
            borrado real — así una animación de salida de la fila (si la
            pantalla que llama la tiene) se ve en la lista, no oculta
            detrás del modal. */}
        {deleteDisabled ? (
          <div
            role="menuitem"
            aria-disabled="true"
            title={deleteDisabledReason}
            className="flex min-h-11 w-full cursor-not-allowed items-center gap-2 px-3 text-left text-sm text-gray-300"
          >
            <Trash2 size={14} aria-hidden="true" /> Eliminar
          </div>
        ) : (
          <DeleteButton variant="menuItem" onConfirm={handleDeleteConfirmed} itemLabel={itemLabel} optimistic />
        )}
      </FloatingPanel>
    </>
  );
}

// Selector propio (no <select> nativo) — mismo aspecto en cualquier
// navegador, panel flotante limpio con estado activo marcado. El panel usa
// min-w-max para no truncar opciones largas en triggers estrechos, pero se
// limita con max-w (22rem/90vw) para que nunca se salga por encima de un
// campo vecino en un formulario de varias columnas — sin el límite, un
// panel ancho podía tapar el siguiente campo y el toque no llegaba a la
// opción real.
export function Select({ value, onChange, options, placeholder, label, className = "" }) {
  const { open, setOpen, anchorRef, panelRef, pos } = useFloatingDropdown();

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || placeholder}
        className={`${inputCls} flex min-h-11 w-full items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${value ? "text-gray-800" : "text-gray-400"}`}>{value || placeholder || "Selecciona..."}</span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <FloatingPanel open={open} pos={pos} panelRef={panelRef} role="listbox" className="max-h-60 min-w-max overflow-y-auto py-1">
        {placeholder && (
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(""); setOpen(false); }}
            className="block min-h-11 w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
          >
            {placeholder}
          </button>
        )}
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="option"
            aria-selected={value === o}
            onClick={() => { onChange(o); setOpen(false); }}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            style={value === o ? { color: TEAL, backgroundColor: "#F0FDFA" } : { color: "#374151" }}
          >
            {o}
            {value === o && <Check size={14} />}
          </button>
        ))}
      </FloatingPanel>
    </>
  );
}

// Selector de selección múltiple — para filtros de Actividad (puedes
// querer ver varias a la vez). value es un array; [] = "todas".
export function MultiSelect({ value = [], onChange, options, placeholder = "Todas" }) {
  const { open, setOpen, anchorRef, panelRef, pos } = useFloatingDropdown();

  const toggle = (o) => {
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  };
  const label = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} seleccionadas`;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={placeholder}
        className={`${inputCls} flex min-h-11 w-full items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${value.length ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <FloatingPanel open={open} pos={pos} panelRef={panelRef} role="listbox" aria-multiselectable="true" className="max-h-64 min-w-max overflow-y-auto py-1">
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="block min-h-9 w-full px-3 py-1.5 text-left text-xs font-medium text-gray-400 hover:bg-gray-50">
            Limpiar selección
          </button>
        )}
        {options.map((o) => {
          const checked = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={checked}
              onClick={() => toggle(o)}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                style={checked ? { backgroundColor: TEAL, borderColor: TEAL } : { borderColor: "#D1D5DB" }}
              >
                {checked && <Check size={12} className="text-white" aria-hidden="true" />}
              </span>
              <span className="text-gray-700">{o}</span>
            </button>
          );
        })}
      </FloatingPanel>
    </>
  );
}

// Sin acentos ni mayúsculas — en un teclado móvil casi nadie teclea "Dólar"
// con tilde, y sin esto una búsqueda tan natural como "dolar" no encontraba
// nada (bug real encontrado probando el flujo completo en el selector de
// moneda, no un caso hipotético).
function normalizeSearch(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Combobox con buscador — listas largas (Moneda: 144 opciones).
// options: [{ value, label }]
export function SearchSelect({ value, onChange, options, placeholder }) {
  const { open, setOpen, anchorRef, panelRef, pos } = useFloatingDropdown();
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => normalizeSearch(o.label).includes(normalizeSearch(query)))
    : options;

  return (
    <>
      <input
        ref={anchorRef}
        value={open ? query : (selected ? selected.label : "")}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder={placeholder || "Buscar..."}
        aria-label={placeholder || "Buscar"}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputCls} min-h-11 w-full`}
      />
      <FloatingPanel open={open} pos={pos} panelRef={panelRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
        {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>}
        {filtered.slice(0, 200).map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={value === o.value}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
              setQuery("");
              // Sin este blur explícito, el campo se queda con el foco
              // (el preventDefault de arriba existe para no perderlo
              // A MITAD de la selección) y un toque posterior sobre un
              // input ya enfocado no dispara onFocus — el buscador
              // parecía "no volver a abrirse". Bug real encontrado
              // probando el ciclo completo abrir→elegir→cerrar→reabrir.
              anchorRef.current?.blur();
            }}
            className="block min-h-11 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {o.label}
          </button>
        ))}
      </FloatingPanel>
    </>
  );
}

// Buscador de moneda listo para usar en cualquier formulario.
export function CurrencySearchSelect({ value, onChange, currencyRows, placeholder }) {
  const choices = currencyRows.map((c) => ({ value: c.code, label: `${c.code} — ${c.name} (${c.symbol})` }));
  return <SearchSelect value={value} onChange={onChange} options={choices} placeholder={placeholder || "Buscar moneda..."} />;
}

// Barra de filtros reutilizable: fecha desde/hasta, escuela, y actividad
// (opcional, selección múltiple). Grid fijo en móvil para que nunca
// desborde ni empuje scroll lateral — nada de flex-wrap suelto.
export function ListFilterBar({ filters, setFilters, schoolOptions, activityOptions }) {
  const hasFilters = filters.from || filters.to || filters.school || (filters.activity && filters.activity.length > 0);
  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Desde">
          <DatePicker value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} placeholder="Sin límite" />
        </Field>
        <Field label="Hasta">
          <DatePicker value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} placeholder="Sin límite" />
        </Field>
        <Field label="Escuela">
          <Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={schoolOptions} placeholder="Todas" />
        </Field>
        {activityOptions && (
          <Field label="Actividad">
            <MultiSelect value={filters.activity || []} onChange={(v) => setFilters({ ...filters, activity: v })} options={activityOptions} placeholder="Todas" />
          </Field>
        )}
      </div>
      {hasFilters && (
        <button onClick={() => setFilters({ ...filters, from: "", to: "", school: "", activity: [] })} className="mt-2 min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// Dado a un listado con `date`/`school`/`activity`, aplica un objeto de
// filtros { from, to, school, activity: [] } (todos opcionales).
export function applyListFilters(rows, filters) {
  return rows.filter((r) => {
    if (filters.from && r.date < filters.from) return false;
    if (filters.to && r.date > filters.to) return false;
    if (filters.school && r.school !== filters.school) return false;
    if (filters.activity && filters.activity.length > 0 && !filters.activity.includes(r.activity)) return false;
    return true;
  });
}

// Busca el color configurado de una fila por nombre, en cualquier tabla
// que tenga columna `color` (Actividades, Escuelas, Estados de pago...).
export function colorFor(rows, name, fallback = "#6B7280") {
  return rows.find((r) => r.name === name)?.color || fallback;
}

// Aclara un color hex mezclándolo con blanco — para fondos de pill.
export function lighten(hex, amount = 0.88) {
  const c = (hex || "#6B7280").replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const mix = (ch) => Math.round(ch + (255 - ch) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Cabecera "Actividad + Escuela" estandarizada en las filas de listado de
// Registro/Comisiones/Tarifas/Pagos: la actividad es el dato principal (su
// propio color + un punto de acento, para escanear la lista de un vistazo),
// la escuela queda debajo como contexto secundario, más pequeña y con su
// propio acento pero sin competir en peso — sustituye al antiguo
// "Escuela - Actividad" en una sola línea, donde ambos datos competían por
// la misma jerarquía visual.
export function EntryTitle({ school, activity, schoolColor, activityColor }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activityColor }} aria-hidden="true" />
        <span className="truncate text-[15px] font-semibold leading-tight" style={{ color: activityColor }}>{activity}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: schoolColor }} aria-hidden="true" />
        <span className="truncate text-[11.5px] font-medium text-gray-400">{school}</span>
      </div>
    </div>
  );
}

export function StatusPill({ status, paymentStatusRows }) {
  const color = colorFor(paymentStatusRows, status);
  return (
    <span className="rounded px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: lighten(color), color }}>
      {status}
    </span>
  );
}

export function StatusSwitch({ value, onChange, paymentStatusRows }) {
  const current = paymentStatusRows.find((s) => s.name === value);
  const color = current?.color || "#6B7280";
  const knobRight = current ? !current.is_default : false;
  const nextValue = oppositeStatus(value, paymentStatusRows);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={knobRight}
      aria-label={`Estado: ${value}. Pulsa para pasar a ${nextValue}`}
      onClick={() => onChange(nextValue)}
      title={`${value} — clic para pasar a "${nextValue}"`}
      className="relative -m-2 flex shrink-0 items-center justify-center p-2"
      style={{ minHeight: 36, minWidth: 52 }}
    >
      <span className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" style={{ backgroundColor: color }}>
        <span
          className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
          style={{ transform: knobRight ? "translateX(18px)" : "translateX(3px)" }}
        />
      </span>
    </button>
  );
}

export function oppositeStatus(currentName, paymentStatusRows) {
  const current = paymentStatusRows.find((s) => s.name === currentName);
  const others = paymentStatusRows.filter((s) => s.name !== currentName);
  if (others.length === 0) return currentName;
  const preferred = others.find((s) => s.is_default !== (current?.is_default ?? true));
  return (preferred || others[0]).name;
}

// "Pendiente" se determina hoy por is_default en payment_statuses — es el
// único campo con significado especial del catálogo, y hoy el catálogo es
// binario (Pending/Paid). Si en el futuro crece con más estados (Partial/
// Cancelled/Refunded, ya previsto en docs/ADR/0003-eliminar-payment-type.md),
// is_default dejará de bastar para saber qué cuenta como "todavía te deben
// esto" y hará falta un flag semántico propio en el catálogo — no antes,
// mientras el catálogo siga siendo binario.
export function isPendingStatus(statusName, paymentStatusRows) {
  return paymentStatusRows.find((s) => s.name === statusName)?.is_default ?? false;
}

export function ChipGroup({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o)}
            className="min-h-11 rounded border px-3 py-1.5 text-sm font-medium transition-colors"
            style={active
              ? { backgroundColor: "#F0FDFA", borderColor: TEAL, color: TEAL }
              : { backgroundColor: "white", borderColor: "#E5E7EB", color: "#4B5563" }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
