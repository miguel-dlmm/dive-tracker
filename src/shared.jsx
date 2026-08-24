import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { TEAL, CORAL } from "./App";

export const inputCls = "rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400";

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
export function DeleteButton({ onConfirm, size = 15 }) {
  const [confirming, setConfirming] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!confirming) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setConfirming(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [confirming]);

  if (confirming) {
    return (
      <span ref={ref} className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1 py-0.5">
        <span className="px-0.5 text-[10px] font-medium text-gray-400">¿Eliminar?</span>
        <button
          onClick={() => { onConfirm(); setConfirming(false); }}
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
          style={{ backgroundColor: CORAL }}
        >
          Sí
        </button>
        <button onClick={() => setConfirming(false)} className="rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-400 hover:text-gray-600">
          No
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} className="shrink-0 text-gray-300 hover:text-red-500">
      <Trash2 size={size} />
    </button>
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
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${inputCls} flex w-full items-center gap-1.5 text-left`}>
        <CalendarIcon size={14} className="shrink-0 text-gray-400" />
        <span className={parsed ? "text-gray-800" : "text-gray-400"}>{display}</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={goPrev} className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-gray-800">{MONTHS_ES[viewM]} {viewY}</span>
            <button type="button" onClick={goNext} className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><ChevronRight size={16} /></button>
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
                  onClick={() => d && selectDay(d)}
                  className="flex h-8 items-center justify-center rounded-md text-xs transition-colors"
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

// Mini calendario del mes — el día con actividad lleva un anillo del color
// de la fuente activa; al pulsarlo se abre el desglose por actividad de ese
// día (nº personas + importe). Ancho limitado a propósito: en pantallas
// grandes (escritorio) una cuadrícula de 7 columnas a ancho completo deja
// los días sueltos y muy separados — se ve mejor compacta y centrada.
export function MonthCalendar({ year, month, entries, dotColor, currencyRows, activityColor }) {
  const [selectedDay, setSelectedDay] = useState(null);
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

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayBreakdown = (d) => {
    const list = byDay[d] || [];
    const map = {};
    list.forEach((e) => {
      if (!map[e.activity]) map[e.activity] = { people: 0, totals: {} };
      map[e.activity].people += e.people || 0;
      map[e.activity].totals[e.currency] = (map[e.activity].totals[e.currency] || 0) + e.total;
    });
    return Object.entries(map).map(([activity, v]) => ({ activity, ...v }));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mx-auto max-w-[280px]">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
          {CAL_WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const hasActivity = d && byDay[d];
            const isSelected = d === selectedDay;
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
                      ? { border: `2px solid ${dotColor}`, color: isSelected ? "white" : "#374151", backgroundColor: isSelected ? dotColor : "transparent", fontWeight: 600 }
                      : { color: "#9CA3AF" }}
                  >
                    {d}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="mx-auto mt-3 max-w-[280px] rounded-md bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Día {selectedDay} de {CAL_MONTHS[month]}</span>
            <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <ul className="space-y-1.5">
            {dayBreakdown(selectedDay).map((a) => (
              <li key={a.activity} className="flex items-center justify-between text-sm">
                <span style={{ color: activityColor(a.activity) }} className="font-medium">{a.activity}</span>
                <span className="flex items-center gap-2 tabular-nums text-gray-600">
                  <span className="text-xs text-gray-400">{a.people}p</span>
                  <MoneyLine totals={a.totals} currencyRows={currencyRows} />
                </span>
              </li>
            ))}
          </ul>
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

// Selector propio (no <select> nativo) — mismo aspecto en cualquier
// navegador, panel flotante limpio con estado activo marcado.
export function Select({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${value ? "text-gray-800" : "text-gray-400"}`}>{value || placeholder || "Selecciona..."}</span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full min-w-max overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
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

// Combobox con buscador — listas largas (Moneda: 144 opciones).
// options: [{ value, label }]
export function SearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useClickOutside(() => setOpen(false));
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
        className={`${inputCls} w-full`}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>}
          {filtered.slice(0, 200).map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
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
// (opcional). Grid fijo en móvil para que nunca desborde ni empuje scroll
// lateral — nada de flex-wrap suelto.
export function ListFilterBar({ filters, setFilters, schoolOptions, activityOptions }) {
  const hasFilters = filters.from || filters.to || filters.school || filters.activity;
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
            <Select value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={activityOptions} placeholder="Todas" />
          </Field>
        )}
      </div>
      {hasFilters && (
        <button onClick={() => setFilters({ ...filters, from: "", to: "", school: "", activity: "" })} className="mt-2 text-xs font-medium text-gray-400 hover:text-gray-600">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// Dado a un listado con `date`/`school`/`activity`, aplica un objeto de
// filtros { from, to, school, activity } (todos opcionales).
export function applyListFilters(rows, filters) {
  return rows.filter((r) => {
    if (filters.from && r.date < filters.from) return false;
    if (filters.to && r.date > filters.to) return false;
    if (filters.school && r.school !== filters.school) return false;
    if (filters.activity && r.activity !== filters.activity) return false;
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
  return (
    <button
      type="button"
      onClick={() => onChange(oppositeStatus(value, paymentStatusRows))}
      title={`${value} — clic para pasar a "${oppositeStatus(value, paymentStatusRows)}"`}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
      style={{ backgroundColor: color }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: knobRight ? "translateX(18px)" : "translateX(3px)" }}
      />
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
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className="rounded border px-3 py-1.5 text-sm font-medium transition-colors"
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
