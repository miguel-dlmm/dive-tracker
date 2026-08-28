import React, { useState, useMemo, useEffect } from "react";
import { Plus, Star, Pencil, Search, Lock, UserPlus, X, Trash2 } from "lucide-react";
import { NAVY, TEAL, GREEN, SUN } from "./App";
import { DeleteButton, EditActions, useToast, AppLoading, Field, ConfirmDialog, Select, useBodyScrollLock } from "./shared";
import { supabase } from "./supabaseClient";
import RatesTab from "./RatesTab";

const inputCls = "min-h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400";

/**
 * Tabla CRUD genérica reutilizada por las secciones de Configuración.
 */
function CrudTable({ title, table, pkField = "id", fields, hasDefault = false, searchable = false, pullDefaultOut = false, colorizeText = false, protectDefaultFromDelete = false }) {
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
              {protectDefaultFromDelete && row.is_default ? (
                // Sin esto, borrar el estado predeterminado deja el
                // catálogo sin ningún is_default=true — para Estados de
                // pago eso no es un detalle de UX menor: is_default es el
                // único campo con el que la app decide qué cuenta como
                // "pendiente" (ver isPendingStatus, shared.jsx), así que
                // perderlo rompe el bucket de pendientes/cobrados de toda
                // la app, no solo el valor por defecto de un formulario.
                <button
                  type="button" disabled
                  title={'Es el estado predeterminado (representa "pendiente") — marca otro como predeterminado antes de eliminar este'}
                  aria-label="No se puede eliminar: es el estado predeterminado"
                  className="-m-2 flex min-h-11 min-w-11 shrink-0 cursor-not-allowed items-center justify-center rounded p-2 text-gray-200"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              ) : (
                <DeleteButton onConfirm={() => table.deleteRow(pk)} size={14} itemLabel={row.name ? `"${row.name}"` : "este elemento"} />
              )}
            </li>
          );
        })}
        {filteredRows.length === 0 && <li className="px-3 py-4 text-center text-sm text-gray-400">Sin resultados.</li>}
      </ul>
    </div>
  );
}

// Bloque dedicado para los colores de navegación — filas fijas (una por
// área de la app), sin alta/baja, solo editar color en vivo. Antes se
// llamaba "Secciones"/"Colores de sección": desde que Movimientos tiene su
// propia identidad visual por tipo (barra lateral de cada tarjeta, colores
// fijos de marca — ver rowAccent en MiTrabajoTab.jsx, deliberadamente NO
// configurable, mismo criterio que NAVY/TEAL/CORAL/GREEN), "sección" se
// había vuelto ambiguo: esto no es eso, es el color de cada área de la
// navegación (pestaña + botón de "+ Nuevo"), no el de los tipos de
// movimiento dentro de Mi trabajo.
function SectionColors({ navSections }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">Colores de navegación</h3>
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

// Casilla para un rol. Por defecto (sin onChange, o locked) es de solo
// lectura: checked+disabled sin onChange es el patrón estándar de React
// para un checkbox no interactivo (no dispara el warning de "checked sin
// onChange" porque está disabled). Si se pasa onChange y no está locked,
// se vuelve interactiva — pero el click NO cambia el valor directamente,
// solo dispara la petición de cambio (ver onRequestToggle en UsersTable);
// el checkbox sigue reflejando el valor real del servidor hasta que la
// mutación se confirma y se recarga el listado.
// - Admin: color neutro, editable por superadmin (ver UsersTable).
// - Superadmin: locked=true añade un candado y un color distinto para dejar
//   claro que es un rol de sistema protegido, nunca editable desde la UI
//   (solo puede haber un superadmin, y protect_profile_roles_trigger en la
//   base de datos impide cambiarlo aunque alguien lo intente saltándose
//   esta pantalla) — nunca recibe onChange, así que siempre cae en la rama
//   de solo lectura de abajo.
function RoleCheckbox({ checked, label, locked = false, onChange }) {
  const editable = !locked && !!onChange;
  return (
    <span
      className="inline-flex items-center gap-1"
      title={locked ? `${label} — rol de sistema protegido, no editable` : label}
    >
      <input
        type="checkbox"
        checked={!!checked}
        disabled={!editable}
        onChange={editable ? onChange : undefined}
        aria-label={`${label}: ${checked ? "sí" : "no"}`}
        className={`h-4 w-4 shrink-0 rounded border-gray-300 disabled:opacity-100 ${editable ? "cursor-pointer" : "cursor-not-allowed"}`}
        style={{ accentColor: checked ? (locked ? SUN : GREEN) : undefined }}
      />
      {locked && <Lock size={11} className="shrink-0 text-amber-500" aria-hidden="true" />}
    </span>
  );
}

// Tabla presentacional pura — separada de UsersDirectory para poder añadir
// acciones de edición por fila más adelante sin tocar la lógica de búsqueda.
// currentUserId / viewerIsSuperadmin: de profile (el que mira la pantalla),
// nunca de la propia fila — decide qué checkbox Admin queda editable.
// onRequestToggle(row): se llama al pulsar un checkbox Admin editable; no
// cambia nada por sí sola, solo abre la confirmación en UsersDirectory.
function UsersTable({ rows, currentUserId, viewerIsSuperadmin, onRequestToggle }) {
  if (rows.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-gray-400">Sin resultados.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">Apellidos</th>
            <th className="px-3 py-2 font-medium">Nickname</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Admin</th>
            <th className="px-3 py-2 font-medium">Superadmin</th>
            <th className="px-3 py-2 font-medium">Alta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const editable = viewerIsSuperadmin && p.user_id !== currentUserId && !p.is_superadmin;
            return (
              <tr key={p.user_id} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-2 text-gray-700">{p.first_name || "—"}</td>
                <td className="px-3 py-2 text-gray-700">{p.last_name || "—"}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{p.nickname}</td>
                <td className="px-3 py-2 text-gray-500">{p.email || "—"}</td>
                <td className="px-3 py-2">
                  <RoleCheckbox
                    checked={p.is_admin}
                    label="Admin"
                    onChange={editable ? () => onRequestToggle(p) : undefined}
                  />
                </td>
                <td className="px-3 py-2"><RoleCheckbox checked={p.is_superadmin} label="Superadmin" locked /></td>
                <td className="px-3 py-2 text-gray-500">{p.created_at ? new Date(p.created_at).toLocaleDateString("es-ES") : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Directorio de usuarios — de momento solo lectura. Los datos vienen del RPC
// admin_list_profiles (security definer): junta profiles con el email de
// auth.users y solo devuelve filas si quien llama es admin/superadmin — ver
// schema.sql. No es un fetch de la tabla profiles, así que no compite con
// ningún otro hook de useSupabaseTable ya cargado en App.jsx.
const emptyUserForm = { email: "", first_name: "", last_name: "", nickname: "" };

// Hoja de creación de usuario — solo visible/usable para superadmin (ver
// UsersDirectory). Llama a la función Netlify create-user, que es la única
// pieza con permiso para invocar el Admin API de Supabase Auth.
function CreateUserSheet({ onClose, onCreated }) {
  // Solo existe montada mientras la hoja está abierta — no hace falta un
  // booleano de estado, basta con bloquear el scroll de fondo siempre.
  useBodyScrollLock(true);
  const [form, setForm] = useState(emptyUserForm);
  const [datasetLabel, setDatasetLabel] = useState("");
  const [datasets, setDatasets] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Fallback operativo MVP. Permite activar usuarios manualmente si el
  // proveedor de email falla. Revisar/eliminar antes de producción pública.
  // El backend (createUser.js) solo incluye action_link en la respuesta
  // cuando el email NO se ha podido enviar — si el envío funciona, esto
  // nunca se activa y el flujo se comporta como uno normal.
  const [emailFailure, setEmailFailure] = useState(null);
  const toast = useToast();

  // setup_datasets tiene una policy propia de solo-lectura para admins
  // (ver schema.sql) pensada exactamente para este desplegable — nunca se
  // lee aquí setup_dataset_schools/activities/rates/..., esas siguen
  // cerradas y solo accesibles vía clone_setup_dataset() en el servidor.
  useEffect(() => {
    let active = true;
    supabase.from("setup_datasets").select("key, label").order("label").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error(error);
        toast?.error("No se pudieron cargar los datasets disponibles.");
      } else {
        setDatasets(data || []);
      }
      setDatasetsLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const dataset = datasets.find((d) => d.label === datasetLabel);
    if (!form.email || !form.nickname || !dataset) {
      toast?.error("Email, nickname y dataset inicial son obligatorios.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      // Ruta única e independiente del proveedor: en Vercel /api/create-user
      // ya sirve directamente api/create-user.js; en Netlify, netlify.toml
      // reescribe esta misma ruta hacia la función en netlify/functions/.
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, dataset_key: dataset.key }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "No se pudo crear el usuario.");
      if (payload.action_link) {
        toast?.success("Usuario creado (el email no se pudo enviar)");
        setEmailFailure(payload);
      } else {
        toast?.success("Usuario creado correctamente");
        onCreated();
      }
    } catch (err) {
      toast?.error(err.message || "No se pudo crear el usuario.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(emailFailure.action_link);
      toast?.success("Enlace copiado");
    } catch {
      toast?.error("No se pudo copiar. Selecciónalo a mano.");
    }
  };

  // Fallback operativo MVP. Permite activar usuarios manualmente si el
  // proveedor de email falla. Revisar/eliminar antes de producción pública.
  if (emailFailure) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={onCreated}>
        <div
          className="max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-700">No se pudo enviar el email</h3>
            <button onClick={onCreated} aria-label="Cerrar" className="text-gray-400"><X size={19} /></button>
          </div>
          <p className="mb-2 text-xs text-gray-500">
            No se pudo enviar el email de activación. Puedes compartir este enlace manualmente.
          </p>
          <p className="mb-3 break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">{emailFailure.action_link}</p>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: TEAL }}
            >
              Copiar enlace
            </button>
            <button
              onClick={onCreated}
              className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/25" onClick={() => !submitting && onClose()}>
      <div
        className="max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Crear usuario</h3>
          <button onClick={() => !submitting && onClose()} aria-label="Cerrar" className="text-gray-400"><X size={19} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} w-full`} />
            </Field>
          </div>
          <Field label="Nombre">
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={`${inputCls} w-full`} />
          </Field>
          <Field label="Apellidos">
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={`${inputCls} w-full`} />
          </Field>
          <Field label="Nickname">
            <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={`${inputCls} w-full`} />
          </Field>
          <div className="col-span-2">
            <Field label="Dataset inicial">
              <Select
                value={datasetLabel}
                onChange={setDatasetLabel}
                options={datasets.map((d) => d.label)}
                placeholder={datasetsLoading ? "Cargando…" : datasets.length ? "Selecciona un dataset" : "No hay datasets disponibles"}
              />
            </Field>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          El dataset elegido carga automáticamente escuelas, actividades, tarifas, comisiones y catálogos de pago iniciales.
          La persona recibirá un email con un enlace de un solo uso para entrar y crear su propia contraseña.
        </p>

        <button
          onClick={submit}
          disabled={submitting}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: TEAL }}
        >
          <UserPlus size={16} /> {submitting ? "Creando…" : "Crear usuario"}
        </button>
      </div>
    </div>
  );
}

function UsersDirectory({ profile }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const applyResult = ({ data, error }) => {
    if (error) {
      // Se muestra el mensaje real de Postgres/PostgREST (no uno genérico)
      // porque el motivo casi siempre es diagnosticable desde aquí mismo:
      // función inexistente en la BD todavía, falta de grant, etc.
      console.error(error);
      setLoadError(error.message || "Error desconocido");
      toast?.error("No se pudo cargar el listado de usuarios.");
    } else {
      setLoadError(null);
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    supabase.rpc("admin_list_profiles").then((result) => { if (active) applyResult(result); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Igual que el fetch de montaje, pero invocable a demanda (tras crear un
  // usuario) — fuera de un useEffect, así que no aplica la regla que exige
  // que un setState dentro de un efecto quede envuelto en un callback.
  const reload = () => {
    setLoading(true);
    supabase.rpc("admin_list_profiles").then(applyResult);
  };

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      [p.first_name, p.last_name, p.nickname, p.email].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  // No cambia nada por sí solo — solo abre la confirmación. El checkbox
  // sigue mostrando el valor real hasta que la mutación se confirma.
  const requestAdminToggle = (row) => {
    setPendingToggle({ user_id: row.user_id, nickname: row.nickname, currentValue: row.is_admin, nextValue: !row.is_admin });
  };

  const cancelAdminToggle = () => {
    if (submitting) return;
    setPendingToggle(null);
  };

  const confirmAdminToggle = async () => {
    if (!pendingToggle) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      // Mismo patrón exacto que CreateUserSheet.submit(): ruta única
      // independiente del proveedor, cuerpo estrecho — nunca is_superadmin
      // ni datos del usuario que llama, ese siempre sale del token.
      const res = await fetch("/api/update-admin-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: pendingToggle.user_id, is_admin: pendingToggle.nextValue }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "No se pudo actualizar el rol.");
      toast?.success("Rol actualizado correctamente");
      setPendingToggle(null);
      reload();
    } catch (err) {
      toast?.error(err.message || "No se pudo actualizar el rol.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Usuarios</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-3.5 text-gray-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar usuarios"
              className={`${inputCls} w-44 pl-8`}
            />
          </div>
          {/* Solo superadmin: los admins normales solo tienen acceso de lectura al directorio. */}
          {profile?.is_superadmin && (
            <button
              onClick={() => setSheetOpen(true)}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white"
              style={{ backgroundColor: TEAL }}
            >
              <UserPlus size={15} aria-hidden="true" /> Crear usuario
            </button>
          )}
        </div>
      </div>
      {loadError && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          No se pudo cargar el listado: {loadError}
        </p>
      )}
      {loading ? (
        <p className="px-3 py-6 text-center text-sm text-gray-400">Cargando usuarios…</p>
      ) : (
        <UsersTable
          rows={filteredRows}
          currentUserId={profile?.user_id}
          viewerIsSuperadmin={!!profile?.is_superadmin}
          onRequestToggle={requestAdminToggle}
        />
      )}

      {sheetOpen && (
        <CreateUserSheet
          onClose={() => setSheetOpen(false)}
          onCreated={() => { setSheetOpen(false); reload(); }}
        />
      )}

      <ConfirmDialog
        open={!!pendingToggle}
        title="Cambiar rol de admin"
        message={pendingToggle && (
          <>
            Usuario: {pendingToggle.nickname}
            <br />
            Admin: {pendingToggle.currentValue ? "Sí" : "No"} → {pendingToggle.nextValue ? "Sí" : "No"}
          </>
        )}
        onConfirm={confirmAdminToggle}
        onCancel={cancelAdminToggle}
        loading={submitting}
        confirmLabel="Confirmar"
        danger={false}
      />
    </div>
  );
}

// Pagos ya no vive aquí — es pantalla secundaria propia, alcanzable desde
// la tarjeta "Pendiente de cobrar" de Home (ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md).
const SECTIONS = ["Escuelas", "Actividades", "Tarifas"];
const ADMIN_SECTIONS = ["Tipos de pago", "Estados de pago", "Monedas", "Navegación", "Ajustes", "Usuarios"];

// schools / activities / currencies / paymentTypes / paymentStatuses / navSections / appConfig: hooks de useSupabaseTable
// rates / commissionRates / worklog / comisiones: hooks que necesitan las secciones Tarifas y Pagos, embebidas aquí
// profile: fila propia de profiles (useSession) — is_admin/is_superadmin deciden qué secciones se ven
export default function ConfigTab({ schools, activities, currencies, paymentTypes, paymentStatuses, rates, commissionRates, worklog, comisiones, navSections, appConfig, profile }) {
  const isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
  const [section, setSection] = useState("Escuelas");
  const sections = isAdmin ? [...SECTIONS, ...ADMIN_SECTIONS] : SECTIONS;
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {sections.map((s) => (
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
      {section === "Tarifas" && (
        <RatesTab
          schools={schools} activities={activities} paymentTypes={paymentTypes} currencies={currencies}
          rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones}
          accentColor={sectionColor("rates")}
        />
      )}
      {isAdmin && section === "Tipos de pago" && (
        <CrudTable title="Tipos de pago" table={paymentTypes} hasDefault fields={[{ key: "name", label: "Nombre" }]} />
      )}
      {isAdmin && section === "Estados de pago" && (
        <CrudTable title="Estados de pago" table={paymentStatuses} hasDefault protectDefaultFromDelete
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {isAdmin && section === "Monedas" && (
        <CrudTable title="Monedas" table={currencies} pkField="code" hasDefault searchable pullDefaultOut
          fields={[{ key: "code", label: "Código (ej. EUR)" }, { key: "name", label: "Nombre" }, { key: "symbol", label: "Símbolo" }]} />
      )}
      {isAdmin && section === "Navegación" && <SectionColors navSections={navSections} />}
      {isAdmin && section === "Ajustes" && <GeneralSettings appConfig={appConfig} />}
      {isAdmin && section === "Usuarios" && <UsersDirectory profile={profile} />}
    </div>
  );
}
