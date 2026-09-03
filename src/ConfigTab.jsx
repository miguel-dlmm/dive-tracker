import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { motion, useAnimationControls } from "motion/react";
import {
  Plus, Check, Star, Search, Lock, UserPlus, X, Trash2, Pencil, Copy, KeyRound,
  ChevronRight, ChevronLeft, Building2, GraduationCap, Coins,
  Flag, DollarSign, Palette, SlidersHorizontal, Users, Shield, ShieldCheck, Database, Link2, Loader2,
} from "lucide-react";
import { NAVY, TEAL, GREEN, SUN, CORAL } from "./App";
import { useToast, AppLoading, Field, ConfirmDialog, EditActions, Select, RowMenu, Sheet, Fab, shortDate, BooleanToggle } from "./shared";
import { usePrefersReducedMotion, useSwipeBack } from "./motion";
import { supabase } from "./supabaseClient";
import i18n from "./i18n";
import RatesTab from "./RatesTab";
import DatasetsSection from "./DatasetsSection";

const inputCls = "min-h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-gray-400";

// Backlog: "Animación de salida completa en UserDetailSheet/CreateUserSheet/
// ActivationLinkPanel" — las 3 hojas las MONTABA/DESMONTABA por completo su
// padre ({cond && <Hoja/>}), así que Motion nunca llegaba a terminar la
// transición de salida (React desmonta el árbol entero antes de que
// AnimatePresence pueda animar el cierre). El patrón correcto (ya probado en
// MovementSheet.jsx) es mantener la hoja siempre montada y pasarle `open`
// como prop — pero eso significa que, en el instante de cerrar, el propio
// padre ya ha puesto a null el dato real (el usuario, el enlace) mientras
// la animación de salida SIGUE en pantalla un momento más. useRetained
// recuerda el último valor no-nulo para que la hoja no se quede en blanco
// a mitad de esa animación.
function useRetained(value) {
  const ref = useRef(value);
  if (value != null) ref.current = value;
  return ref.current;
}

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
 * (Escuelas, Cursos, Estados de pago, Monedas). Crear y
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
function CrudTable({ createLabel, editLabel, table, pkField = "id", fields, hasDefault = false, searchable = false, pullDefaultOut = false, colorizeText = false, protectDefaultFromDelete = false, description, defaultLabel }) {
  const { t } = useTranslation("config");
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
        toast?.success(t("crudTable.cambiosGuardados"));
      } else {
        await table.insertRow(form);
        toast?.success(t("crudTable.anadidoCorrectamente"));
      }
      closeSheet();
    } catch {
      toast?.error(t("crudTable.noSePudoGuardar"));
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
      toast?.error(t("crudTable.noSePudoGuardarCambio"));
    }
  };

  const renderColorField = (row, f) => (
    <input
      key={f.key}
      type="color"
      value={row[f.key]}
      onChange={(e) => updateLive(row[pkField], { [f.key]: e.target.value })}
      title={t("crudTable.cambiarColor")}
      className="h-9 w-11 shrink-0 cursor-pointer rounded border border-gray-200"
    />
  );

  return (
    <div className="space-y-3 pb-16">
      {description && <p className="text-xs text-gray-400">{description}</p>}
      {(searchable || (pullDefaultOut && defaultRow)) && (
        <div className="space-y-3">
          {searchable && (
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-3.5 text-gray-400" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("crudTable.buscarPlaceholder")} aria-label={t("crudTable.buscarAria")} className={`${inputCls} w-full pl-9`} />
            </div>
          )}
          {pullDefaultOut && defaultRow && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
              <Star size={14} className="shrink-0 text-amber-500" fill="currentColor" aria-hidden="true" />
              <span className="shrink-0 text-xs font-medium text-amber-700">{defaultLabel || t("crudTable.favorita")}</span>
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
                <button onClick={() => table.setDefault(pk)} title={t("crudTable.marcarPredeterminado")} aria-label={t("crudTable.marcarPredeterminado")}
                  className={`-m-2 flex min-h-11 min-w-11 items-center justify-center rounded p-2 ${row.is_default ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}>
                  <Star size={15} fill={row.is_default ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              )}
              <RowMenu
                onEdit={() => openEditSheet(row)}
                onDelete={() => table.deleteRow(pk)}
                itemLabel={row.name ? `"${row.name}"` : t("crudTable.esteElemento")}
                deleteDisabled={isProtected}
                // Sin esto, borrar el estado predeterminado deja el catálogo
                // sin ningún is_default=true — para Estados de pago eso no es
                // un detalle de UX menor: is_default es el único campo con el
                // que la app decide qué cuenta como "pendiente" (ver
                // isPendingStatus, shared.jsx), así que perderlo rompe el
                // bucket de pendientes/cobrados de toda la app, no solo el
                // valor por defecto de un formulario.
                deleteDisabledReason={isProtected ? t("crudTable.estadoPredeterminadoRazon") : undefined}
              />
            </li>
          );
        })}
        {filteredRows.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-400">{t("crudTable.sinResultados")}</li>}
      </ul>

      <Fab onClick={openCreateSheet} label={createLabel} color={TEAL} />

      <Sheet open={sheetOpen} onClose={closeSheet}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{editingRow ? (editLabel || createLabel) : createLabel}</h3>
          <button onClick={closeSheet} aria-label={t("crudTable.cerrar")} className="text-gray-400"><X size={19} /></button>
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
          {editingRow ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} {t("crudTable.guardar")}
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
  const { t } = useTranslation("config");
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-3 text-xs text-gray-400">{t("sectionColors.descripcion")}</p>
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
  const { t } = useTranslation("config");
  const row = appConfig.rows[0];
  const toast = useToast();
  if (!row) return null;

  const setIcon = async (name) => {
    try {
      await appConfig.updateRow(true, { logo_icon: name });
      toast?.success(t("generalSettings.iconoActualizado"));
    } catch {
      toast?.error(t("generalSettings.noSePudoGuardar"));
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-800">{t("generalSettings.iconoCarga")}</h3>
      <p className="mb-3 text-xs text-gray-400">{t("generalSettings.descripcion")}</p>
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
        <span className="text-xs text-gray-400">{t("generalSettings.vistaPrevia")}</span>
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
  const { t } = useTranslation("config");
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const enabled = !!row.allow_external_registration;

  const toggle = async () => {
    setSaving(true);
    try {
      await appConfig.updateRow(true, { allow_external_registration: !enabled });
      toast?.success(enabled ? t("externalRegistration.desactivado") : t("externalRegistration.activado"));
    } catch {
      toast?.error(t("externalRegistration.noSePudoGuardar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{t("externalRegistration.titulo")}</h3>
          <p className="mt-0.5 text-xs text-gray-400">{t("externalRegistration.descripcion")}</p>
        </div>
        <BooleanToggle checked={enabled} onChange={toggle} disabled={saving} ariaLabel={t("externalRegistration.titulo")} />
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
  const { t } = useTranslation("config");
  const editable = !locked && !!onChange;
  return (
    <span
      className="inline-flex items-center gap-1"
      title={locked ? t("roleCheckbox.rolProtegido", { label }) : label}
    >
      <input
        type="checkbox"
        checked={!!checked}
        disabled={!editable}
        onChange={editable ? onChange : undefined}
        aria-label={t("roleCheckbox.etiquetaAria", { label, value: checked ? t("roleCheckbox.si") : t("roleCheckbox.no") })}
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

// label se resuelve en render vía t(`userStatus.${status}`) (namespace "config").
const STATUS_META = {
  activo: { cls: "bg-emerald-50 text-emerald-700", dot: "#10B981" },
  pendiente: { cls: "bg-amber-50 text-amber-700", dot: "#D97706" },
  // text-gray-600, no -500 (Bloque 11, accesibilidad): gray-500 sobre
  // gray-100 da ~4.4:1 de contraste, justo por debajo del 4.5:1 mínimo
  // AA para texto normal (12px, no es "texto grande") — comprobado con la
  // fórmula de contraste relativo de WCAG. gray-600 sube a ~6.9:1.
  desactivado: { cls: "bg-gray-100 text-gray-600", dot: "#9CA3AF" },
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
  const { t } = useTranslation("config");
  const meta = STATUS_META[status] || STATUS_META.desactivado;
  return (
    <span className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden="true" />
      {t(`userStatus.${status in STATUS_META ? status : "desactivado"}`)}
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
  const { t } = useTranslation("config");
  if (isSuperadmin) return <ShieldCheck size={14} className="shrink-0" style={{ color: SUN }} role="img" aria-label={t("roleIcon.superadmin")} />;
  if (isAdmin) return <Shield size={14} className="shrink-0" style={{ color: NAVY }} role="img" aria-label={t("roleIcon.admin")} />;
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
// Fecha + hora, para "último login real" — una fecha sola no basta para
// distinguir "hace 5 minutos" de "hace 20 horas" el mismo día.
// neverLabel: la pantalla llamadora resuelve la traducción de "Nunca" con
// t("userStatus.nunca") (namespace "config") — esta función es pura, fuera
// de cualquier componente, no puede usar useTranslation() directamente.
function shortDateTime(iso, neverLabel) {
  return iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : neverLabel;
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
// petición original; también en docs/BACKLOG.md desde 2026-08-29):
// implementada en el Bloque 11 (2026-09-01) — profiles.deactivated_at,
// escrita por setUserActive.js al desactivar y limpiada a null por
// regenerateActivationLink.js/regeneratePassword.js al reactivar (ver
// schema.sql). `banned_until` (Supabase Auth) no servía para derivarla:
// guarda cuándo TERMINARÍA el baneo, no cuándo empezó.
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
const SWIPE_SPRING = { type: "spring", stiffness: 500, damping: 40 };

function SwipeToDeleteRow({ children, onDelete, deleteLabel }) {
  const { t } = useTranslation("config");
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  // controls, no solo el prop `animate` ligado a `open`: si se arrastra
  // poco (por debajo del umbral) y se suelta, `open` no cambia de valor
  // (false -> false), así que un `animate={{x: open ? -80 : 0}}` ligado
  // solo al estado no dispara ninguna animación nueva — Motion compara el
  // OBJETIVO, no la posición visual real tras soltar, y la fila se queda
  // a mitad de camino de donde se soltó el dedo, sin volver a cerrarse.
  // Bug real reportado por el usuario. Llamar a controls.start(...)
  // explícitamente en onDragEnd fuerza el snap siempre, cambie o no el
  // estado.
  const controls = useAnimationControls();
  if (reduced) return children;
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-20" style={{ backgroundColor: CORAL }}>
        <button
          onClick={() => { setOpen(false); controls.start({ x: 0, transition: SWIPE_SPRING }); onDelete(); }}
          aria-label={deleteLabel}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-white"
        >
          <Trash2 size={18} aria-hidden="true" />
          <span className="text-[10px] font-medium">{t("swipeToDelete.eliminar")}</span>
        </button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        animate={controls}
        initial={{ x: 0 }}
        onDragEnd={(_, info) => {
          const shouldOpen = info.offset.x < -40;
          setOpen(shouldOpen);
          controls.start({ x: shouldOpen ? -80 : 0, transition: SWIPE_SPRING });
        }}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </div>
  );
}

function UserListRow({ user, status, lastSignInAt, deactivatedAt, onOpen }) {
  const { t } = useTranslation("config");
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
        {/* Último acceso en vez de fecha de alta (pedido explícito del
            usuario) — "cuándo se dio de alta" dice poco de si la cuenta
            sigue viva; "cuándo entró por última vez" sí. */}
        <div>{t("userListRow.ultimoAcceso", { date: shortDateTime(lastSignInAt, t("userStatus.nunca")) })}</div>
        {status === "desactivado" && (
          <div className="mt-0.5 italic">{t("userListRow.baja", { date: deactivatedAt ? shortDate(deactivatedAt) : t("userListRow.fechaNoRegistrada") })}</div>
        )}
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
  open, user: userProp, status: statusProp, lastSignInAt: lastSignInAtProp, deactivatedAt: deactivatedAtProp,
  currentUserId, viewerIsSuperadmin, actionBusy,
  onClose, onRequestToggleAdmin, onRequestToggleActive, onRequestRegenerateLink,
  onRequestRegeneratePassword, onRequestDelete, onSaveProfile,
}) {
  const { t } = useTranslation("config");
  // Retenidos juntos (mismo snapshot) porque están relacionados entre sí —
  // ver useRetained arriba. Antes de la primera apertura no hay nada que
  // retener todavía, la hoja no debe montar ningún contenido real. Los
  // props llegan con sufijo *Prop porque el resto del render de abajo
  // sigue usando los nombres cortos (user/status/...) tal cual, ahora
  // apuntando al snapshot retenido — ver el shadowing explícito más abajo.
  const snapshot = useRetained(userProp ? { user: userProp, status: statusProp, lastSignInAt: lastSignInAtProp, deactivatedAt: deactivatedAtProp } : null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", nickname: "" });
  // Cierra siempre sin edición pendiente — reabrir (el mismo usuario u
  // otro distinto) debe partir en blanco, igual que antes cuando cada
  // apertura remontaba el componente desde cero. Todos los hooks van ANTES
  // del "return null" de abajo (nunca condicionales) — reglas de hooks.
  useEffect(() => {
    if (!open) setEditingProfile(false);
  }, [open]);

  if (!snapshot) return null;
  // Shadowing intencionado: el resto del render de abajo ya usa
  // user/status/lastSignInAt/deactivatedAt tal cual (sin tocar), ahora
  // apuntando al snapshot retenido en vez de a los props crudos — así no
  // hace falta renombrar cada referencia en todo el cuerpo del componente.
  const { user, status, lastSignInAt, deactivatedAt } = snapshot;
  const editable = viewerIsSuperadmin && user.user_id !== currentUserId && !user.is_superadmin;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";

  const startEditProfile = () => {
    setProfileForm({ first_name: user.first_name || "", last_name: user.last_name || "", nickname: user.nickname || "" });
    setEditingProfile(true);
  };
  const saveProfile = async () => {
    const ok = await onSaveProfile(user, profileForm);
    if (ok) setEditingProfile(false);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{user.nickname}</h3>
        <button onClick={onClose} aria-label={t("userDetailSheet.cerrar")} className="text-gray-400"><X size={19} /></button>
      </div>

      {editingProfile ? (
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("userDetailSheet.nombre")}>
                <input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} className={`${inputCls} w-full`} />
              </Field>
              <Field label={t("userDetailSheet.apellidos")}>
                <input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} className={`${inputCls} w-full`} />
              </Field>
              <div className="col-span-2">
                <Field label={t("userDetailSheet.nickname")}>
                  <input value={profileForm.nickname} onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })} className={`${inputCls} w-full`} />
                </Field>
              </div>
            </div>
            <EditActions onSave={saveProfile} onCancel={() => setEditingProfile(false)} />
          </div>
        ) : (
          <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50/60 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">{t("userDetailSheet.nombre")}</span>
              <span className="truncate text-right text-gray-700">{fullName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">{t("userDetailSheet.email")}</span>
              <span className="truncate text-right text-gray-700">{user.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">{t("userDetailSheet.altaLabel")}</span>
              <span className="text-gray-700">{shortDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs text-gray-400">{t("userDetailSheet.ultimoAcceso")}</span>
              <span className="text-gray-700">{shortDateTime(lastSignInAt, t("userStatus.nunca"))}</span>
            </div>
            {status === "desactivado" && (
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs text-gray-400">{t("userDetailSheet.baja")}</span>
                <span className={deactivatedAt ? "text-gray-700" : "italic text-gray-400"}>
                  {deactivatedAt ? shortDateTime(deactivatedAt, t("userStatus.nunca")) : t("userDetailSheet.fechaNoRegistrada")}
                </span>
              </div>
            )}
            {editable && (
              <button onClick={startEditProfile} className="flex min-h-9 items-center gap-1 text-xs font-semibold" style={{ color: TEAL }}>
                <Pencil size={13} aria-hidden="true" /> {t("userDetailSheet.editarDatos")}
              </button>
            )}
          </div>
        )}

        <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">{t("userDetailSheet.estado")}</span>
              <StatusBadge status={status} />
            </div>
            <BooleanToggle
              checked={status !== "desactivado"}
              disabled={!editable || actionBusy}
              ariaLabel={status === "desactivado" ? t("userDetailSheet.activarUsuario") : t("userDetailSheet.desactivarUsuario")}
              onChange={() => (status === "desactivado" ? onRequestRegenerateLink(user) : onRequestToggleActive(user))}
            />
          </div>
          {status === "pendiente" && editable && (
            <p className="text-xs text-gray-400">
              {t("userDetailSheet.pendienteTexto")}{" "}
              <button onClick={() => onRequestRegenerateLink(user)} disabled={actionBusy} className="font-semibold underline disabled:opacity-40" style={{ color: TEAL }}>
                {t("userDetailSheet.regenerarEnlace")}
              </button>
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t("userDetailSheet.admin")}</span>
            <RoleCheckbox checked={user.is_admin} label={t("userDetailSheet.admin")} onChange={editable ? () => onRequestToggleAdmin(user) : undefined} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">{t("userDetailSheet.superadmin")}</span>
            <RoleCheckbox checked={user.is_superadmin} label={t("userDetailSheet.superadmin")} locked />
          </div>
        </div>

        {editable && (
          <button
            onClick={() => onRequestRegeneratePassword(user)}
            disabled={actionBusy}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40"
          >
            <KeyRound size={15} aria-hidden="true" /> {t("userDetailSheet.regenerarContrasena")}
          </button>
        )}

        {editable && (
          <button
            onClick={() => onRequestDelete(user)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 text-sm font-medium text-red-600"
          >
            <Trash2 size={15} aria-hidden="true" /> {t("userDetailSheet.eliminarUsuario")}
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
// hideMockEmailButton (Release V1, 2026-09-02): el botón "simular envío"
// de más abajo solo tiene sentido cuando ESTE panel es el fallback de un
// intento real de enviar un email (alta, regenerar enlace/contraseña) —
// generar un enlace de invitación nunca intenta enviar ningún email, así
// que mostrarlo ahí sería confuso, no solo temporalmente irrelevante.
function ActivationLinkPanel({ open, title: titleProp, description: descriptionProp, link: linkProp, onClose, hideMockEmailButton: hideMockEmailButtonProp = false }) {
  const { t } = useTranslation("config");
  const toast = useToast();
  // Ver useRetained arriba — sin esto, el panel se quedaría en blanco a
  // mitad de la animación de cierre (el padre ya pone `linkPanel` a null
  // en el instante de cerrar). El resto del render sigue usando los
  // nombres cortos (title/description/link/hideMockEmailButton), ahora
  // apuntando al snapshot retenido — ver el shadowing explícito abajo.
  const snapshot = useRetained(linkProp ? { title: titleProp, description: descriptionProp, link: linkProp, hideMockEmailButton: hideMockEmailButtonProp } : null);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.link);
      toast?.success(t("activationLinkPanel.enlaceCopiado"));
    } catch {
      toast?.error(t("activationLinkPanel.noSePudoCopiar"));
    }
  };
  if (!snapshot) return null;
  const { title, description, link, hideMockEmailButton } = snapshot;
  return (
    // z-50: puede convivir con UserDetailSheet (z-40) todavía abierta detrás
    // (p. ej. tras "Regenerar enlace" desde el propio detalle) — debe
    // quedar por encima, no reemplazarla.
    <Sheet open={open} onClose={onClose} zIndexClass="z-50">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button onClick={onClose} aria-label={t("activationLinkPanel.cerrar")} className="text-gray-400"><X size={19} /></button>
      </div>
      <p className="mb-2 text-xs text-gray-500">{description}</p>
      <p className="mb-3 break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">{link}</p>
      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: TEAL }}
        >
          <Copy size={15} aria-hidden="true" /> {t("activationLinkPanel.copiarEnlace")}
        </button>
        <button onClick={onClose} className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600">
          {t("activationLinkPanel.cerrar")}
        </button>
      </div>
      {/* TEMPORAL — quitar en cuanto el dominio de Resend esté verificado
          (ver conversación 2026-08-31). Simula en la UI que el email SÍ se
          envió, sin llamar a Resend — solo para probar visualmente ese
          camino mientras el dominio sigue sin verificar. No toca ningún
          estado real del backend. */}
      {!hideMockEmailButton && (
        <button
          onClick={() => { toast?.success(t("activationLinkPanel.mockEmailEnviado")); onClose(); }}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-dashed border-amber-300 text-xs font-medium text-amber-700"
        >
          {t("activationLinkPanel.simularEnvioMock")}
        </button>
      )}
    </Sheet>
  );
}

// Directorio de usuarios — de momento solo lectura. Los datos vienen del RPC
// admin_list_profiles (security definer): junta profiles con el email de
// auth.users y solo devuelve filas si quien llama es admin/superadmin — ver
// schema.sql. No es un fetch de la tabla profiles, así que no compite con
// ningún otro hook de useSupabaseTable ya cargado en App.jsx.
const emptyUserForm = { email: "", first_name: "", last_name: "", nickname: "" };

// Idioma de la cuenta nueva — mismo patrón que el desplegable de dataset
// justo abajo: el estado guarda la ETIQUETA visible (siempre en su propio
// idioma nativo, "Español"/"English", nunca traducida — igual que el
// selector de idioma no traduce los nombres de los idiomas en ningún sitio
// de la app) y se resuelve al código real ("es"/"en") en el submit. Por
// defecto, el idioma actual de la interfaz de quien está rellenando el
// formulario (el superadmin) — más natural que forzar "es" siempre: si el
// superadmin ya está trabajando en inglés, es razonable asumir que la
// cuenta que está creando también lo estará, y sigue siendo un desplegable
// editable con un solo toque si no es el caso.
const LANGUAGE_OPTIONS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

// Hoja de creación de usuario — solo visible/usable para superadmin (ver
// UsersDirectory). Llama a la función serverless create-user, que es la
// única pieza con permiso para invocar el Admin API de Supabase Auth.
function CreateUserSheet({ open, onClose, onCreated }) {
  const { t } = useTranslation("config");
  const [form, setForm] = useState(emptyUserForm);
  const [datasetLabel, setDatasetLabel] = useState("");
  const [datasets, setDatasets] = useState([]);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [languageLabel, setLanguageLabel] = useState(
    LANGUAGE_OPTIONS.find((l) => l.code === i18n.language)?.label || LANGUAGE_OPTIONS[0].label
  );
  const [submitting, setSubmitting] = useState(false);
  // Fallback operativo MVP. Permite activar usuarios manualmente si el
  // proveedor de email falla. Revisar/eliminar antes de producción pública.
  // El backend (createUser.js) solo incluye action_link en la respuesta
  // cuando el email NO se ha podido enviar — si el envío funciona, esto
  // nunca se activa y el flujo se comporta como uno normal.
  const [emailFailure, setEmailFailure] = useState(null);
  const toast = useToast();

  // La hoja ahora se queda siempre montada (ver useRetained arriba y el
  // punto de montaje más abajo, "Animación de salida completa") — sin
  // este reset, reabrirla tras cancelar/completar un alta anterior
  // mostraría el formulario a medio rellenar de la vez anterior, en vez
  // de partir en blanco como pasaba antes (remontaje completo cada vez).
  useEffect(() => {
    if (!open) return;
    setForm(emptyUserForm);
    setDatasetLabel("");
    setLanguageLabel(LANGUAGE_OPTIONS.find((l) => l.code === i18n.language)?.label || LANGUAGE_OPTIONS[0].label);
    setEmailFailure(null);
  }, [open]);

  // setup_datasets tiene una policy propia de solo-lectura para admins
  // (ver schema.sql) pensada exactamente para este desplegable — nunca se
  // lee aquí setup_dataset_schools/activities/rates/..., esas siguen
  // cerradas y solo accesibles vía clone_setup_dataset() en el servidor.
  // Condicionado a `open` (antes bastaba con montar el componente, porque
  // el padre solo lo montaba al abrir la hoja): al quedarse siempre
  // montada para animar bien el cierre, sin este guard se pediría el
  // listado de datasets en cuanto se abre "Usuarios", aunque nunca se
  // llegue a pulsar "Crear usuario".
  useEffect(() => {
    if (!open) return;
    let active = true;
    setDatasetsLoading(true);
    supabase.from("setup_datasets").select("key, label").order("label").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error(error);
        toast?.error(t("createUserSheet.noSePudieronCargarDatasets"));
      } else {
        setDatasets(data || []);
      }
      setDatasetsLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast/t no deben re-disparar el fetch
  }, [open]);

  const submit = async () => {
    const dataset = datasets.find((d) => d.label === datasetLabel);
    if (!form.email || !form.nickname || !dataset) {
      toast?.error(t("createUserSheet.camposObligatorios"));
      return;
    }
    const languageCode = LANGUAGE_OPTIONS.find((l) => l.label === languageLabel)?.code;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, dataset_key: dataset.key, language: languageCode }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("createUserSheet.soloSuperadminCrear"), fallback: t("createUserSheet.noSePudoCrear") }));
      if (payload.action_link) {
        toast?.success(t("createUserSheet.usuarioCreadoSinEmail"));
        setEmailFailure(payload);
      } else {
        toast?.success(t("createUserSheet.usuarioCreadoCorrectamente"));
        onCreated();
      }
    } catch (err) {
      toast?.error(err.message || t("createUserSheet.noSePudoCrear"));
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(emailFailure.action_link);
      toast?.success(t("createUserSheet.enlaceCopiado"));
    } catch {
      toast?.error(t("createUserSheet.noSePudoCopiar"));
    }
  };

  // Fallback operativo MVP. Permite activar usuarios manualmente si el
  // proveedor de email falla. Revisar/eliminar antes de producción pública.
  if (emailFailure) {
    return (
      <Sheet open={open} onClose={onCreated}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-700">{t("createUserSheet.noSePudoEnviarEmailTitulo")}</h3>
          <button onClick={onCreated} aria-label={t("createUserSheet.cerrar")} className="text-gray-400"><X size={19} /></button>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          {t("createUserSheet.noSePudoEnviarEmailDescripcion")}
        </p>
        <p className="mb-3 break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">{emailFailure.action_link}</p>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: TEAL }}
          >
            {t("createUserSheet.copiarEnlace")}
          </button>
          <button
            onClick={onCreated}
            className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-gray-200 text-sm font-medium text-gray-600"
          >
            {t("createUserSheet.cerrar")}
          </button>
        </div>
        {/* TEMPORAL — quitar en cuanto el dominio de Resend esté verificado
            (ver conversación 2026-08-31). Simula en la UI que el email SÍ se
            envió, sin llamar a Resend — solo para probar visualmente ese
            camino mientras el dominio sigue sin verificar. No toca ningún
            estado real del backend. */}
        <button
          onClick={() => { toast?.success(t("createUserSheet.mockUsuarioCreado")); onCreated(); }}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-dashed border-amber-300 text-xs font-medium text-amber-700"
        >
          {t("createUserSheet.simularEnvioMock")}
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={() => !submitting && onClose()}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{t("createUserSheet.titulo")}</h3>
        <button onClick={() => !submitting && onClose()} aria-label={t("createUserSheet.cerrar")} className="text-gray-400"><X size={19} /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Field label={t("createUserSheet.email")}>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} w-full`} />
          </Field>
        </div>
        <Field label={t("createUserSheet.nombre")}>
          <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={`${inputCls} w-full`} />
        </Field>
        <Field label={t("createUserSheet.apellidos")}>
          <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={`${inputCls} w-full`} />
        </Field>
        <Field label={t("createUserSheet.nickname")}>
          <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={`${inputCls} w-full`} />
        </Field>
        <div className="col-span-2">
          <Field label={t("createUserSheet.datasetInicial")}>
            <Select
              value={datasetLabel}
              onChange={setDatasetLabel}
              options={datasets.map((d) => d.label)}
              placeholder={datasetsLoading ? t("createUserSheet.cargando") : datasets.length ? t("createUserSheet.seleccionaDataset") : t("createUserSheet.sinDatasets")}
            />
          </Field>
        </div>
        <div className="col-span-2">
          {/* Idioma de la cuenta nueva — encargo explícito de Fase 2
              (multidioma): añadir el idioma preferido también al alta de
              usuario por admin, no solo al registro. Ver LANGUAGE_OPTIONS
              arriba para el porqué del valor por defecto. */}
          <Field label={t("createUserSheet.idioma")}>
            <Select
              value={languageLabel}
              onChange={setLanguageLabel}
              options={LANGUAGE_OPTIONS.map((l) => l.label)}
            />
          </Field>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {t("createUserSheet.nota")}
      </p>

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: TEAL }}
      >
        <UserPlus size={16} /> {submitting ? t("createUserSheet.creando") : t("createUserSheet.crearUsuario")}
      </button>
    </Sheet>
  );
}

function UsersDirectory({ profile }) {
  const { t } = useTranslation("config");
  const [rows, setRows] = useState([]);
  const [activeByUser, setActiveByUser] = useState({});
  const [lastSignInByUser, setLastSignInByUser] = useState({});
  const [activatedAtByUser, setActivatedAtByUser] = useState({});
  const [deactivatedAtByUser, setDeactivatedAtByUser] = useState({});
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
  const [generatingInvitation, setGeneratingInvitation] = useState(false);
  const toast = useToast();

  const applyResult = ({ data, error }) => {
    if (error) {
      // Se muestra el mensaje real de Postgres/PostgREST (no uno genérico)
      // porque el motivo casi siempre es diagnosticable desde aquí mismo:
      // función inexistente en la BD todavía, falta de grant, etc.
      console.error(error);
      setLoadError(error.message || t("usersDirectory.errorDesconocido"));
      toast?.error(t("usersDirectory.noSePudoCargarListado"));
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

  // activated_at/deactivated_at no están en admin_list_profiles() — se
  // consultan aparte (RLS de profiles ya permite a un admin leer
  // cualquier fila, ver ADR de esta sesión) y se cruzan por user_id en el
  // cliente, para no tocar esa función por este requisito. Igual de
  // silencioso que loadActiveStatus: un fallo aquí no debe tumbar el
  // resto del directorio.
  const loadAccountDates = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("user_id, activated_at, deactivated_at");
      if (error) throw error;
      const activatedMap = {};
      const deactivatedMap = {};
      (data || []).forEach((r) => { activatedMap[r.user_id] = r.activated_at; deactivatedMap[r.user_id] = r.deactivated_at; });
      setActivatedAtByUser(activatedMap);
      setDeactivatedAtByUser(deactivatedMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    supabase.rpc("admin_list_profiles").then((result) => { if (active) applyResult(result); });
    loadActiveStatus();
    loadAccountDates();
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
    loadAccountDates();
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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("usersDirectory.soloSuperadminRol"), fallback: t("usersDirectory.noSePudoActualizarRol") }));
      toast?.success(t("usersDirectory.rolActualizado"));
      setPendingToggle(null);
      reload();
    } catch (err) {
      toast?.error(err.message || t("usersDirectory.noSePudoActualizarRol"));
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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("usersDirectory.soloSuperadminEliminar"), fallback: t("usersDirectory.noSePudoEliminar") }));
      toast?.success(t("usersDirectory.usuarioEliminado"));
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
      toast?.error(err.message || t("usersDirectory.noSePudoEliminar"));
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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("usersDirectory.soloSuperadminActivar"), fallback: t("usersDirectory.noSePudoActualizarEstado") }));
      toast?.success(t("usersDirectory.usuarioDesactivado"));
      setPendingToggleActive(null);
      loadActiveStatus();
      loadAccountDates();
    } catch (err) {
      toast?.error(err.message || t("usersDirectory.noSePudoActualizarEstado"));
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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("usersDirectory.soloSuperadminEnlace"), fallback: t("usersDirectory.noSePudoGenerarEnlace") }));
      // El backend ya intenta enviar el email automáticamente — el panel con
      // el enlace para copiar solo aparece si el envío falla (mismo patrón
      // que CreateUserSheet más abajo).
      if (payload.action_link) {
        toast?.success(t("usersDirectory.enlaceGeneradoSinEmail", { nickname: pendingRegenerateLink.nickname }));
        setLinkPanel({
          title: t("usersDirectory.enlaceActivacionTitulo"),
          description: t("usersDirectory.enlaceActivacionDescripcion", { nickname: pendingRegenerateLink.nickname }),
          link: payload.action_link,
        });
      } else {
        toast?.success(t("usersDirectory.emailActivacionEnviado", { nickname: pendingRegenerateLink.nickname }));
      }
      setPendingRegenerateLink(null);
      loadActiveStatus();
      loadAccountDates();
    } catch (err) {
      toast?.error(err.message || t("usersDirectory.noSePudoGenerarEnlace"));
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
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("usersDirectory.soloSuperadminContrasena"), fallback: t("usersDirectory.noSePudoRegenerarContrasena") }));
      // El backend ya intenta enviar el email automáticamente — el panel con
      // el enlace para copiar solo aparece si el envío falla (mismo patrón
      // que CreateUserSheet más abajo).
      if (payload.action_link) {
        toast?.success(t("usersDirectory.contrasenaRegeneradaSinEmail", { nickname: pendingRegeneratePassword.nickname }));
        setLinkPanel({
          title: t("usersDirectory.contrasenaRegeneradaTitulo"),
          description: t("usersDirectory.contrasenaRegeneradaDescripcion", { nickname: pendingRegeneratePassword.nickname }),
          link: payload.action_link,
        });
      } else {
        toast?.success(t("usersDirectory.contrasenaRegeneradaEmailEnviado", { nickname: pendingRegeneratePassword.nickname }));
      }
      setPendingRegeneratePassword(null);
      loadActiveStatus();
      loadAccountDates();
    } catch (err) {
      toast?.error(err.message || t("usersDirectory.noSePudoRegenerarContrasena"));
    } finally {
      setSubmitting(false);
    }
  };

  // Enlace de invitación (Release V1, 2026-09-02) — permite autoregistrarse
  // aunque app_config.allow_external_registration esté desactivado, sin
  // dar de alta la cuenta directamente (a diferencia de "Crear usuario", el
  // superadmin no elige nombre/email/dataset aquí; el resultado se muestra
  // en el mismo ActivationLinkPanel que ya usan regenerar enlace/contraseña).
  const generateInvitationLink = async () => {
    setGeneratingInvitation(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/generate-invitation-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(actionErrorMessage(res, payload, { forbidden: t("usersDirectory.soloSuperadminInvitacion"), fallback: t("usersDirectory.noSePudoGenerarInvitacion") }));
      setLinkPanel({
        title: t("usersDirectory.enlaceInvitacionTitulo"),
        description: t("usersDirectory.enlaceInvitacionDescripcion"),
        link: payload.invitation_link,
        hideMockEmailButton: true,
      });
    } catch (err) {
      toast?.error(err.message || t("usersDirectory.noSePudoGenerarInvitacion"));
    } finally {
      setGeneratingInvitation(false);
    }
  };

  // RLS de profiles ya permite a un admin actualizar cualquier fila salvo
  // is_admin/is_superadmin (protegidos aparte por trigger) — no hace falta
  // ningún endpoint de servidor nuevo para nombre/apellidos/nickname.
  const saveProfile = async (user, form) => {
    const nickname = form.nickname.trim();
    if (!nickname) {
      toast?.error(t("usersDirectory.nicknameVacio"));
      return false;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: form.first_name.trim() || null, last_name: form.last_name.trim() || null, nickname })
        .eq("user_id", user.user_id);
      if (error) throw error;
      toast?.success(t("usersDirectory.datosActualizados"));
      reload();
      return true;
    } catch (err) {
      console.error(err);
      toast?.error(t("usersDirectory.noSePudieronGuardarCambios"));
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
            placeholder={t("usersDirectory.buscarPlaceholder")}
            aria-label={t("usersDirectory.buscarAria")}
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
            <UserPlus size={15} aria-hidden="true" /> {t("usersDirectory.crearUsuario")}
          </button>
        )}
        {/* Enlace de invitación (Release V1, 2026-09-02) — junto a "Crear
            usuario", mismo nivel de permiso. Deja autoregistrarse a quien lo
            reciba aunque el registro externo general esté cerrado, sin que
            el superadmin tenga que rellenar los datos de la cuenta a mano. */}
        {profile?.is_superadmin && (
          <button
            onClick={generateInvitationLink}
            disabled={generatingInvitation}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-600 disabled:opacity-50"
          >
            {generatingInvitation ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
            {t("usersDirectory.generarInvitacion")}
          </button>
        )}
      </div>
      {loadError && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          {t("usersDirectory.errorCargarListado", { error: loadError })}
        </p>
      )}
      {loading ? (
        <p className="px-3 py-6 text-center text-sm text-gray-400">{t("usersDirectory.cargandoUsuarios")}</p>
      ) : filteredRows.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-gray-400">{t("usersDirectory.sinResultados")}</p>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {filteredRows.map((p) => {
            const row = (
              <UserListRow
                user={p}
                status={userStatus(activeByUser[p.user_id] ?? true, activatedAtByUser[p.user_id])}
                lastSignInAt={lastSignInByUser[p.user_id] ?? null}
                deactivatedAt={deactivatedAtByUser[p.user_id]}
                onOpen={setOpenUserId}
              />
            );
            const canDelete = !!profile?.is_superadmin && p.user_id !== profile?.user_id && !p.is_superadmin;
            return (
              <div key={p.user_id}>
                {canDelete
                  ? <SwipeToDeleteRow onDelete={() => requestDelete(p)} deleteLabel={t("swipeToDelete.eliminarA", { nickname: p.nickname })}>{row}</SwipeToDeleteRow>
                  : row}
              </div>
            );
          })}
        </div>
      )}

      {/* Backlog: "Animación de salida completa" — las 3 hojas de abajo se
          quedan SIEMPRE montadas (nunca `{cond && <Hoja/>}`) y reciben
          `open` como prop, para que Motion pueda terminar la animación de
          cierre en vez de que React desmonte el árbol de golpe. Cada hoja
          retiene su último contenido no-nulo mientras `open` es false
          (ver useRetained), así que sigue siendo seguro pasarle un
          `openUser`/`linkPanel` ya a null en ese instante. */}
      <CreateUserSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={() => { setSheetOpen(false); reload(); }}
      />

      <UserDetailSheet
        open={!!openUser}
        user={openUser}
        status={openUser ? userStatus(activeByUser[openUser.user_id] ?? true, activatedAtByUser[openUser.user_id]) : null}
        lastSignInAt={openUser ? (lastSignInByUser[openUser.user_id] ?? null) : null}
        deactivatedAt={openUser ? deactivatedAtByUser[openUser.user_id] : null}
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

      <ActivationLinkPanel
        open={!!linkPanel}
        title={linkPanel?.title}
        description={linkPanel?.description}
        link={linkPanel?.link}
        onClose={() => setLinkPanel(null)}
        hideMockEmailButton={linkPanel?.hideMockEmailButton}
      />

      <ConfirmDialog
        open={!!pendingToggle}
        title={t("usersDirectory.cambiarRolAdminTitulo")}
        message={pendingToggle && (
          <>
            {t("usersDirectory.usuarioLabel", { nickname: pendingToggle.nickname })}
            <br />
            {t("usersDirectory.adminLabel", {
              from: pendingToggle.currentValue ? t("roleCheckbox.si") : t("roleCheckbox.no"),
              to: pendingToggle.nextValue ? t("roleCheckbox.si") : t("roleCheckbox.no"),
            })}
          </>
        )}
        onConfirm={confirmAdminToggle}
        onCancel={cancelAdminToggle}
        loading={submitting}
        confirmLabel={t("usersDirectory.confirmar")}
        danger={false}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t("usersDirectory.eliminarUsuarioTitulo")}
        message={pendingDelete && (
          <>
            {t("usersDirectory.eliminarUsuarioMensaje", { nickname: pendingDelete.nickname }).split(pendingDelete.nickname).map((part, i, arr) => (
              <Fragment key={i}>{part}{i < arr.length - 1 && <strong>{pendingDelete.nickname}</strong>}</Fragment>
            ))}
            <br />
            {t("usersDirectory.eliminarUsuarioAlternativa")}
          </>
        )}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        loading={submitting}
        confirmLabel={t("usersDirectory.eliminar")}
        danger
      />

      <ConfirmDialog
        open={!!pendingToggleActive}
        title={t("usersDirectory.desactivarUsuarioTitulo")}
        message={pendingToggleActive && (
          <>
            {t("usersDirectory.desactivarUsuarioMensaje", { nickname: pendingToggleActive.nickname }).split(pendingToggleActive.nickname).map((part, i, arr) => (
              <Fragment key={i}>{part}{i < arr.length - 1 && <strong>{pendingToggleActive.nickname}</strong>}</Fragment>
            ))}
          </>
        )}
        onConfirm={confirmToggleActive}
        onCancel={cancelToggleActive}
        loading={submitting}
        confirmLabel={t("usersDirectory.desactivar")}
        danger={false}
      />

      <ConfirmDialog
        open={!!pendingRegenerateLink}
        title={t("usersDirectory.generarEnlaceTitulo")}
        message={pendingRegenerateLink && (
          <>
            {t("usersDirectory.generarEnlaceMensaje", { nickname: pendingRegenerateLink.nickname }).split(pendingRegenerateLink.nickname).map((part, i, arr) => (
              <Fragment key={i}>{part}{i < arr.length - 1 && <strong>{pendingRegenerateLink.nickname}</strong>}</Fragment>
            ))}
          </>
        )}
        onConfirm={confirmRegenerateLink}
        onCancel={cancelRegenerateLink}
        loading={submitting}
        confirmLabel={t("usersDirectory.generarEnlace")}
        danger={false}
      />

      <ConfirmDialog
        open={!!pendingRegeneratePassword}
        title={t("usersDirectory.regenerarContrasenaTitulo")}
        message={pendingRegeneratePassword && (
          <>
            {t("usersDirectory.regenerarContrasenaMensaje", { nickname: pendingRegeneratePassword.nickname }).split(pendingRegeneratePassword.nickname).map((part, i, arr) => (
              <Fragment key={i}>{part}{i < arr.length - 1 && <strong>{pendingRegeneratePassword.nickname}</strong>}</Fragment>
            ))}
          </>
        )}
        onConfirm={confirmRegeneratePassword}
        onCancel={cancelRegeneratePassword}
        loading={submitting}
        confirmLabel={t("usersDirectory.regenerar")}
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
// label/description se resuelven en render vía t(`sections.<i18nKey>.label`)
// (namespace "config") — i18nKey es camelCase porque i18next usa "." como
// separador de clave anidada, incompatible con los `key` con guiones de
// abajo (identificadores de sección, no cambian).
const BUSINESS_SECTIONS = [
  { key: "escuelas", i18nKey: "escuelas", icon: Building2 },
  { key: "cursos", i18nKey: "cursos", icon: GraduationCap },
  { key: "tarifas", i18nKey: "tarifas", icon: Coins },
];
// "Tipos de pago" retirado del menú 2026-09-02 (ADR-0003, pasos 1-2): el
// concepto desaparece de la app — importe siempre es tarifa × personas
// (rateCalc.js), sin excepciones que gestionar. La tabla payment_types
// sigue existiendo en BD por ahora (columnas rates.payment_type/
// commission_rates.payment_type con NOT NULL, escritas con el literal fijo
// "Per Person" — ver RatesTab.jsx/MovementSheet.jsx); su DROP real es el
// paso 3-5 de esa misma ADR, deliberadamente no hecho en este cambio
// (solo frontend, sin migraciones).
// Training Records fuera de Release V1 (decisión del usuario,
// 2026-09-04, docs/RELEASE-V1-PROGRESS.md Fase 9): la tarjeta de acceso
// desde Home y esta sección se retiran de la UI para este release —
// TrainingRecordsTab.jsx, sus migraciones y sus tablas quedan intactos.
// Reversible restaurando el HIDDEN_SECTIONS/allowedSectionKeys/
// currentSectionI18nKey/render de antes de este commit.
const ADMIN_SECTIONS = [
  { key: "estados-pago", i18nKey: "estadosPago", icon: Flag },
  { key: "monedas", i18nKey: "monedas", icon: DollarSign },
  { key: "navegacion", i18nKey: "navegacion", icon: Palette },
  { key: "ajustes", i18nKey: "ajustes", icon: SlidersHorizontal },
  { key: "usuarios", i18nKey: "usuarios", icon: Users },
];
// Exclusivo de superadmin — a diferencia de ADMIN_SECTIONS (visible a
// cualquier admin), gestionar datasets iniciales es configuración de
// infraestructura de la app, no una tarea de negocio del día a día (misma
// decisión ya aplicada a los avisos de despliegue, ADR-0024). El gate real
// vive en RLS (schema.sql: insert/update/delete de setup_datasets y sus 4
// tablas hijas exigen is_superadmin(auth.uid())) — esto solo evita
// mostrar una pantalla que un admin normal no podría usar.
const SUPERADMIN_SECTIONS = [
  { key: "datasets", i18nKey: "datasets", icon: Database },
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
// Exportado para Home (Bloque 10): entrar directo a una sección de
// Configuración desde fuera de este archivo sin duplicar la clave de
// sessionStorage — se llama justo antes de navegar a la pestaña
// "config" (ver App.jsx, onOpenTrainingRecords), para que el
// `useState(() => readStoredSection())` de ConfigTab la recoja ya en su
// primer render.
export function setStoredSection(key) {
  try { sessionStorage.setItem(CONFIG_SECTION_KEY, key); } catch { /* no-op */ }
}

function ConfigMenuGroup({ title, items, onSelect }) {
  const { t } = useTranslation("config");
  return (
    <div>
      {title && <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>}
      <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {items.map(({ key, i18nKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "#F0FDFA", color: TEAL }}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-800">{t(`sections.${i18nKey}.label`)}</span>
              <span className="block truncate text-xs text-gray-400">{t(`sections.${i18nKey}.description`)}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

// schools / activities / currencies / paymentStatuses / navSections / appConfig: hooks de useSupabaseTable
// rates / commissionRates / worklog / comisiones: hooks que necesitan las secciones Tarifas y Pagos, embebidas aquí
// profile: fila propia de profiles (useSession) — is_admin/is_superadmin deciden qué secciones se ven
// onClose (opcional): cierra Configuración entera (mismo handler que la "X"
// de la cabecera, ver App.jsx) — lo dispara el gesto de "atrás" cuando ya
// estamos en el menú principal, sin ninguna sección abierta (ver backProps).
export default function ConfigTab({ schools, activities, currencies, paymentStatuses, rates, commissionRates, worklog, comisiones, navSections, appConfig, profile, onClose }) {
  const { t } = useTranslation("config");
  const isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
  const isSuperadmin = !!profile?.is_superadmin;
  const allowedSectionKeys = [...BUSINESS_SECTIONS, ...(isAdmin ? ADMIN_SECTIONS : []), ...(isSuperadmin ? SUPERADMIN_SECTIONS : [])].map((s) => s.key);
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
  const currentSectionI18nKey = [...BUSINESS_SECTIONS, ...ADMIN_SECTIONS, ...SUPERADMIN_SECTIONS].find((s) => s.key === section)?.i18nKey;
  // Deslizar hacia la derecha = "atrás", recursivo (feedback explícito
  // 2026-08-30: "no como una excepción, no como un truco, no como una
  // interacción aislada"): dentro de una sección, vuelve al menú; ya en el
  // menú, cierra Configuración entera — el mismo gesto en cualquier nivel.
  const backProps = useSwipeBack(section == null ? onClose : () => setSection(null));

  if (section == null) {
    return (
      <div className="space-y-5" {...backProps}>
        <ConfigMenuGroup items={BUSINESS_SECTIONS} onSelect={setSection} />
        {isAdmin && <ConfigMenuGroup title={t("menu.administracion")} items={ADMIN_SECTIONS} onSelect={setSection} />}
        {isSuperadmin && <ConfigMenuGroup title={t("menu.superadmin")} items={SUPERADMIN_SECTIONS} onSelect={setSection} />}
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
        <ChevronLeft size={18} aria-hidden="true" /> {t("menu.configuracion")}
      </button>
      <h2 className="-mt-1 text-base font-semibold" style={{ color: NAVY }}>{currentSectionI18nKey && t(`sections.${currentSectionI18nKey}.label`)}</h2>

      {section === "escuelas" && (
        // colorizeText: mismo tratamiento que Cursos (lavado de cara
        // 2026-09-03, pedido explícito del usuario: "el estilado no acaba
        // de cuadrar 100% con el resto de Ocean Flow") — antes Escuelas
        // tenía el nombre en gris neutro mientras Cursos, misma pantalla
        // hermana con el mismo CrudTable, coloreaba el nombre con su
        // propio color. Se unifica en vez de decidir cuál de las dos
        // "estaba bien", porque las dos ya eran igual de válidas por
        // separado — la inconsistencia estaba en que difirieran entre sí.
        <CrudTable createLabel={t("crud.nuevaEscuela")} editLabel={t("crud.editarEscuela")} table={schools} hasDefault colorizeText
          fields={[{ key: "name", label: t("crud.nombreCampo") }, { key: "color", label: t("crud.colorCampo"), type: "color", required: false }]} />
      )}
      {section === "cursos" && (
        <CrudTable createLabel={t("crud.nuevoCurso")} editLabel={t("crud.editarCurso")} table={activities} hasDefault searchable pullDefaultOut colorizeText
          fields={[{ key: "name", label: t("crud.nombreCampo") }, { key: "color", label: t("crud.colorCampo"), type: "color", required: false }]} />
      )}
      {section === "tarifas" && (
        <RatesTab
          schools={schools} activities={activities} currencies={currencies}
          rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones}
          accentColor={sectionColor("rates")}
        />
      )}
      {isAdmin && section === "estados-pago" && (
        <CrudTable createLabel={t("crud.nuevoEstadoPago")} editLabel={t("crud.editarEstadoPago")} table={paymentStatuses} hasDefault protectDefaultFromDelete
          fields={[{ key: "name", label: t("crud.nombreCampo") }, { key: "color", label: t("crud.colorCampo"), type: "color", required: false }]} />
      )}
      {isAdmin && section === "monedas" && (
        // description/defaultLabel: aclaración pedida por el usuario
        // ("parece raro, hay dos tipos de moneda favorita") — la marcada
        // aquí NO es una preferencia personal (esa vive en Mi perfil,
        // localStorage, ADR-0007), es la moneda de RESPALDO de toda la
        // app cuando un usuario todavía no ha elegido la suya. Antes esta
        // pantalla reutilizaba la misma etiqueta genérica "Favorita" que
        // Escuelas/Cursos/Estados de pago, sin ningún texto que explicara
        // la diferencia — de ahí la sensación de dos conceptos mezclados.
        <CrudTable createLabel={t("crud.nuevaMoneda")} editLabel={t("crud.editarMoneda")} table={currencies} pkField="code" hasDefault searchable pullDefaultOut
          description={t("crud.monedasDescripcion")} defaultLabel={t("crud.monedaPorDefectoApp")}
          fields={[{ key: "code", label: t("crud.codigoCampo") }, { key: "name", label: t("crud.nombreCampo") }, { key: "symbol", label: t("crud.simboloCampo") }]} />
      )}
      {isAdmin && section === "navegacion" && <SectionColors navSections={navSections} />}
      {isAdmin && section === "ajustes" && <GeneralSettings appConfig={appConfig} />}
      {isAdmin && section === "usuarios" && <UsersDirectory profile={profile} />}
      {isSuperadmin && section === "datasets" && <DatasetsSection />}
    </div>
  );
}
