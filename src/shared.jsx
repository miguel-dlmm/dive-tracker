import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Trash2 } from "lucide-react";
import { TEAL, CORAL } from "./App";

export const inputCls = "rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400";

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
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-gray-500">Desde</span>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={`${inputCls} w-full py-1.5`} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-gray-500">Hasta</span>
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={`${inputCls} w-full py-1.5`} />
        </label>
        <Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={schoolOptions} placeholder="Escuela" />
        {activityOptions && (
          <Select value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={activityOptions} placeholder="Actividad" />
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
