import React, { useState, useRef, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import * as Icons from "lucide-react";
import { ChevronDown, Check, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { TEAL, CORAL, GREEN } from "./App";

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
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  const api = useMemo(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg"
            style={{ backgroundColor: t.type === "success" ? GREEN : CORAL }}
          >
            {t.type === "success" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
            {t.message}
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
// Diálogo de confirmación centrado — sustituye al chip inline de
// "¿Eliminar? Sí/No", que quedaba poco visible. Con estado de carga
// mientras se ejecuta la acción.
// =================================================================
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, confirmLabel = "Eliminar", danger = true }) {
  useEscapeClose(open, loading ? () => {} : onCancel);
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

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-gray-500">{label}</span>
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
export function DeleteButton({ onConfirm, size = 15, label = "Eliminar", itemLabel = "este elemento" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="-m-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded p-2 text-gray-300 hover:text-red-500"
      >
        <Trash2 size={size} aria-hidden="true" />
      </button>
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
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  useEscapeClose(open, () => setOpen(false));
  const openUp = useDropdownFlip(open, ref);
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
    <div className="relative" ref={ref}>
      <button
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
      {open && (
        <div role="dialog" aria-label="Selector de fecha" className={`absolute z-30 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${openUp ? "bottom-full mb-1" : "mt-1"}`}>
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
        </div>
      )}
    </div>
  );
}

// Input de importe: mientras escribes, número plano y libre; al perder el
// foco, se muestra formateado con separador de miles (es-ES). Así el campo
// de Tarifa/Importe también respeta el separador, no solo la visualización.
export function MoneyInput({ value, onChange, className = "", placeholder }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(value != null && value !== "" ? String(value) : "");

  useEffect(() => {
    if (!editing) setRaw(value != null && value !== "" ? String(value) : "");
  }, [value, editing]);

  const display = editing
    ? raw
    : (value !== "" && value != null ? Number(value).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onFocus={() => { setEditing(true); setRaw(value != null && value !== "" ? String(value) : ""); }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d.,-]/g, "").replace(",", ".");
        setRaw(e.target.value);
        onChange(v);
      }}
      onBlur={() => setEditing(false)}
      className={`${inputCls} w-full ${className}`}
    />
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

// Mini calendario del mes — el día con actividad lleva un anillo de color;
// al pulsarlo se abre el desglose de ese día. `dotColor` admite un color fijo
// o, para calendarios con varias escuelas mezcladas, una función
// `(dayEntries) => color` (p.ej. el color de la escuela que más ha
// facturado ese día). El desglose al pulsar un día tiene tres modos:
// agregado por actividad (por defecto), `detailed` (una fila por apunte,
// con comentario — para el calendario ya filtrado a una escuela) o
// `groupBySource` (agrupado por Ganado/Comisión/Compañeros y luego por
// actividad — cuando el filtro superior está en "Total").
export function MonthCalendar({ year, month, entries, dotColor, currencyRows, activityColor, legend, detailed = false, groupBySource = false, sourceMeta, autoSelectFirstDay = false, showSchool = false }) {
  const [selectedDay, setSelectedDayState] = useState(null);
  const userSelectedRef = useRef(false);
  const setSelectedDay = (day) => {
    userSelectedRef.current = true;
    setSelectedDayState(day);
  };
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;

  const byDay = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const d = new Date(e.date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
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

  // Agregado por actividad (comportamiento por defecto); si showSchool
  // está activo, se agrupa por escuela+actividad para poder mostrar la
  // escuela junto a cada línea.
  const flatBreakdown = (list) => {
    const map = {};
    list.forEach((e) => {
      const key = showSchool ? `${e.school}||${e.activity}` : e.activity;
      if (!map[key]) map[key] = { activity: e.activity, school: e.school, people: 0, totals: {} };
      map[key].people += e.people || 0;
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
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
        {CAL_WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const list = d ? dayList(d) : [];
          const hasActivity = d && list.length > 0;
          const isSelected = d === selectedDay;
          const color = hasActivity ? colorForDay(list) : null;
          return (
            <button
              key={i}
              type="button"
              disabled={!d || !hasActivity}
              onClick={() => setSelectedDay(isSelected ? null : d)}
              className="flex h-9 items-center justify-center"
            >
              {d && (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                  style={hasActivity
                    ? { border: `2px solid ${color}`, color: isSelected ? "white" : "#374151", backgroundColor: isSelected ? color : "transparent", fontWeight: 600 }
                    : { color: "#9CA3AF" }}
                >
                  {d}
                </span>
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

      {selectedDay && (
        <div className="mt-3 rounded-md bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Día {selectedDay} de {CAL_MONTHS[month]}</span>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar detalle del día"><X size={14} /></button>
          </div>

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
                          <span className="text-xs text-gray-400">{a.people}p</span>
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
                  <th className="pb-1.5 text-left font-medium">Actividad</th>
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
                    <span className="text-xs text-gray-400">{a.people}p</span>
                    <MoneyLine totals={a.totals} currencyRows={currencyRows} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

// Cierra con Escape — navegación por teclado básica en todos los
// desplegables (Select, SearchSelect, DatePicker).
function useEscapeClose(open, onClose) {
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
}

// Decide si el panel de un desplegable debe abrirse hacia arriba: si el
// disparador está en la mitad inferior de la pantalla y no hay ~260px
// libres debajo, se abre hacia arriba para no quedar cortado ni obligar
// a hacer scroll — la causa más habitual de que un selector "se sienta
// raro" en móvil.
//
// El espacio disponible se mide contra el ANCESTRO SCROLLEABLE más
// cercano (p. ej. la hoja `overflow-y-auto` de "Nueva entrada"), no
// contra la ventana entera: un campo cerca de la parte de arriba de esa
// hoja tiene mucho espacio debajo (dentro de la ventana) pero casi
// ninguno arriba (dentro de la propia hoja) — medir contra la ventana
// hacía que el panel se abriera hacia arriba y quedara cortado por el
// borde superior de la hoja, mostrando solo 1-2 opciones.
function nearestScrollParent(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

function useDropdownFlip(open, triggerRef) {
  const [openUp, setOpenUp] = useState(false);
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollParent = nearestScrollParent(triggerRef.current);
      const bounds = scrollParent ? scrollParent.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const spaceBelow = bounds.bottom - rect.bottom;
      const spaceAbove = rect.top - bounds.top;
      setOpenUp(spaceBelow < 280 && spaceAbove > 280);
    }
  }, [open, triggerRef]);
  return openUp;
}

// Selector propio (no <select> nativo) — mismo aspecto en cualquier
// navegador, panel flotante limpio con estado activo marcado.
export function Select({ value, onChange, options, placeholder, label }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  useEscapeClose(open, () => setOpen(false));
  const openUp = useDropdownFlip(open, ref);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || placeholder}
        className={`${inputCls} flex min-h-11 w-full items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${value ? "text-gray-800" : "text-gray-400"}`}>{value || placeholder || "Selecciona..."}</span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute z-20 max-h-60 w-full min-w-max overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg ${openUp ? "bottom-full mb-1" : "mt-1"}`}
        >
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
        </div>
      )}
    </div>
  );
}

// Selector de selección múltiple — para filtros de Actividad (puedes
// querer ver varias a la vez). value es un array; [] = "todas".
export function MultiSelect({ value = [], onChange, options, placeholder = "Todas" }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  useEscapeClose(open, () => setOpen(false));
  const openUp = useDropdownFlip(open, ref);

  const toggle = (o) => {
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  };
  const label = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} seleccionadas`;

  return (
    <div className="relative" ref={ref}>
      <button
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
      {open && (
        <div role="listbox" aria-multiselectable="true" className={`absolute z-20 max-h-64 w-full min-w-max overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg ${openUp ? "bottom-full mb-1" : "mt-1"}`}>
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
        </div>
      )}
    </div>
  );
}

// Combobox con buscador — listas largas (Moneda: 144 opciones).
// options: [{ value, label }]
export function SearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useClickOutside(() => setOpen(false));
  useEscapeClose(open, () => setOpen(false));
  const openUp = useDropdownFlip(open, ref);
  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <input
        value={open ? query : (selected ? selected.label : "")}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder={placeholder || "Buscar..."}
        aria-label={placeholder || "Buscar"}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputCls} min-h-11 w-full`}
      />
      {open && (
        <div role="listbox" className={`absolute z-20 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg ${openUp ? "bottom-full mb-1" : "mt-1"}`}>
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>}
          {filtered.slice(0, 200).map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              className="block min-h-11 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
