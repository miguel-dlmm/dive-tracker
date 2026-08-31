import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import {
  Plus, Check, Star, Search, Lock, UserPlus, X, Trash2, Pencil, Copy, KeyRound,
  ChevronRight, ChevronLeft, Building2, GraduationCap, Coins,
  CreditCard, Flag, DollarSign, Palette, SlidersHorizontal, Users, Shield, ShieldCheck,
} from "lucide-react";
import { NAVY, TEAL, GREEN, SUN, CORAL } from "./App";
import { useToast, AppLoading, Field, ConfirmDialog, EditActions, Select, RowMenu, Sheet, Fab, shortDate } from "./shared";
import { usePrefersReducedMotion, useSwipeBack } from "./motion";
import { supabase } from "./supabaseClient";
import RatesTab from "./RatesTab";

const inputCls = "min-h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400";

// Mensaje determinista para las 4 acciones de gestión de usuarios: cada
// handler (server/users/*.js) usa 403 EXCLUSIVAMENTE para "quien llama no
// es superadmin" (verificado leyendo los 4 archivos — cualquier otro
// rechazo usa 400/401/404/500) — así que basta con el código HTTP para
// decidir el mensaje sin depender de que el cuerpo de la respuesta llegue
// bien formado. Antes se confiaba en `payload.error`, y un fallo de red o
// de parseo de JSON (poco probable pero posible) habría mostrado el
// mensaje genérico de "no se pudo..." en vez de este, exactamente la
// inconsistencia que no se quiere.
function actionErrorMessage(res, payload, { forbidden, fallback }) {
  if (res.status === 403) return forbidden;
  return payload.error || fallback;
}

/**
 * Tabla CRUD genérica reutilizada por las secciones de Configuración
 * (Escuelas, Cursos, Tipos de pago, Estados de pago, Monedas). Crear y
 * editar comparten la misma hoja inferior (FAB + hoja, ver CLAUDE.md
 * convención #3 y RatesTab/MovementSheet) en vez de un formulario fijo o
 * una edición en línea — hasta el addendum de 2026-08-29 (ver
 * docs/ADR/0008) esta era la última pieza de Configuración que aún no
 * seguía ese patrón. Cada fila usa el mismo menú "⋯" (RowMenu) que Mi
 * trabajo/Tarifas para Editar/Eliminar, en vez de iconos sueltos.
 * createLabel/editLabel: títulos de la hoja en cada modo — el nombre de
 * la sección en sí lo muestra ya la cabecera del menú de Configuración,
 * no hace falta repetirlo aquí dentro.
 */
function CrudTable({ createLabel, editLabel, table, pkField = "id", fields, hasDefault = false, searchable = false, pullDefaultOut = false, colorizeText = false, protectDefaultFromDelete = false }) {
  const emptyForm = Object.fromEntries(fields.map((f) => [f.key, f.type === "color" ? "#0E7C7B" : ""]));
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null); // null = alta
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

  const closeSheet = () => { setSheetOpen(false); setEditingRow(null); };
  const openCreateSheet = () => { setForm(emptyForm); setEditingRow(null); setSheetOpen(true); };
  const openEditSheet = (row) => {
    setForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key]])));
    setEditingRow(row);
    setSheetOpen(true);
  };

  const submitSheet = async () => {
    if (fields.some((f) => f.required !== false && !form[f.key])) return;
    try {
      if (editingRow) {
        await table.updateRow(editingRow[pkField], form);
        toast?.success("Cambios guardados");
      } else {
        await table.insertRow(form);
        toast?.success("Añadido correctamente");
      }
      closeSheet();
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  // Color y "favorito" se editan en el sitio, sin pasar por la hoja — son
  // toques rápidos de un solo campo, no una edición completa de la fila
  // (mismo criterio que el switch de estado en otras pantallas: una
  // acción tan ligera no necesita el peso de abrir/cerrar una hoja).
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

  return (
    <div className="space-y-3 pb-16">
      {(searchable || (pullDefaultOut && defaultRow)) && (
        <div className="space-y-3">
          {searchable && (
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." aria-label="Buscar" className={`${inputCls} w-full pl-9`} />
            </div>
          )}
          {pullDefaultOut && defaultRow && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
              <Star size={14} className="shrink-0 text-amber-500" fill="currentColor" aria-hidden="true" />
              <span className="shrink-0 text-xs font-medium text-amber-700">Favorita</span>
              {fields.map((f) => (
                f.type === "color"
                  ? renderColorField(defaultRow, f)
                  : <span key={f.key} className="text-sm font-semibold" style={colorField ? { color: defaultRow[colorField.key] } : { color: "#334155" }}>{defaultRow[f.key]}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {filteredRows.map((row) => {
          const pk = row[pkField];
          const isProtected = protectDefaultFromDelete && row.is_default;
          return (
            <li key={pk} className="flex items-center gap-2 px-4 py-2.5 text-sm">
              {fields.map((f) => {
                if (f.type === "color") return renderColorField(row, f);
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
              <RowMenu
                onEdit={() => openEditSheet(row)}
                onDelete={() => table.deleteRow(pk)}
                itemLabel={row.name ? `"${row.name}"` : "este elemento"}
                deleteDisabled={isProtected}
                // Sin esto, borrar el estado predeterminado deja el catálogo
                // sin ningún is_default=true — para Estados de pago eso no es
                // un detalle de UX menor: is_default es el único campo con el
                // que la app decide qué cuenta como "pendiente" (ver
                // isPendingStatus, shared.jsx), así que perderlo rompe el
                // bucket de pendientes/cobrados de toda la app, no solo el
                // valor por defecto de un formulario.
                deleteDisabledReason={isProtected ? 'Es el estado predeterminado (representa "pendiente") — marca otro como predeterminado antes de eliminar este' : undefined}
              />
            </li>
          );
        })}
        {filteredRows.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">Sin resultados.</li>}
      </ul>

      <Fab onClick={openCreateSheet} label={createLabel} color={TEAL} />

      <Sheet open={sheetOpen} onClose={closeSheet}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{editingRow ? (editLabel || createLabel) : createLabel}</h3>
          <button onClick={closeSheet} aria-label="Cerrar" className="text-gray-400"><X size={19} /></button>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2.5">
          {fields.map((f) => (
            f.type === "color" ? (
              <Field key={f.key} label={f.label}>
                <input type="color" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="h-11 w-12 cursor-pointer rounded-md border border-gray-200" />
              </Field>
            ) : (
              <Field key={f.key} label={f.label}>
                <input value={form[f.key]} placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className={`${inputCls} w-full min-w-[8rem]`} onKeyDown={(e) => e.key === "Enter" && submitSheet()} />
              </Field>
            )
          ))}
        </div>
        <button
          onClick={submitSheet}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: TEAL }}
        >
          {editingRow ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} Guardar
        </button>
      </Sheet>
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

      <hr className="my-4 border-gray-100" />

      <ExternalRegistrationSetting appConfig={appConfig} row={row} />
    </div>
  );
}

// Registro externo (ADR-0023) — off por defecto en cualquier instalación.
// Encendido, "Regístrate" aparece en el login y cualquiera puede darse de
// alta él mismo (mismo mecanismo que el alta hecha por un superadmin,
// solo que autoservicio — ver server/users/externalRegister.js). El
// endpoint público ya comprueba este mismo flag en cada petición, así que
// este switch es la única fuente de verdad — nunca hay una vía que lo
// esquive.
function ExternalRegistrationSetting({ appConfig, row }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const enabled = !!row.allow_external_registration;

  const toggle = async () => {
    setSaving(true);
    try {
      await appConfig.updateRow(true, { allow_external_registration: !enabled });
      toast?.success(enabled ? "Registro externo desactivado" : "Registro externo activado");
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Permitir registro externo</h3>
          <p className="mt-0.5 text-xs text-gray-400">Muestra "Regístrate" en el login para que cualquiera pueda crear su propia cuenta.</p>
        </div>
        <BooleanToggle checked={enabled} onChange={toggle} disabled={saving} ariaLabel="Permitir registro externo" />
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

// Estado real de una cuenta — tres valores, no dos (2026-08-29, ver
// docs/ADR "modelo de activación"). Antes "Activa/Desactivada" miraba
// solo si la cuenta estaba baneada, así que una cuenta recién creada
// (nunca baneada, pero que todavía no ha fijado contraseña) se mostraba
// "Activa" — incorrecto, nadie ha completado el proceso todavía.
// `activatedAt` (profiles.activated_at) es lo que de verdad distingue
// "nunca activada"/"desactivada y pendiente de un enlace nuevo" de
// "activa de verdad".
function userStatus(active, activatedAt) {
  if (!active) return "desactivado";
  if (!activatedAt) return "pendiente";
  return "activo";
}

const STATUS_META = {
  activo: { label: "Activo", cls: "bg-emerald-50 text-emerald-700", dot: "#10B981" },
  pendiente: { label: "Pendiente", cls: "bg-amber-50 text-amber-700", dot: "#D97706" },
  desactivado: { label: "Desactivado", cls: "bg-gray-100 text-gray-500", dot: "#9CA3AF" },
};

// Badge de solo lectura — cualquier admin puede VERLO, cambiarlo es cosa
// del switch de más abajo (BooleanToggle), no de este componente. Separar
// "mostrar estado" de "cambiar estado" es justo lo que permite que la
// lista (donde nunca hay acción) y el detalle (donde sí la hay, junto al
// switch) reutilicen la misma pieza sin condicionales de por medio.
// Punto de color delante del texto (feedback explícito 2026-08-30: "quiero
// que se entienda de un vistazo, sin obligar a leer demasiado") — el texto
// se mantiene (nunca solo color, que no llega a quien no distingue bien
// los colores ni a un lector de pantalla), el punto es el atajo visual.
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.desactivado;
  return (
    <span className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

// Rol junto al nickname (feedback explícito 2026-08-30) — un icono, no
// texto: admin/superadmin son la excepción, no el caso general (la
// mayoría de filas no lleva nada aquí), así que un icono compacto con
// aria-label se lee rápido sin ocupar el ancho de una segunda pastilla de
// texto junto a la de estado. ShieldCheck (relleno) para superadmin,
// Shield (contorno) para admin — mismo icono base, distinción por "nivel
// de relleno" en vez de dos formas distintas sin relación visual entre sí.
function RoleIcon({ isAdmin, isSuperadmin }) {
  if (isSuperadmin) return <ShieldCheck size={14} className="shrink-0" style={{ color: SUN }} role="img" aria-label="Superadmin" />;
  if (isAdmin) return <Shield size={14} className="shrink-0" style={{ color: NAVY }} role="img" aria-label="Administrador" />;
  return null;
}

// Switch Activar/Desactivar — sustituye el botón-pastilla anterior (2026-08-29,
// pedido explícito: "no quiero un botón tosco"). `checked` representa
// literalmente "no está baneado" (cubre tanto "activo" como "pendiente" —
// ver userStatus), así que pasar de apagado a encendido dispara el flujo
// de activar (genera un enlace, no concede acceso al instante) y el
// switch queda encendido de verdad aunque el estado siga mostrando
// "Pendiente" justo al lado — no hay contradicción, un usuario no baneado
// pendiente de activación sigue sin poder entrar hasta completar el
// enlace, el switch solo refleja el baneo, la pastilla de al lado matiza
// el resto.
function BooleanToggle({ checked, onChange, disabled, ariaLabel, color = TEAL }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className="relative -m-2 flex shrink-0 items-center justify-center p-2 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ minHeight: 44, minWidth: 44 }}
    >
      <span className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: checked ? color : "#D1D5DB" }}>
        <span
          className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

// Fecha + hora, para "último login real" — una fecha sola no basta para
// distinguir "hace 5 minutos" de "hace 20 horas" el mismo día.
function shortDateTime(iso) {
  return iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Nunca";
}

// Rediseño 2026-08-29: la tabla con scroll lateral (9 columnas) se
// sustituye por lista + detalle, el mismo patrón que ya usan Escuelas/
// Cursos/Tarifas/Mi trabajo — "aprender una parte de la app facilita usar
// las demás", encargo explícito del usuario. La fila solo muestra lo
// mínimo para localizar y reconocer a alguien de un vistazo (identificador,
// estado, fecha de alta, fecha de desactivación si aplica); el resto de la
// gestión (roles, activar/desactivar, editar, regenerar, eliminar) vive en
// UserDetailSheet, al tocar la fila.
//
// "Fecha de desactivación" (pedida explícitamente, "fecha de baja" en la
// petición original): no existe hoy ninguna columna que registre CUÁNDO se
// desactivó una cuenta — `banned_until` (Supabase Auth) guarda cuándo
// TERMINARÍA el baneo, no cuándo empezó, así que no sirve para derivarla.
// Añadirla requeriría una columna nueva (`profiles.deactivated_at`) — un
// cambio de esquema real que las reglas del proyecto piden proponer aparte
// antes de implementar (ver ADR de esta sesión). Mientras tanto, para una
// cuenta desactivada se muestra explícitamente "fecha no registrada
// todavía" en vez de omitir el dato en silencio — dejar claro que es un
// hueco real, no un olvido.
// Arrastrar una fila de Usuarios hacia la izquierda revela "Eliminar"
// detrás — un atajo ADICIONAL, no un segundo mecanismo de borrado: tocar
// el botón revelado llama al mismo `onDelete` (el `requestDelete` ya
// existente, que abre el mismo `ConfirmDialog` que la hoja de detalle)
// — el gesto solo acorta el camino hasta esa confirmación, nunca la
// salta (convención #5, CLAUDE.md: nunca eliminar sin diálogo). Sigue
// habiendo un camino sin gestos (tocar la fila → hoja de detalle →
// "Eliminar"), así que ningún usuario de teclado/lector de pantalla
// pierde la posibilidad de eliminar por no poder arrastrar. Con
// `prefers-reduced-motion`, el arrastre se desactiva del todo y solo
// queda ese camino sin gestos.
function SwipeToDeleteRow({ children, onDelete, deleteLabel }) {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  if (reduced) return children;
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-20" style={{ backgroundColor: CORAL }}>
        <button
          onClick={() => { setOpen(false); onDelete(); }}
          aria-label={deleteLabel}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-white"
        >
          <Trash2 size={18} aria-hidden="true" />
          <span className="text-[10px] font-medium">Eliminar</span>
        </button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        animate={{ x: open ? -80 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        onDragEnd={(_, info) => setOpen(info.offset.x < -40)}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
}

function UserListRow({ user, status, onOpen }) {
  return (
    <button
      onClick={() => onOpen(user.user_id)}
      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left"
    >
      <div className="min-w-0 flex-1">
        {/* Estado antes que el nickname (feedback explícito 2026-08-30,
            tercera vuelta: "quiero que el usuario vea primero si está
            activo/pendiente/... antes que el nombre") — es lo primero que
            hay que saber de una cuenta al escanear la lista, así que va
            primero en el orden de lectura, no al final. */}
        <div className="flex items-center gap-1.5">
          <StatusBadge status={status} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{user.nickname}</span>
          <RoleIcon isAdmin={user.is_admin} isSuperadmin={user.is_superadmin} />
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "—"}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-gray-400">
        <div>Alta: {shortDate(user.created_at)}</div>
        {status === "desactivado" && <div className="mt-0.5 italic">Baja: fecha no registrada aún</div>}
      </div>
      <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
    </button>
  );
}

// Hoja de detalle — gestión completa de un usuario, en el mismo patrón de
// hoja inferior que crear/editar en el resto de la app. `editable` decide
// tres cosas a la vez (Admin, Estado, Eliminar): ni la propia cuenta de
// quien mira, ni otro superadmin, y solo si quien mira es superadmin —
// mismo criterio que ya tenía la tabla anterior, ahora centralizado aquí.
// Edición de nombre/apellidos/nickname — en línea, dentro de la propia
// hoja de detalle (convención #4 de CLAUDE.md: "editar en línea =
// EditActions", nunca iconos sueltos de check/x). No se reutiliza el
// patrón "editar en la misma hoja que crear" de Escuelas/Cursos/Tarifas
// (ADR-0013) porque aquí no existe una hoja de creación equivalente que
// editar reabra — CreateUserSheet da de alta una cuenta nueva de auth,
// algo completamente distinto a corregir el nombre de una ya existente.
// Editar en línea, dentro del propio detalle ya abierto, es la pieza de
// "crear/editar con mucha similitud" que sí encaja aquí: mismo lenguaje
// de interacción (EditActions, Field, feedback por toast) sin forzar una
// estructura de pantalla que no pinta nada en este caso.
function UserDetailSheet({
  user, status, lastSignInAt, currentUserId, viewerIsSuperadmin, actionBusy,
  onClose, onRequestToggleAdmin, onRequestToggleActive, onRequestRegenerateLink,
  onRequestRegeneratePassword, onRequestDelete, onSaveProfile,
}) {
  const editable = viewerIsSuperadmin && user.user_id !== currentUserId && !user.is_superadmin;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: user.first_name || "", last_name: user.last_name || "", nickname: user.nickname || "" });
  const startEditProfile = () => {
    setProfileForm({ first_name: user.first_name || "", last_name: user.last_name || "", nickname: user.nickname || "" });
    setEditingProfile(true);
  };
  const saveProfile = async () => {
    const ok = await onSaveProfile(user, profileForm);
    if (ok) setEditingProfile(false);
  };

  return (
    <Sheet open onClose={onClose}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{user.nickname}</h3>
        <button onClick={onClose} aria-label="Cerrar" className="text-gray-400"><X size={19} /></button>
      </div>

      {editingProfile ? (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre">
                <input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} className={`${inputCls} w-full`} />
              </Field>
              <Field label="Apellidos">
                <input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} className={`${inputCls} w-full`} />
              </Field>
              <div className="col-span-2">
                <Field label="Nickname">
                  <input value={profileForm.nickname} onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} className={`${inputCls} w-full`} />
                </Field>
              </div>
            </div>
            <EditActions onSave={saveProfile} onCancel={() => setEditingProfile(false)} />
          </div>
        ) : (
          <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50/60 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">Nombre</span>
              <span className="truncate text-right text-gray-700">{fullName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">Email</span>
              <span className="truncate text-right text-gray-700">{user.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">Alta</span>
              <span className="text-gray-700">{shortDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">Último acceso</span>
              <span className="text-gray-700">{shortDateTime(lastSignInAt)}</span>
            </div>
            {status === "desactivado" && (
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs text-gray-400">Baja</span>
                <span className="italic text-gray-400">fecha no registrada aún</span>
              </div>
            )}
            {editable && (
              <button onClick={startEditProfile} className="flex min-h-9 items-center gap-1 text-xs font-semibold" style={{ color: TEAL }}>
                <Pencil size={13} aria-hidden="true" /> Editar datos
              </button>
            )}
          </div>
        )}

        <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Estado</span>
              <StatusBadge status={status} />
            </div>
            <BooleanToggle
              checked={status !== "desactivado"}
              disabled={!editable || actionBusy}
              ariaLabel={status === "desactivado" ? "Activar usuario" : "Desactivar usuario"}
              onChange={() => (status === "desactivado" ? onRequestRegenerateLink(user) : onRequestToggleActive(user))}
            />
          </div>
          {status === "pendiente" && editable && (
            <p className="text-xs text-gray-400">
              Pendiente de que la persona abra el enlace y cree su contraseña.{" "}
              <button onClick={() => onRequestRegenerateLink(user)} disabled={actionBusy} className="font-semibold underline disabled:opacity-40" style={{ color: TEAL }}>
                Regenerar enlace
              </button>
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Admin</span>
            <RoleCheckbox checked={user.is_admin} label="Admin" onChange={editable ? () => onRequestToggleAdmin(user) : undefined} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Superadmin</span>
            <RoleCheckbox checked={user.is_superadmin} label="Superadmin" locked />
          </div>
        </div>

        {editable && (
          <button
            onClick={() => onRequestRegeneratePassword(user)}
            disabled={actionBusy}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40"
          >
            <KeyRound size={15} aria-hidden="true" /> Regenerar contraseña
          </button>
        )}

        {editable && (
          <button
            onClick={() => onRequestDelete(user)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 text-sm font-medium text-red-600"
          >
            <Trash2 size={15} aria-hidden="true" /> Eliminar usuario
          </button>
        )}
    </Sheet>
  );
}

// Panel que muestra un enlace de activación recién generado (alta, activar,
// regenerar link, regenerar contraseña — las 4 rutas convergen en un
// enlace de un solo uso que copiar/compartir). Mismo patrón visual que el
// fallback de email de CreateUserSheet (justo abajo), extraído aquí porque
// ahora lo usan varias acciones, no solo el alta.
function ActivationLinkPanel({ title, description, link, onClose }) {
  const toast = useToast();
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast?.success("Enlace copiado");
    } catch {
      toast?.error("No se pudo copiar. Selecciónalo a mano.");
    }
  };
  return (
    // z-50: puede convivir con UserDetailSheet (z-40) todavía abierta detrás
    // (p. ej. tras "Regenerar enlace" desde el propio detalle) — debe
    // quedar por encima, no reemplazarla.
    <Sheet open onClose={onClose} zIndexClass="z-50">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} aria-label="Cerrar" className="text-gray-400"><X size={19} /></button>
      </div>
      <p className="mb-2 text-xs text-gray-500">{description}</p>
      <p className="mb-3 break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">{link}</p>
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: TEAL }}
        >
          <Copy size={15} aria-hidden="true" /> Copiar enlace
        </button>
        <button onClick={onClose} className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600">
          Cerrar
        </button>
      </div>
      {/* TEMPORAL — quitar en cuanto el dominio de Resend esté verificado
          (ver conversación 2026-08-31). Simula en la UI que el email SÍ se
          envió, sin llamar a Resend — solo para probar visualmente ese
          camino mientras el dominio sigue sin verificar. No toca ningún
          estado real del backend. */}
      <button
        onClick={() => { toast?.success("(Mock) Email enviado correctamente"); onClose(); }}
        className="mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-dashed border-amber-300 text-xs font-medium text-amber-700"
      >
        Simular envío correcto (mock)
      </button>
    </Sheet>
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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: "Solo un superadmin puede crear usuarios.", fallback: "No se pudo crear el usuario." }));
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
      <Sheet open onClose={onCreated}>
        <div className="mb-1 flex items-center justify-between">
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
        {/* TEMPORAL — quitar en cuanto el dominio de Resend esté verificado
            (ver conversación 2026-08-31). Simula en la UI que el email SÍ se
            envió, sin llamar a Resend — solo para probar visualmente ese
            camino mientras el dominio sigue sin verificar. No toca ningún
            estado real del backend. */}
        <button
          onClick={() => { toast?.success("(Mock) Usuario creado y email enviado correctamente"); onCreated(); }}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-dashed border-amber-300 text-xs font-medium text-amber-700"
        >
          Simular envío correcto (mock)
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={() => !submitting && onClose()}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Crear usuario</h3>
        <button onClick={() => !submitting && onClose()} aria-label="Cerrar" className="text-gray-400"><X size={19} /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
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
        El dataset elegido carga automáticamente escuelas, cursos, tarifas, comisiones y catálogos de pago iniciales.
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
    </Sheet>
  );
}

function UsersDirectory({ profile }) {
  const [rows, setRows] = useState([]);
  const [activeByUser, setActiveByUser] = useState({});
  const [lastSignInByUser, setLastSignInByUser] = useState({});
  const [activatedAtByUser, setActivatedAtByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  // openUserId (no un snapshot del objeto): se deriva de `rows` en cada
  // render, así la hoja de detalle siempre muestra datos frescos tras un
  // reload() (cambiar de rol, activar/desactivar) sin tener que sincronizar
  // manualmente un segundo estado.
  const [openUserId, setOpenUserId] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [pendingToggleActive, setPendingToggleActive] = useState(null);
  const [pendingRegenerateLink, setPendingRegenerateLink] = useState(null);
  const [pendingRegeneratePassword, setPendingRegeneratePassword] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [linkPanel, setLinkPanel] = useState(null);
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

  // Estado activo/desactivado — endpoint aparte (ver listUserStatus.js), no
  // parte de admin_list_profiles(): lee auth.admin.listUsers() directamente,
  // sin necesitar ningún cambio de esquema. Falla en silencio (deja
  // activeByUser vacío, StatusBadge asume "activo" por fila) — un fallo
  // aquí no debe impedir ver el resto del directorio.
  const loadActiveStatus = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/list-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        setActiveByUser(payload.active || {});
        setLastSignInByUser(payload.lastSignInAt || {});
      }
    } catch {
      // silencioso a propósito — ver comentario de arriba
    }
  };

  // activated_at no está en admin_list_profiles() — se consulta aparte
  // (RLS de profiles ya permite a un admin leer cualquier fila, ver ADR de
  // esta sesión) y se cruza por user_id en el cliente, para no tocar
  // schema.sql por este requisito. Igual de silencioso que loadActiveStatus:
  // un fallo aquí no debe tumbar el resto del directorio.
  const loadActivatedAt = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("user_id, activated_at");
      if (error) throw error;
      const map = {};
      (data || []).forEach((r) => { map[r.user_id] = r.activated_at; });
      setActivatedAtByUser(map);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    supabase.rpc("admin_list_profiles").then((result) => { if (active) applyResult(result); });
    loadActiveStatus();
    loadActivatedAt();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Igual que el fetch de montaje, pero invocable a demanda (tras crear un
  // usuario) — fuera de un useEffect, así que no aplica la regla que exige
  // que un setState dentro de un efecto quede envuelto en un callback.
  const reload = () => {
    setLoading(true);
    supabase.rpc("admin_list_profiles").then(applyResult);
    loadActiveStatus();
    loadActivatedAt();
  };

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((p) =>
          [p.first_name, p.last_name, p.nickname, p.email].some((v) => String(v || "").toLowerCase().includes(q))
        )
      : rows;
    // Orden alfabético por nickname (el campo que encabeza cada fila) —
    // localeCompare "es" para que "Á"/"a" ordenen de forma natural, no por
    // el orden de alta que devolvía admin_list_profiles() antes.
    return [...base].sort((a, b) => (a.nickname || "").localeCompare(b.nickname || "", "es", { sensitivity: "base" }));
  }, [rows, query]);

  const openUser = rows.find((p) => p.user_id === openUserId) || null;

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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: "Solo un superadmin puede cambiar el rol de admin de otra cuenta.", fallback: "No se pudo actualizar el rol." }));
      toast?.success("Rol actualizado correctamente");
      setPendingToggle(null);
      reload();
    } catch (err) {
      toast?.error(err.message || "No se pudo actualizar el rol.");
    } finally {
      setSubmitting(false);
    }
  };

  // Irreversible a propósito (ver deleteUser.js): la confirmación reutiliza
  // ConfirmDialog en modo "danger" (mismo componente que DeleteButton usa en
  // el resto de la app), no un segundo patrón de diálogo distinto.
  const requestDelete = (row) => setPendingDelete({ user_id: row.user_id, nickname: row.nickname });

  const cancelDelete = () => {
    if (submitting) return;
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: pendingDelete.user_id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: "Solo un superadmin puede eliminar usuarios.", fallback: "No se pudo eliminar el usuario." }));
      toast?.success("Usuario eliminado");
      setPendingDelete(null);
      setOpenUserId(null); // la cuenta ya no existe — no queda nada que mostrar en la hoja de detalle
      // Quita la fila del estado local en vez de recargar todo el listado
      // (reload() antes) — un reload muestra "Cargando usuarios…" en el
      // sitio de la lista mientras llega la respuesta, sustituyendo de
      // golpe todo el contenido scrollable por ese único párrafo y
      // perdiendo la posición de scroll en el proceso. Ya sabemos qué fila
      // desapareció; no hace falta otro viaje de red para confirmarlo.
      setRows((prev) => prev.filter((r) => r.user_id !== pendingDelete.user_id));
    } catch (err) {
      toast?.error(err.message || "No se pudo eliminar el usuario.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reversible a propósito, a diferencia de eliminar: los datos nunca se
  // tocan. Ya no admite dirección "reactivar" — reactivar siempre pasa por
  // un enlace de activación nuevo (ver requestRegenerateLink), nunca por un
  // simple des-baneo, así que esta acción es exclusivamente "desactivar".
  const requestToggleActive = (row) => setPendingToggleActive({ user_id: row.user_id, nickname: row.nickname });

  const cancelToggleActive = () => {
    if (submitting) return;
    setPendingToggleActive(null);
  };

  const confirmToggleActive = async () => {
    if (!pendingToggleActive) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/set-user-active", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: pendingToggleActive.user_id, active: false }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: "Solo un superadmin puede activar o desactivar usuarios.", fallback: "No se pudo actualizar el estado." }));
      toast?.success("Usuario desactivado");
      setPendingToggleActive(null);
      loadActiveStatus();
      loadActivatedAt();
    } catch (err) {
      toast?.error(err.message || "No se pudo actualizar el estado.");
    } finally {
      setSubmitting(false);
    }
  };

  // Activar una cuenta desactivada / regenerar el enlace de una pendiente:
  // misma acción de servidor en los dos casos (quita el baneo si lo hay y
  // genera un enlace nuevo) — nunca concede acceso al instante, por eso el
  // resultado se muestra en ActivationLinkPanel en vez de cerrarse solo.
  const requestRegenerateLink = (row) => setPendingRegenerateLink({ user_id: row.user_id, nickname: row.nickname });

  const cancelRegenerateLink = () => {
    if (submitting) return;
    setPendingRegenerateLink(null);
  };

  const confirmRegenerateLink = async () => {
    if (!pendingRegenerateLink) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/regenerate-activation-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: pendingRegenerateLink.user_id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: "Solo un superadmin puede activar cuentas o regenerar su enlace de acceso.", fallback: "No se pudo generar el enlace." }));
      // El backend ya intenta enviar el email automáticamente — el panel con
      // el enlace para copiar solo aparece si el envío falla (mismo patrón
      // que CreateUserSheet más abajo).
      if (payload.action_link) {
        toast?.success(`Enlace generado (el email no se pudo enviar a ${pendingRegenerateLink.nickname})`);
        setLinkPanel({
          title: "Enlace de activación generado",
          description: `Comparte este enlace con ${pendingRegenerateLink.nickname}. Seguirá apareciendo como "Pendiente" hasta que lo use para crear su contraseña.`,
          link: payload.action_link,
        });
      } else {
        toast?.success(`Email de activación enviado a ${pendingRegenerateLink.nickname}`);
      }
      setPendingRegenerateLink(null);
      loadActiveStatus();
      loadActivatedAt();
    } catch (err) {
      toast?.error(err.message || "No se pudo generar el enlace.");
    } finally {
      setSubmitting(false);
    }
  };

  // Invalida la contraseña actual (se sobrescribe por una aleatoria que
  // nunca se muestra ni se guarda) y fuerza el mismo flujo de activación
  // que una cuenta nueva — nunca reutiliza la aceptación legal ya dada
  // (legal_consents es una tabla independiente de activated_at).
  const requestRegeneratePassword = (row) => setPendingRegeneratePassword({ user_id: row.user_id, nickname: row.nickname });

  const cancelRegeneratePassword = () => {
    if (submitting) return;
    setPendingRegeneratePassword(null);
  };

  const confirmRegeneratePassword = async () => {
    if (!pendingRegeneratePassword) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/regenerate-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target_user_id: pendingRegeneratePassword.user_id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: "Solo un superadmin puede regenerar la contraseña de otra cuenta.", fallback: "No se pudo regenerar la contraseña." }));
      // El backend ya intenta enviar el email automáticamente — el panel con
      // el enlace para copiar solo aparece si el envío falla (mismo patrón
      // que CreateUserSheet más abajo).
      if (payload.action_link) {
        toast?.success(`Contraseña regenerada (el email no se pudo enviar a ${pendingRegeneratePassword.nickname})`);
        setLinkPanel({
          title: "Contraseña regenerada",
          description: `La contraseña anterior de ${pendingRegeneratePassword.nickname} ya no es válida. Comparte este enlace para que cree una nueva — la cuenta vuelve a "Pendiente" hasta entonces.`,
          link: payload.action_link,
        });
      } else {
        toast?.success(`Contraseña regenerada y email enviado a ${pendingRegeneratePassword.nickname}`);
      }
      setPendingRegeneratePassword(null);
      loadActiveStatus();
      loadActivatedAt();
    } catch (err) {
      toast?.error(err.message || "No se pudo regenerar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  // RLS de profiles ya permite a un admin actualizar cualquier fila salvo
  // is_admin/is_superadmin (protegidos aparte por trigger) — no hace falta
  // ningún endpoint de servidor nuevo para nombre/apellidos/nickname.
  const saveProfile = async (user, form) => {
    const nickname = form.nickname.trim();
    if (!nickname) {
      toast?.error("El nickname no puede quedar vacío.");
      return false;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: form.first_name.trim() || null, last_name: form.last_name.trim() || null, nickname })
        .eq("user_id", user.user_id);
      if (error) throw error;
      toast?.success("Datos actualizados");
      reload();
      return true;
    } catch (err) {
      console.error(err);
      toast?.error("No se pudieron guardar los cambios.");
      return false;
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-3.5 text-gray-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar usuarios"
            className={`${inputCls} w-full min-w-[9rem] pl-8`}
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
      {loadError && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          No se pudo cargar el listado: {loadError}
        </p>
      )}
      {loading ? (
        <p className="px-3 py-6 text-center text-sm text-gray-400">Cargando usuarios…</p>
      ) : filteredRows.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-gray-400">Sin resultados.</p>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {filteredRows.map((p) => {
            const row = (
              <UserListRow
                user={p}
                status={userStatus(activeByUser[p.user_id] ?? true, activatedAtByUser[p.user_id])}
                onOpen={setOpenUserId}
              />
            );
            const canDelete = !!profile?.is_superadmin && p.user_id !== profile?.user_id && !p.is_superadmin;
            return (
              <div key={p.user_id}>
                {canDelete
                  ? <SwipeToDeleteRow onDelete={() => requestDelete(p)} deleteLabel={`Eliminar a ${p.nickname}`}>{row}</SwipeToDeleteRow>
                  : row}
              </div>
            );
          })}
        </div>
      )}

      {sheetOpen && (
        <CreateUserSheet
          onClose={() => setSheetOpen(false)}
          onCreated={() => { setSheetOpen(false); reload(); }}
        />
      )}

      {openUser && (
        <UserDetailSheet
          user={openUser}
          status={userStatus(activeByUser[openUser.user_id] ?? true, activatedAtByUser[openUser.user_id])}
          lastSignInAt={lastSignInByUser[openUser.user_id] ?? null}
          currentUserId={profile?.user_id}
          viewerIsSuperadmin={!!profile?.is_superadmin}
          actionBusy={submitting}
          onClose={() => setOpenUserId(null)}
          onRequestToggleAdmin={requestAdminToggle}
          onRequestToggleActive={requestToggleActive}
          onRequestRegenerateLink={requestRegenerateLink}
          onRequestRegeneratePassword={requestRegeneratePassword}
          onRequestDelete={requestDelete}
          onSaveProfile={saveProfile}
        />
      )}

      {linkPanel && (
        <ActivationLinkPanel
          title={linkPanel.title}
          description={linkPanel.description}
          link={linkPanel.link}
          onClose={() => setLinkPanel(null)}
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="Eliminar usuario"
        message={pendingDelete && (
          <>
            Se eliminará la cuenta de <strong>{pendingDelete.nickname}</strong> y todos sus datos
            (escuelas, tarifas, movimientos...) de forma permanente. Esta acción no se puede deshacer.
            <br />
            Si solo quieres revocarle el acceso conservando sus datos, usa "Desactivar" en su lugar.
          </>
        )}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={submitting}
        confirmLabel="Eliminar"
        danger
      />

      <ConfirmDialog
        open={!!pendingToggleActive}
        title="Desactivar usuario"
        message={pendingToggleActive && (
          <>
            <strong>{pendingToggleActive.nickname}</strong> dejará de poder iniciar sesión. Todos sus datos
            (escuelas, tarifas, movimientos...) se conservan intactos — puedes reactivarlo cuando quieras
            generándole un enlace de activación nuevo.
          </>
        )}
        onConfirm={confirmToggleActive}
        onCancel={cancelToggleActive}
        loading={submitting}
        confirmLabel="Desactivar"
        danger={false}
      />

      <ConfirmDialog
        open={!!pendingRegenerateLink}
        title="Generar enlace de activación"
        message={pendingRegenerateLink && (
          <>
            Se generará un enlace nuevo de un solo uso para <strong>{pendingRegenerateLink.nickname}</strong>.
            Cualquier enlace anterior deja de servir. La cuenta no gana acceso hasta que lo complete.
          </>
        )}
        onConfirm={confirmRegenerateLink}
        onCancel={cancelRegenerateLink}
        loading={submitting}
        confirmLabel="Generar enlace"
        danger={false}
      />

      <ConfirmDialog
        open={!!pendingRegeneratePassword}
        title="Regenerar contraseña"
        message={pendingRegeneratePassword && (
          <>
            La contraseña actual de <strong>{pendingRegeneratePassword.nickname}</strong> dejará de funcionar de
            inmediato. Deberá crear una nueva desde un enlace de activación nuevo — sus datos no se ven afectados.
          </>
        )}
        onConfirm={confirmRegeneratePassword}
        onCancel={cancelRegeneratePassword}
        loading={submitting}
        confirmLabel="Regenerar"
        danger={false}
      />
    </div>
  );
}

// Pagos ya no vive aquí — es pantalla secundaria propia, alcanzable desde
// la tarjeta "Pendiente de cobrar" de Home (ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md).
//
// Menú agrupado en vez de pestañas horizontales (rediseño 2026-08-29, ver
// docs/ADR/0008-rediseno-configuracion.md): con 9 secciones entre negocio y
// administración, una barra de pestañas no cabía en móvil sin scroll
// horizontal ni dejaba sitio para separar "para cualquiera" de "solo para
// quien administra". Un menú de dos grupos con drill-down (patrón de
// Ajustes de iOS/Android — un estándar de plataforma, no una invención
// propia) resuelve ambas cosas y deja hueco natural para un futuro grupo de
// personalización (widgets de Home/Resumen) sin rediseñar esta pantalla
// otra vez: solo añadir una fila más. El "‹ Configuración" de dentro de una
// sección y el "✕ Cerrar" de la cabecera exterior (ver App.jsx) son dos
// niveles de navegación independientes — el primero vuelve al menú, el
// segundo sale de Configuración entera desde cualquier nivel.
//
// "Actividades" se muestra aquí como "Cursos" (fase 1 del rename de
// docs/BACKLOG.md: solo texto de UI, sin tocar props/variables internas
// como `activities`/`activityColor` — esa es la fase 2, deliberadamente no
// incluida en este cambio).
const BUSINESS_SECTIONS = [
  { key: "escuelas", label: "Escuelas", icon: Building2, description: "Dónde impartes, con su color" },
  { key: "cursos", label: "Cursos", icon: GraduationCap, description: "Qué impartes, con su color" },
  { key: "tarifas", label: "Tarifas", icon: Coins, description: "Cuánto cobras por escuela y curso" },
];
const ADMIN_SECTIONS = [
  { key: "tipos-pago", label: "Tipos de pago", icon: CreditCard, description: "Por persona, por curso..." },
  { key: "estados-pago", label: "Estados de pago", icon: Flag, description: "Pendiente, cobrado..." },
  { key: "monedas", label: "Monedas", icon: DollarSign, description: "Catálogo disponible en toda la app" },
  { key: "navegacion", label: "Colores de navegación", icon: Palette, description: "Identidad visual de cada área" },
  { key: "ajustes", label: "Ajustes generales", icon: SlidersHorizontal, description: "Icono de carga de la app" },
  { key: "usuarios", label: "Usuarios", icon: Users, description: "Cuentas con acceso a la app" },
];

// Sub-navegación de Configuración persistida (feedback explícito
// 2026-08-30: recargar la página dentro de, p. ej., Tarifas devolvía al
// menú principal de Configuración, perdiendo el contexto). Misma vida que
// el resto de la navegación (oceanpulse:navState, App.jsx): sessionStorage,
// sobrevive a una recarga, no a cerrar la pestaña ni a cerrar sesión.
// Clave propia en vez de meterlo en oceanpulse:navState — ConfigTab no
// necesita saber nada de cómo App.jsx guarda tab/returnTab, ni viceversa.
const CONFIG_SECTION_KEY = "oceanpulse:configSection";
function readStoredSection() {
  try { return sessionStorage.getItem(CONFIG_SECTION_KEY) || null; } catch { return null; }
}
export function clearStoredSection() {
  try { sessionStorage.removeItem(CONFIG_SECTION_KEY); } catch { /* no-op */ }
}

function ConfigMenuGroup({ title, items, onSelect }) {
  return (
    <div>
      {title && <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>}
      <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {items.map(({ key, label, icon: Icon, description }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "#F0FDFA", color: TEAL }}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-800">{label}</span>
              <span className="block truncate text-xs text-gray-400">{description}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

// schools / activities / currencies / paymentTypes / paymentStatuses / navSections / appConfig: hooks de useSupabaseTable
// rates / commissionRates / worklog / comisiones: hooks que necesitan las secciones Tarifas y Pagos, embebidas aquí
// profile: fila propia de profiles (useSession) — is_admin/is_superadmin deciden qué secciones se ven
// onClose (opcional): cierra Configuración entera (mismo handler que la "X"
// de la cabecera, ver App.jsx) — lo dispara el gesto de "atrás" cuando ya
// estamos en el menú principal, sin ninguna sección abierta (ver backProps).
export default function ConfigTab({ schools, activities, currencies, paymentTypes, paymentStatuses, rates, commissionRates, worklog, comisiones, navSections, appConfig, profile, onClose }) {
  const isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
  const allowedSectionKeys = [...BUSINESS_SECTIONS, ...(isAdmin ? ADMIN_SECTIONS : [])].map((s) => s.key);
  const [section, setSectionState] = useState(() => {
    const stored = readStoredSection();
    return allowedSectionKeys.includes(stored) ? stored : null;
  });
  const setSection = (next) => {
    setSectionState(next);
    if (next) { try { sessionStorage.setItem(CONFIG_SECTION_KEY, next); } catch { /* no-op */ } }
    else clearStoredSection();
  };
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  const currentLabel = [...BUSINESS_SECTIONS, ...ADMIN_SECTIONS].find((s) => s.key === section)?.label;
  // Deslizar hacia la derecha = "atrás", recursivo (feedback explícito
  // 2026-08-30: "no como una excepción, no como un truco, no como una
  // interacción aislada"): dentro de una sección, vuelve al menú; ya en el
  // menú, cierra Configuración entera — el mismo gesto en cualquier nivel.
  const backProps = useSwipeBack(section == null ? onClose : () => setSection(null));

  if (section == null) {
    return (
      <div className="space-y-5" {...backProps}>
        <ConfigMenuGroup items={BUSINESS_SECTIONS} onSelect={setSection} />
        {isAdmin && <ConfigMenuGroup title="Administración" items={ADMIN_SECTIONS} onSelect={setSection} />}
      </div>
    );
  }

  return (
    <div className="space-y-3" {...backProps}>
      <button
        onClick={() => setSection(null)}
        className="-ml-2 flex min-h-11 items-center gap-1 rounded px-2 text-sm font-medium"
        style={{ color: TEAL }}
      >
        <ChevronLeft size={18} aria-hidden="true" /> Configuración
      </button>
      <h2 className="-mt-1 text-base font-semibold" style={{ color: NAVY }}>{currentLabel}</h2>

      {section === "escuelas" && (
        <CrudTable createLabel="Nueva escuela" editLabel="Editar escuela" table={schools} hasDefault
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {section === "cursos" && (
        <CrudTable createLabel="Nuevo curso" editLabel="Editar curso" table={activities} hasDefault searchable pullDefaultOut colorizeText
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {section === "tarifas" && (
        <RatesTab
          schools={schools} activities={activities} paymentTypes={paymentTypes} currencies={currencies}
          rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones}
          accentColor={sectionColor("rates")}
        />
      )}
      {isAdmin && section === "tipos-pago" && (
        <CrudTable createLabel="Nuevo tipo de pago" editLabel="Editar tipo de pago" table={paymentTypes} hasDefault fields={[{ key: "name", label: "Nombre" }]} />
      )}
      {isAdmin && section === "estados-pago" && (
        <CrudTable createLabel="Nuevo estado de pago" editLabel="Editar estado de pago" table={paymentStatuses} hasDefault protectDefaultFromDelete
          fields={[{ key: "name", label: "Nombre" }, { key: "color", label: "Color", type: "color", required: false }]} />
      )}
      {isAdmin && section === "monedas" && (
        <CrudTable createLabel="Nueva moneda" editLabel="Editar moneda" table={currencies} pkField="code" hasDefault searchable pullDefaultOut
          fields={[{ key: "code", label: "Código (ej. EUR)" }, { key: "name", label: "Nombre" }, { key: "symbol", label: "Símbolo" }]} />
      )}
      {isAdmin && section === "navegacion" && <SectionColors navSections={navSections} />}
      {isAdmin && section === "ajustes" && <GeneralSettings appConfig={appConfig} />}
      {isAdmin && section === "usuarios" && <UsersDirectory profile={profile} />}
    </div>
  );
}
