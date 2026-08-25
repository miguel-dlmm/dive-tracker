import React, { useState, useMemo } from "react";
import { Plus, Star, Pencil, Search } from "lucide-react";
import { NAVY, TEAL } from "./App";
import { DeleteButton, EditActions, useToast, AppLoading } from "./shared";

const inputCls = "min-h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400";

/**
 * Tabla CRUD genérica reutilizada por las secciones de Configuración.
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
  const toast = useToast();

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
    try {
      await table.insertRow(form);
      setForm(emptyForm);
      toast?.success("Añadido correctamente");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const startEdit = (row) => {
    setEditingPk(row[pkField]);
    setEditForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key]])));
  };
  const saveEdit = async () => {
    try {
      await table.updateRow(editingPk, editForm);
      setEditingPk(null);
      toast?.success("Cambios guardados");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const updateLive = async (pk, patch) => {
    try {
      await table.updateRow(pk, patch);
    } catch {
      toast?.error("No se pudo guardar el cambio.");
    }
  };

  const renderColorField = (row, f) => (
    <input
      key={f.key}
      type="color"
      value={row[f.key]}
      onChange={(e) => updateLive(row[pkField], { [f.key]: e.target.value })}
      title="Cambiar color"
      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-gray-200"
    />
  );

  const renderBoolField = (row, f) => (
    <label key={f.key} className="flex min-h-11 shrink-0 items-center gap-1.5 text-xs text-gray-500" title={f.label}>
      <input
        type="checkbox"
        checked={!!row[f.key]}
        onChange={(e) => updateLive(row[pkField], { [f.key]: e.target.checked })}
        className="h-4 w-4 cursor-pointer rounded border-gray-300"
      />
      {f.label}
    </label>
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {searchable && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-3.5 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." className={`${inputCls} w-36 pl-8`} />
          </div>
        )}
      </div>

      {pullDefaultOut && defaultRow && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2">
          <Star size={14} className="shrink-0 text-amber-500" fill="currentColor" aria-hidden="true" />
          <span className="shrink-0 text-xs font-medium text-amber-700">Favorita</span>
          {fields.map((f) => (
            f.type === "color"
              ? renderColorField(defaultRow, f)
              : <span key={f.key} className="text-sm font-semibold" style={colorField ? { color: defaultRow[colorField.key] } : { color: "#334155" }}>{defaultRow[f.key]}</span>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {fields.map((f) => (
          f.type === "color" ? (
            <input key={f.key} type="color" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="h-11 w-12 cursor-pointer rounded-md border border-gray-200" />
          ) : f.type === "boolean" ? (
            <label key={f.key} className="flex min-h-11 items-center gap-1.5 text-sm text-gray-600">
              <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                className="h-4 w-4 cursor-pointer rounded border-gray-300" />
              {f.label}
            </label>
          ) : (
            <input key={f.key} value={form[f.key]} placeholder={f.placeholder || f.label}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className={`${inputCls} flex-1`} onKeyDown={(e) => e.key === "Enter" && addRow()} />
          )
        ))}
        <button onClick={addRow} aria-label="Añadir" className="flex min-h-11 shrink-0 items-center justify-center rounded-md px-3 text-white" style={{ backgroundColor: TEAL }}><Plus size={16} /></button>
      </div>

      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {filteredRows.map((row) => {
          const pk = row[pkField];
          const isEditing = editingPk === pk;
          if (isEditing) {
            return (
              <li key={pk} className="space-y-2 rounded-md bg-gray-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {fields.map((f) => {
                    if (f.type === "color") return renderColorField(row, f);
                    if (f.type === "boolean") return renderBoolField(row, f);
                    return (
                      <input key={f.key} value={editForm[f.key]} onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                        className={`${inputCls} flex-1`} />
                    );
                  })}
                </div>
                <EditActions onSave={saveEdit} onCancel={() => setEditingPk(null)} />
              </li>
            );
          }
          return (
            <li key={pk} className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm">
              {fields.map((f) => {
                if (f.type === "color") return renderColorField(row, f);
                if (f.type === "boolean") return renderBoolField(row, f);
                return (
                  <span key={f.key} className="flex-1 truncate" style={colorField ? { color: row[colorField.key] } : undefined}>
                    {row[f.key]}
                  </span>
                );
              })}
              {hasDefault && (
                <button onClick={() => table.setDefault(pk)} title="Marcar como predeterminado" aria-label="Marcar como predeterminado"
                  className={`-m-2 flex min-h-11 min-w-11 items-center justify-center rounded p-2 ${row.is_default ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}>
                  <Star size={15} fill={row.is_default ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              )}
              <button onClick={() => startEdit(row)} aria-label="Editar" className="-m-2 flex min-h-11 min-w-11 items-center justify-center rounded p-2 text-gray-300 hover:text-gray-600"><Pencil size={14} aria-hidden="true" /></button>
              <DeleteButton onConfirm={() => table.deleteRow(pk)} size={14} itemLabel={row.name ? `"${row.name}"` : "este elemento"} />
            </li>
          );
        })}
        {filteredRows.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados.</li>}
      </ul>
    </div>
  );
}

// Bloque dedicado para los colores de sección — filas fijas (una por
// área de la app), sin alta/baja, solo editar color en vivo.
function SectionColors({ navSections }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Colores de sección</h3>
      <p className="mb-3 text-xs text-gray-400">Usados en la barra de navegación y en los botones de crear registro de cada área.</p>
      <ul className="space-y-1">
        {navSections.rows.map((s) => (
          <li key={s.key} className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-sm">
            <input
              type="color"
              value={s.color}
              onChange={(e) => navSections.updateRow(s.key, { color: e.target.value })}
              className="h-9 w-11 shrink-0 cursor-pointer rounded border border-gray-200"
            />
            <span className="flex-1" style={{ color: s.color }}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ajustes generales — hoy solo el icono del loading (configurable para
// poder cambiarlo por el logo oficial cuando esté listo, sin tocar código).
const ICON_OPTIONS = ["Waves", "Anchor", "Sailboat", "LifeBuoy", "Fish", "Compass"];

function GeneralSettings({ appConfig }) {
  const row = appConfig.rows[0];
  const toast = useToast();
  if (!row) return null;

  const setIcon = async (name) => {
    try {
      await appConfig.updateRow(true, { logo_icon: name });
      toast?.success("Icono actualizado");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-800">Icono de carga</h3>
      <p className="mb-3 text-xs text-gray-400">Se usa en la animación de "cargando" de toda la app. Cuando tengáis el logo oficial de Ocean Flow, avisadme y lo sustituyo por el icono real en vez de esta lista.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {ICON_OPTIONS.map((name) => (
          <button
            key={name}
            onClick={() => setIcon(name)}
            className="flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium"
            style={row.logo_icon === name ? { borderColor: TEAL, backgroundColor: "#F0FDFA", color: TEAL } : { borderColor: "#E5E7EB", color: "#4B5563" }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-md bg-gray-50 p-4">
        <AppLoading iconName={row.logo_icon} color={TEAL} size={32} />
        <span className="text-xs text-gray-400">Vista previa</span>
      </div>
    </div>
  );
}

const SECTIONS = ["Escuelas", "Actividades", "Tipos de pago", "Estados de pago", "Monedas", "Secciones", "Ajustes"];

// schools / activities / currencies / paymentTypes / paymentStatuses / navSections / appConfig: hooks de useSupabaseTable
export default function ConfigTab({ schools, activities, currencies, paymentTypes, paymentStatuses, navSections, appConfig }) {
  const [section, setSection] = useState("Escuelas");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="min-h-11 rounded-md px-3 text-xs font-medium transition-colors"
            style={section === s ? { backgroundColor: TEAL, color: "white" } : { color: "#6B7280" }}
          >
            {s}
          </button>
        ))}
      </div>

      {section === "Escuelas" && (
        <CrudTable title="Escuelas" table={schools} hasDefault
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {section === "Actividades" && (
        <CrudTable title="Actividades" table={activities} hasDefault searchable pullDefaultOut colorizeText
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {section === "Tipos de pago" && (
        <CrudTable title="Tipos de pago" table={paymentTypes} hasDefault fields={[{ key: "name", label: "Nombre" }]} />
      )}
      {section === "Estados de pago" && (
        <CrudTable title="Estados de pago" table={paymentStatuses} hasDefault
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {section === "Monedas" && (
        <CrudTable title="Monedas" table={currencies} pkField="code" hasDefault searchable pullDefaultOut
          fields={[{ key: "code", label: "Código (ej. EUR)" }, { key: "name", label: "Nombre" }, { key: "symbol", label: "Símbolo" }]} />
      )}
      {section === "Secciones" && <SectionColors navSections={navSections} />}
      {section === "Ajustes" && <GeneralSettings appConfig={appConfig} />}
    </div>
  );
}
