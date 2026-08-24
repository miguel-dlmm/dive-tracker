import React, { useState, useMemo } from "react";
import { Plus, Trash2, Star, Pencil, Check, X, Search } from "lucide-react";
import { NAVY, TEAL } from "./App";

const inputCls = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 transition-shadow";

/**
 * Tabla CRUD genérica reutilizada por las secciones de Configuración.
 *
 * table:        { rows, insertRow, updateRow, deleteRow, setDefault } — de useSupabaseTable
 * pkField:       'id' o 'code' (currencies usa 'code' como clave primaria)
 * fields:        [{ key, label, type: 'text'|'color', placeholder }]
 * hasDefault:    boolean — si true, muestra la estrella de "predeterminado"
 * searchable:    boolean — añade un buscador
 * pullDefaultOut:boolean — saca la fila predeterminada de la lista y la muestra
 *                 destacada arriba (pensado para Actividad y Moneda favoritas)
 */
function CrudTable({ title, table, pkField = "id", fields, hasDefault = false, searchable = false, pullDefaultOut = false, colorizeText = false }) {
  const emptyForm = Object.fromEntries(fields.map((f) => [
    f.key,
    f.type === "color" ? "#0E7C7B" : f.type === "boolean" ? (f.default ?? false) : "",
  ]));
  const [form, setForm] = useState(emptyForm);
  const [editingPk, setEditingPk] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [query, setQuery] = useState("");

  const defaultRow = pullDefaultOut ? table.rows.find((r) => r.is_default) : null;
  const colorField = colorizeText ? fields.find((f) => f.type === "color") : null;

  const filteredRows = useMemo(() => {
    let list = table.rows;
    if (pullDefaultOut) list = list.filter((r) => !r.is_default);
    if (searchable && query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => fields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(q)));
    }
    return list;
  }, [table.rows, query, searchable, pullDefaultOut, fields]);

  const addRow = async () => {
    if (fields.some((f) => f.required !== false && !form[f.key])) return;
    await table.insertRow(form);
    setForm(emptyForm);
  };

  const startEdit = (row) => {
    setEditingPk(row[pkField]);
    setEditForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key]])));
  };
  const saveEdit = async () => {
    await table.updateRow(editingPk, editForm);
    setEditingPk(null);
  };

  // Campo de color: siempre "en vivo" (guarda al cambiar), tanto si la fila
  // está en modo edición como si no — para eso no hace falta pulsar "editar".
  const renderColorField = (row, f) => (
    <input
      key={f.key}
      type="color"
      value={row[f.key]}
      onChange={(e) => table.updateRow(row[pkField], { [f.key]: e.target.value })}
      title="Cambiar color"
      className="h-7 w-9 shrink-0 cursor-pointer rounded border border-slate-200"
    />
  );

  // Campo booleano: checkbox también "en vivo".
  const renderBoolField = (row, f) => (
    <label key={f.key} className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500" title={f.label}>
      <input
        type="checkbox"
        checked={!!row[f.key]}
        onChange={(e) => table.updateRow(row[pkField], { [f.key]: e.target.checked })}
        className="h-4 w-4 cursor-pointer rounded border-slate-300"
      />
      {f.label}
    </label>
  );

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {searchable && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." className={`${inputCls} w-40 pl-8`} />
          </div>
        )}
      </div>

      {/* favorita, destacada y fuera de la lista */}
      {pullDefaultOut && defaultRow && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: "#FFF8E8" }}>
          <Star size={15} className="shrink-0 text-amber-500" fill="currentColor" />
          <span className="shrink-0 text-xs font-medium text-amber-700">Favorita</span>
          {fields.map((f) => (
            f.type === "color"
              ? renderColorField(defaultRow, f)
              : <span key={f.key} className="text-sm font-semibold" style={colorField ? { color: defaultRow[colorField.key] } : { color: "#334155" }}>{defaultRow[f.key]}</span>
          ))}
        </div>
      )}

      {/* formulario de alta */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {fields.map((f) => (
          f.type === "color" ? (
            <input key={f.key} type="color" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200" />
          ) : f.type === "boolean" ? (
            <label key={f.key} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="h-4 w-4 cursor-pointer rounded border-slate-300" />
              {f.label}
            </label>
          ) : (
            <input key={f.key} value={form[f.key]} placeholder={f.placeholder || f.label}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className={`${inputCls} flex-1`} onKeyDown={(e) => e.key === "Enter" && addRow()} />
          )
        ))}
        <button onClick={addRow} className="shrink-0 rounded-lg px-3 text-white" style={{ backgroundColor: TEAL }}><Plus size={16} /></button>
      </div>

      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {filteredRows.map((row) => {
          const pk = row[pkField];
          const isEditing = editingPk === pk;
          return (
            <li key={pk} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
              {fields.map((f) => {
                if (f.type === "color") return renderColorField(row, f);
                if (f.type === "boolean") return renderBoolField(row, f);
                if (isEditing) {
                  return (
                    <input key={f.key} value={editForm[f.key]} onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      className={`${inputCls} flex-1 py-1`} />
                  );
                }
                return (
                  <span key={f.key} className="flex-1 truncate" style={colorField ? { color: row[colorField.key] } : undefined}>
                    {row[f.key]}
                  </span>
                );
              })}
              {isEditing ? (
                <>
                  <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={15} /></button>
                  <button onClick={() => setEditingPk(null)} className="text-slate-400 hover:text-red-500"><X size={15} /></button>
                </>
              ) : (
                <>
                  {hasDefault && (
                    <button onClick={() => table.setDefault(pk)} title="Marcar como predeterminado"
                      className={row.is_default ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}>
                      <Star size={15} fill={row.is_default ? "currentColor" : "none"} />
                    </button>
                  )}
                  <button onClick={() => startEdit(row)} className="text-slate-300 hover:text-slate-600"><Pencil size={14} /></button>
                  <button onClick={() => table.deleteRow(pk)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </>
              )}
            </li>
          );
        })}
        {filteredRows.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados.</li>}
      </ul>
    </div>
  );
}

// schools / activities / currencies / paymentTypes / paymentStatuses: hooks de useSupabaseTable
export default function ConfigTab({ schools, activities, currencies, paymentTypes, paymentStatuses }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <CrudTable
          title="Escuelas"
          table={schools}
          hasDefault
          fields={[
            { key: "name", label: "Nombre" },
            { key: "color", label: "Color", type: "color", required: false },
          ]}
        />
        <CrudTable
          title="Tipos de pago"
          table={paymentTypes}
          hasDefault
          fields={[{ key: "name", label: "Nombre" }]}
        />
      </div>

      <CrudTable
        title="Estados de pago"
        table={paymentStatuses}
        hasDefault
        fields={[
          { key: "name", label: "Nombre" },
          { key: "color", label: "Color", type: "color", required: false },
        ]}
      />

      <CrudTable
        title="Actividades"
        table={activities}
        hasDefault
        searchable
        pullDefaultOut
        colorizeText
        fields={[
          { key: "name", label: "Nombre" },
          { key: "color", label: "Color", type: "color", required: false },
        ]}
      />

      <CrudTable
        title="Monedas"
        table={currencies}
        pkField="code"
        hasDefault
        searchable
        pullDefaultOut
        fields={[
          { key: "code", label: "Código (ej. EUR)" },
          { key: "name", label: "Nombre" },
          { key: "symbol", label: "Símbolo" },
        ]}
      />
    </div>
  );
}
