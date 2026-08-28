import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { Plus, Minus, X, Pencil, Check, RotateCcw, MoreVertical, SlidersHorizontal, PartyPopper, GraduationCap, Handshake, Users, Star, Loader2, StickyNote } from "lucide-react";
import { NAVY, TEAL, SUN, CORAL, GREEN } from "./App";
import {
  inputCls, formatMoney, Money, Field, Select, MultiSelect, CurrencySearchSelect, MoneyInput,
  DatePicker, DateRangePicker, DeleteButton, ConfirmDialog, colorFor, lighten, isPendingStatus, oppositeStatus, useToast,
  useFloatingDropdown, FloatingPanel, useBodyScrollLock, todayStr, addDays,
} from "./shared";
import { DURATION, sheetVariants, usePrefersReducedMotion } from "./motion";
import { computeRateTotal, buildActivityEntries, buildIncomeEntries } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";

// "Cobrados" se limita a los últimos 10 — mismo criterio que Pagos, ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md.
const RECENT_PAID_LIMIT = 10;

// El tipo no es un selector de primer nivel — vive dentro de "Filtrar",
// junto a fecha/escuela/curso, no como control permanente (ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md).
const TYPE_OPTIONS = ["Curso", "Comisión", "Ajuste de curso"];
const TYPE_KEY = { "Curso": "ganado", "Comisión": "comision", "Ajuste de curso": "companeros" };
// Identidad estable de una fila entre tablas (worklog/comisiones/
// colleague_payments comparten espacio de ids independientes) — misma
// clave para el elemento de lista (key de React) y para el mapa de
// animaciones por fila (ver rowAnim en el componente principal).
const entryKey = (e) => `${e._source}-${e.id}`;
// Filtro puro, sin depender del render — usado tanto por la lista
// (filteredEntries) como por changeStatus para decidir si un cambio de
// estado hace que una fila entre o salga de la lista actualmente visible.
function matchesEntryFilters(e, f) {
  if (f.type && e._source !== TYPE_KEY[f.type]) return false;
  if (f.from && e.date < f.from) return false;
  if (f.to && e.date > f.to) return false;
  if (f.school && e.school !== f.school) return false;
  if (f.activity.length > 0 && !f.activity.includes(e.activity)) return false;
  return true;
}
// Antes solo Comisión/Ajuste llevaban esta etiqueta de texto junto a la
// fecha — Curso se quedaba sin ninguna, apoyándose solo en el color del
// borde lateral. Para que el color no sea la ÚNICA señal del tipo (accesible
// también sin distinguir colores) las tres etiquetas están completas.
const SOURCE_LABEL = { ganado: "Curso", comision: "Comisión", companeros: "Ajuste" };
const CREATE_TYPES = [
  { key: "ganado", label: "Curso impartido", icon: GraduationCap }, // formación/certificación — más reconocible a tamaño pequeño que un icono náutico genérico
  { key: "comision", label: "Comisión", icon: Handshake },
  { key: "companeros", label: "Ajuste de curso", icon: Users },
];

// Sin marcador delante del texto (ver Pagos) — para el ajuste, el curso
// lidera igual que en Curso/Comisión, con el instructor relacionado como
// detalle secundario, porque el ajuste sigue estando ligado a un curso.
function EntryRowTitle({ entry, activityColor }) {
  const isAjuste = entry._source === "companeros";
  return (
    <div className="min-w-0">
      <p className="truncate text-[15px] font-semibold leading-tight" style={{ color: activityColor(entry.activity) }}>
        {entry.activity || "—"}
      </p>
      <p className="mt-0.5 truncate text-[11.5px] font-medium text-gray-400">
        {entry.school}{isAjuste && entry.colleague_name ? ` · con ${entry.colleague_name}` : ""}
      </p>
    </div>
  );
}

// "Confirmar cobro" no describe bien saldar una deuda hacia un compañero
// (importe negativo) — el resto del vocabulario ("Marcar pendiente") se
// mantiene igual porque sí es correcto en ambos sentidos.
function actionLabel(entry, isPending) {
  if (!isPending) return "Marcar pendiente";
  return entry._source === "companeros" && entry.total < 0 ? "Marcar liquidado" : "Confirmar cobro";
}

// Menú "⋯" para Editar/Eliminar — la acción de menor frecuencia de la fila
// (ver docs/ADR/0005-mi-trabajo-unificacion-economica.md, revisión de
// jerarquía de acciones): antes eran 2 iconos siempre visibles compitiendo
// con el cambio de estado; ahora quedan agrupados detrás de un único
// control, sin perder alcance (siguen a un toque de distancia).
function RowMenu({ onEdit, onDelete, itemLabel }) {
  // Antes se recortaba en la última fila de la lista (el contenedor tiene
  // overflow-hidden para las esquinas redondeadas) — con FloatingPanel
  // (portal a document.body) deja de depender de los ancestros.
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
            borrado real — así la animación de salida de la fila (ver
            EntryRow) se ve en la lista, no oculta detrás del modal. */}
        <DeleteButton variant="menuItem" onConfirm={handleDeleteConfirmed} itemLabel={itemLabel} optimistic />
      </FloatingPanel>
    </>
  );
}

// El cambio de estado es la acción de más frecuencia de la fila — se
// mantiene ligera (texto+icono, sin relleno de color) para no competir con
// el FAB, que es la única acción con fondo sólido de toda la pantalla (ver
// misma nota de ADR-0005 sobre jerarquía de acciones).
// Acento por tipo (borde izquierdo, discreto) — para escanear la lista
// de un vistazo sin abrir cada fila. Curso/Comisión usan un color fijo de
// marca por tipo (TEAL/SUN, igual criterio que NAVY/CORAL/GREEN de más
// abajo — identidad de la app, no dato de negocio configurable). Ajuste
// reutiliza el color que ya tenía el importe (CORAL/GREEN según signo):
// esa distinción de "quién debe a quién" ya era más valiosa que un color
// de tipo uniforme, no había que sustituirla.
function rowAccent(entry, amountColor) {
  if (entry._source === "ganado") return TEAL;
  if (entry._source === "comision") return SUN;
  return amountColor;
}

// Mismo cálculo que rowAccent, pero pensado para el formulario de
// creación/edición (icono de la cabecera + pestaña activa): antes esos
// dos sitios usaban siempre accentColor (el color genérico de la
// sección "Mi trabajo"), sin relación con el tipo que se está creando —
// un usuario que ya asocia "teal = curso" al escanear la lista no veía
// ese mismo teal al crear un curso nuevo. Para Ajuste seguimos el signo
// del importe en vivo, igual que en la lista una vez guardado — si
// todavía no se ha escrito nada, GREEN es el valor por defecto neutro
// (Number("") es 0, no negativo).
function formAccentColor(creating, amount) {
  if (creating === "ganado") return TEAL;
  if (creating === "comision") return SUN;
  return Number(amount) < 0 ? CORAL : GREEN;
}

// Salida al eliminar — tres capas de movimiento en vez de un fade plano:
// el contenido se encoge/desliza/desvanece primero (CONTENT_MS, empieza
// ya), y el hueco se cierra un instante después (HEIGHT_DELAY_MS, con su
// propia duración) — ese pequeño desfase es lo que distingue una
// animación con cierta "coreografía" de una simple desaparición
// simultánea de todo a la vez. cubic-bezier(0.4,0,1,1) es la curva de
// "acelerar" de Material Design, pensada específicamente para elementos
// que abandonan la pantalla (empiezan normal y aceleran de salida) — lo
// contrario de la curva de "decelerar" que usaría algo que ENTRA. Sigue
// siendo rápida a propósito: no debe frenar el ritmo normal de la lista.
const EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";
const CONTENT_MS = 200;
const HEIGHT_DELAY_MS = 60;
const HEIGHT_MS = 220;
const EXIT_MS = HEIGHT_DELAY_MS + HEIGHT_MS + 30; // margen antes de disparar el borrado real

function EntryRow({ entry, activityColor, currencyRows, isPending, onToggle, onEdit, onDelete, animPhase }) {
  const isAjuste = entry._source === "companeros";
  const negative = isAjuste && entry.total < 0;
  const amountColor = isAjuste ? (negative ? CORAL : GREEN) : NAVY;

  // Animación de salida: colapsar altura+opacidad+desplazamiento ANTES de
  // borrar de verdad, no al revés — deleteRow() actualiza el estado en
  // cuanto Supabase responde, así que si se llamara primero la fila
  // desaparecería de la lista de golpe sin dar tiempo a animar nada. Por
  // eso el borrado real se dispara al final de handleDelete, no al
  // principio: para entonces la fila ya está invisible/colapsada, y su
  // desaparición real de `visibleList` no da ningún salto.
  //
  // max-height necesita un valor de partida en píxeles para poder animar
  // hasta 0 (con "none" no hay desde dónde interpolar) — se fija con
  // scrollHeight y, un frame después (requestAnimationFrame), se pasa a 0.
  // Ese frame de por medio es necesario: si los dos setState fueran
  // síncronos, React los agruparía en un único commit y saltaría directo
  // al valor final sin pintar el intermedio, o sea sin transición visible.
  const rowRef = useRef(null);
  const [exiting, setExiting] = useState(false);
  const [fixedHeight, setFixedHeight] = useState(null);

  const handleDelete = () => new Promise((resolve, reject) => {
    const el = rowRef.current;
    if (el) setFixedHeight(el.scrollHeight);
    requestAnimationFrame(() => {
      setExiting(true);
      setTimeout(async () => {
        try {
          await onDelete();
          resolve();
        } catch (e) {
          // Revierte la animación si el borrado real falla — el toast de
          // error lo muestra DeleteButton, aquí solo hay que devolver la
          // fila a su estado normal en vez de dejarla colapsada a medias.
          setExiting(false);
          setFixedHeight(null);
          reject(e);
        }
      }, EXIT_MS);
    });
  });

  // Cambiar de estado (cobrar/marcar pendiente, incluido "Deshacer" desde
  // el toast) reutiliza exactamente esta misma coreografía — mismo
  // lenguaje de movimiento que borrar, con el tiempo invertido para la
  // entrada. La dispara el padre marcando `animPhase` (ver changeStatus en
  // MiTrabajoTab) en vez de un clic local: así una fila puede animarse
  // aunque el cambio venga de fuera de la fila (el botón "Deshacer" del
  // toast, que puede pulsarse con la fila ya desmontada o recién
  // remontada). "exiting": la fila, ya visible, sale de la lista activa.
  // "entering": la fila reaparece en la lista activa — arranca colapsada/
  // invisible en el propio montaje y crece hasta su altura real un frame
  // después, el mismo mecanismo de medir-y-diferir que usa la salida.
  const [toggleExiting, setToggleExiting] = useState(false);
  const [entering, setEntering] = useState(animPhase === "entering");

  useEffect(() => {
    if (animPhase !== "exiting" || toggleExiting) return;
    const el = rowRef.current;
    if (el) setFixedHeight(el.scrollHeight);
    const raf = requestAnimationFrame(() => setToggleExiting(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animPhase]);

  useEffect(() => {
    if (!entering) return;
    const el = rowRef.current;
    const h = el ? el.scrollHeight : 0;
    setFixedHeight(h);
    const raf = requestAnimationFrame(() => setEntering(false));
    const t = setTimeout(() => setFixedHeight(null), EXIT_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapsed = exiting || toggleExiting || entering;

  return (
    <div
      ref={rowRef}
      className="overflow-hidden"
      style={{
        maxHeight: collapsed ? 0 : (fixedHeight == null ? "none" : fixedHeight),
        transition: `max-height ${HEIGHT_MS}ms ${EXIT_EASING} ${HEIGHT_DELAY_MS}ms`,
      }}
    >
      <div
        className="border-l-4 px-4 py-3.5 text-sm"
        style={{
          borderColor: rowAccent(entry, amountColor),
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? "translateX(-16px) scale(0.97)" : "translateX(0) scale(1)",
          transition: `opacity ${CONTENT_MS}ms ${EXIT_EASING}, transform ${CONTENT_MS}ms ${EXIT_EASING}`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <EntryRowTitle entry={entry} activityColor={activityColor} />
          <span className="shrink-0 font-semibold tabular-nums" style={{ color: amountColor }}>
            {isAjuste && (negative ? "− " : "+ ")}
            <Money amount={Math.abs(entry.total)} code={entry.currency} currencyRows={currencyRows} style={{ color: amountColor }} />
          </span>
        </div>
        {entry.notes && (
          <p className="mt-1 truncate text-[11px] italic text-gray-400">"{entry.notes}"</p>
        )}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-gray-400">
            {entry.date}{SOURCE_LABEL[entry._source] ? ` · ${SOURCE_LABEL[entry._source]}` : ""}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onToggle}
              className="flex min-h-9 items-center gap-1 rounded px-1.5 text-xs font-semibold transition-colors"
              style={{ color: isPending ? TEAL : "#6B7280" }}
            >
              {isPending ? <Check size={14} aria-hidden="true" /> : <RotateCcw size={13} aria-hidden="true" />}
              {actionLabel(entry, isPending)}
            </button>
            <RowMenu onEdit={onEdit} onDelete={handleDelete} itemLabel={isAjuste ? `el ajuste con ${entry.colleague_name}` : `${entry.activity} en ${entry.school}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// El FAB flota justo encima de las acciones (derecha) de cada fila — al
// hacer scroll, pasa literalmente por encima de ellas un instante. En vez
// de reposicionarlo o encogerlo de forma fija, se aparta durante el scroll
// activo hacia abajo (que es cuando de verdad "tapa" contenido) y vuelve en
// cuanto el usuario sube o se detiene — mismo patrón que el FAB de Gmail o
// el botón de tuitear en X. Ver docs/ADR/0005-mi-trabajo-unificacion-economica.md.
function useHideFabOnScroll() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < 40) setVisible(true);
      else if (delta > 6) setVisible(false);
      else if (delta < -6) setVisible(true);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return visible;
}

// Cabecera de grupo por día en la lista — "Hoy"/"Ayer" para orientarse de
// un vistazo, día+mes abreviado el resto. Ayuda a escanear rápido cuando
// hay muchos elementos, sin necesitar abrir "Filtrar" para acotar fechas.
const WEEKDAYS_SHORT_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_SHORT_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function dateGroupLabel(dateStr) {
  if (dateStr === todayStr()) return "Hoy";
  if (dateStr === addDays(todayStr(), -1)) return "Ayer";
  const [, m, d] = dateStr.split("-").map(Number);
  const weekday = (new Date(dateStr + "T00:00:00").getDay() + 6) % 7;
  return `${WEEKDAYS_SHORT_ES[weekday]}, ${d} ${MONTHS_SHORT_ES[m - 1]}`;
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

function emptyMessage(statusFilter, hasActiveFilters) {
  if (statusFilter === "pendientes") {
    return hasActiveFilters ? "Sin elementos pendientes con estos filtros." : "Estás al día — nada pendiente.";
  }
  return hasActiveFilters ? "Sin elementos cobrados con estos filtros." : "Todavía no has marcado nada como cobrado.";
}

// schools / activities / paymentTypes / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], insertRow, updateRow, deleteRow, bulkUpdateWhere }
// accentColor: color de sección (nav_sections), para el FAB
// autoOpenType: "log" | "comisiones" | null — llegado desde el acceso rápido de Home
// userId: profile.user_id — clave de la moneda favorita en localStorage (ver más abajo)
// Unifica Registro + Comisiones + Compañeros en una única experiencia — ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md. Adaptador puro sobre el
// modelo actual (sin migración de datos ni cambio de esquema): sigue
// escribiendo sobre worklog/comisiones/colleague_payments de siempre.
// Moneda favorita — preferencia personal del instructor, no dato de
// negocio (no vive en Supabase a propósito): un instructor casi siempre
// cobra Ajustes en la misma moneda, y hoy el valor por defecto es el
// global de Configuración, no el suyo. localStorage evita una migración
// de esquema para una preferencia de un solo campo, de un solo
// dispositivo — si algún día hace falta sincronizarla entre dispositivos,
// eso sí sería motivo para moverla a `profiles` (columna nueva, con su
// propia migración).
const favoriteCurrencyKey = (userId) => `oceanpulse:favoriteCurrency:${userId || "anon"}`;
function getFavoriteCurrency(userId) {
  try { return localStorage.getItem(favoriteCurrencyKey(userId)); } catch { return null; }
}
function setFavoriteCurrency(userId, code) {
  try { localStorage.setItem(favoriteCurrencyKey(userId), code); } catch { /* localStorage no disponible — no es crítico, se ignora */ }
}

export default function MiTrabajoTab({
  schools, activities, paymentTypes, paymentStatuses, currencies,
  rates, commissionRates, worklog, comisiones, colleaguePayments,
  accentColor = TEAL, autoOpenType = null, onAutoOpened, userId = null, onOpenPayments,
}) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const defaultStatus = paymentStatuses.rows.find((s) => s.is_default)?.name || paymentStatuses.rows[0]?.name || "Pending";
  const defaultSchool = schools.rows.find((s) => s.is_default)?.name || "";
  const defaultActivity = activities.rows.find((a) => a.is_default)?.name || "";
  const defaultCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "";
  const [favoriteCurrency, setFavoriteCurrencyState] = useState(() => getFavoriteCurrency(userId));
  const markFavoriteCurrency = (code) => {
    setFavoriteCurrency(userId, code);
    setFavoriteCurrencyState(code);
    toast?.success(`${code} guardada como moneda favorita`);
  };
  // WORKAROUND TEMPORAL (ver docs/BACKLOG.md y docs/ADR/0003): igual que en
  // WorkLogTab/ComisionesTab, una cuenta nueva nace con payment_types
  // vacío — sin este fallback, el alta de tarifa al vuelo queda bloqueada.
  const defaultPaymentType = paymentTypes.rows.find((t) => t.name === "Per Person")?.name || paymentTypes.rows.find((t) => t.is_default)?.name || paymentTypes.rows[0]?.name || "Per Person";

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");
  const schoolNames = schools.rows.map((s) => s.name);
  const activityNames = activities.rows.map((a) => a.name);

  const activityEntries = useMemo(
    () => buildActivityEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );
  // La cabecera "Pendiente de cobrar" es una cifra más estrecha que la
  // lista de abajo: solo lo que te deben a ti, igual que en Home/Pagos —
  // un ajuste negativo pendiente aparece en la lista pero no aquí.
  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  const [statusFilter, setStatusFilter] = useState("pendientes"); // "pendientes" | "cobrados"
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", school: "", activity: [], type: "" });

  const presentValues = (key) => [...new Set(activityEntries.map((e) => e[key]).filter(Boolean))].sort();
  const hasActiveFilters = Boolean(filters.type || filters.from || filters.to || filters.school || filters.activity.length > 0);
  // Desde/Hasta cuentan como un único filtro de "Periodo" — es un solo
  // control (DateRangePicker), no dos independientes.
  const activeFilterCount = [Boolean(filters.from || filters.to), Boolean(filters.school), filters.activity.length > 0, Boolean(filters.type)].filter(Boolean).length;
  const clearFilters = () => setFilters({ from: "", to: "", school: "", activity: [], type: "" });

  const filteredEntries = useMemo(
    () => activityEntries.filter((e) => matchesEntryFilters(e, filters)),
    [activityEntries, filters]
  );

  // Mismo orden (fecha descendente) en Pendientes y Cobrados — lo más
  // reciente primero en toda la pantalla, un único criterio en vez de que
  // cada pestaña ordene al revés de la otra.
  const pendingAll = useMemo(
    () => filteredEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => b.date.localeCompare(a.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  const paidAll = useMemo(
    () => filteredEntries.filter((e) => !isPendingStatus(e.status, paymentStatuses.rows)).sort((a, b) => b.date.localeCompare(a.date)),
    [filteredEntries, paymentStatuses.rows]
  );
  const paidCapped = paidAll.slice(0, RECENT_PAID_LIMIT);
  const showPaidCapHint = statusFilter === "cobrados" && paidAll.length > paidCapped.length;
  const visibleList = statusFilter === "pendientes" ? pendingAll : paidCapped;

  const pendingTotals = useMemo(() => {
    const map = {};
    incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [incomeEntries, paymentStatuses.rows]);
  const pendingIncomeCount = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows)).length;

  const tableFor = (source) => (source === "ganado" ? worklog : source === "comision" ? comisiones : colleaguePayments);
  // Sin esto, la pantalla mostraba "Estás al día — nada pendiente" durante
  // el instante entre montar y recibir la primera respuesta de Supabase —
  // un usuario nuevo lo leía como "esta app no tiene nada", no como
  // "cargando". Un esqueleto breve evita ese vistazo equivocado.
  const dataLoaded = worklog.loaded && comisiones.loaded && colleaguePayments.loaded && rates.loaded && commissionRates.loaded;

  // -----------------------------------------------------------------
  // Animación de fila al cambiar de estado — mismo lenguaje de movimiento
  // que borrar (ver EXIT_EASING/CONTENT_MS/HEIGHT_MS/HEIGHT_DELAY_MS/
  // EXIT_MS más arriba), aplicado también a "cobrar"/"marcar pendiente" y
  // a "Deshacer" desde el toast. rowAnim vive aquí (no en cada fila)
  // porque "Deshacer" puede dispararse cuando la fila original ya no está
  // montada (cambió de lista) — es el padre quien decide si la fila debe
  // salir animada de la lista activa o entrar en ella, y se lo pasa a
  // EntryRow como `animPhase`.
  const [rowAnim, setRowAnim] = useState({});
  const markAnim = (key, phase) => setRowAnim((a) => ({ ...a, [key]: phase }));
  const clearAnim = (key) => setRowAnim((a) => (key in a ? Object.fromEntries(Object.entries(a).filter(([k]) => k !== key)) : a));

  // filters/statusFilter "en vivo" — changeStatus puede ejecutarse mucho
  // después de haberse creado (el "Deshacer" del toast permanece pulsable
  // varios segundos, tiempo de sobra para cambiar de pestaña o de
  // filtro); leer el cierre de la función que definió el toast daría un
  // valor obsoleto. Un ref actualizado en cada render evita esa condición
  // de carrera sin depender de que el usuario no haya tocado nada.
  const liveRef = useRef({ filters, statusFilter });
  liveRef.current = { filters, statusFilter };
  const matchesActiveTab = (status, tab) =>
    tab === "pendientes" ? isPendingStatus(status, paymentStatuses.rows) : !isPendingStatus(status, paymentStatuses.rows);

  // Ejecuta la mutación real diferida hasta que la fila termina de
  // animarse fuera de la lista activa — mismo EXIT_MS que ya usaba borrar
  // (ver handleDelete en EntryRow), para que la desaparición real de
  // `visibleList` coincida con el instante en que la fila ya es invisible.
  const animateExitThen = (key, run) => new Promise((resolve, reject) => {
    markAnim(key, "exiting");
    setTimeout(async () => {
      try {
        const result = await run();
        clearAnim(key);
        resolve(result);
      } catch (e) {
        clearAnim(key);
        reject(e);
      }
    }, EXIT_MS);
  });
  // Marca la fila para que, en cuanto vuelva a aparecer en la lista activa
  // (la mutación real ya ha surtido efecto), se monte con la animación de
  // entrada — nunca antes de que el cambio ya sea real, para no mostrar
  // una fila "entrando" que en realidad no está ahí todavía.
  const markEntering = (key) => {
    markAnim(key, "entering");
    setTimeout(() => clearAnim(key), EXIT_MS);
  };

  // Único punto de mutación de estado de una fila — lo usan tanto el
  // botón de la propia fila (siempre visible al pulsarlo, así que siempre
  // "sale") como "Deshacer" desde el toast (que puede, según en qué
  // pestaña/filtro esté el usuario en ese momento, hacer que la fila
  // "salga" o "entre" de la lista activa). Decide con datos en vivo
  // (liveRef), no con los del momento en que se llamó a toggleStatus.
  const changeStatus = async (entry, targetStatus) => {
    const key = entryKey(entry);
    const { filters: liveFilters, statusFilter: liveTab } = liveRef.current;
    const passesFilters = matchesEntryFilters(entry, liveFilters);
    const wasVisible = passesFilters && matchesActiveTab(entry.status, liveTab);
    const willBeVisible = passesFilters && matchesActiveTab(targetStatus, liveTab);
    const run = () => tableFor(entry._source).updateRow(entry.id, { status: targetStatus });
    if (wasVisible) {
      await animateExitThen(key, run);
    } else {
      await run();
      if (willBeVisible) markEntering(key);
    }
  };

  // El toggle sigue siendo de un solo toque, tan rápido como antes — la
  // capa de seguridad es el "Deshacer" del toast, no un diálogo previo
  // que frenaría el caso normal (acertar) para proteger el caso raro
  // (fallar el toque). previousStatus se captura ANTES del cambio
  // optimista, en el cierre de esta llamada — no depende de que la fila
  // siga en pantalla ni de volver a leer su estado más tarde.
  const toggleStatus = async (entry) => {
    const previousStatus = entry.status;
    const target = oppositeStatus(entry.status, paymentStatuses.rows);
    try {
      await changeStatus(entry, target);
      const undo = async () => {
        try {
          await changeStatus({ ...entry, status: target }, previousStatus);
          toast?.success("Deshecho");
        } catch {
          toast?.error("No se pudo deshacer. Inténtalo de nuevo.");
        }
      };
      const action = { label: "Deshacer", onClick: undo };
      if (isPendingStatus(target, paymentStatuses.rows)) {
        toast?.success("Marcado como pendiente", { action });
      } else if (statusFilter === "pendientes") {
        toast?.success('Marcado como cobrado — cámbialo a "Cobrados" para verlo', { action });
      } else {
        toast?.success("Marcado como cobrado", { action });
      }
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    }
  };

  // "Cobrar" es el término correcto para el caso normal (Curso, Comisión,
  // Ajuste a tu favor), pero un Ajuste con importe negativo es una deuda
  // TUYA — ahí no "cobras", liquidas (mismo matiz que ya distingue
  // actionLabel() fila a fila). hasNegativeAjuste detecta si ese caso
  // convive con el resto en la lista de pendientes visible, para no decir
  // "cobrar" cuando parte de lo que se marca es en realidad una deuda que
  // pagas tú.
  const hasNegativeAjuste = pendingAll.some((e) => e._source === "companeros" && e.total < 0);

  // Acciones masivas (afectan a todos los elementos visibles de la
  // pestaña activa a la vez, sin Deshacer por lote ni animación por fila
  // — la lista entera se sustituye de golpe tras confirmar, igual que ya
  // hacía "Cobrar todos") — a diferencia del toggle de una fila, aquí sí
  // hace falta una confirmación explícita antes de ejecutar. No traga el
  // error aquí: lo relanza para que quien confirma decida si cierra el
  // diálogo o lo deja abierto para reintentar, igual que DeleteButton.
  const bulkUpdateStatus = async (entries, targetStatus) => {
    const bySource = { ganado: [], comision: [], companeros: [] };
    entries.forEach((e) => bySource[e._source].push(e.id));
    let count = 0;
    for (const [source, ids] of Object.entries(bySource)) {
      if (ids.length === 0) continue;
      count += await tableFor(source).bulkUpdateWhere((e) => ids.includes(e.id), { status: targetStatus });
    }
    return count;
  };

  const collectAllPending = async () => {
    if (pendingAll.length === 0) return;
    const targetStatus = oppositeStatus(pendingAll[0].status, paymentStatuses.rows);
    const count = await bulkUpdateStatus(pendingAll, targetStatus);
    const verb = hasNegativeAjuste ? "cobrado o liquidado" : "cobrado";
    const verbPlural = hasNegativeAjuste ? "cobrados o liquidados" : "cobrados";
    const msg = statusFilter === "pendientes"
      ? `${count} ${count === 1 ? `movimiento marcado como ${verb}` : `movimientos marcados como ${verbPlural}`} — cambia a "Cobrados" para verlos`
      : `${count} ${count === 1 ? `movimiento marcado como ${verb}` : `movimientos marcados como ${verbPlural}`}`;
    toast?.success(msg);
  };

  const [confirmingCollectAll, setConfirmingCollectAll] = useState(false);
  const [collectingAll, setCollectingAll] = useState(false);
  const confirmCollectAll = async () => {
    setCollectingAll(true);
    try {
      await collectAllPending();
      setConfirmingCollectAll(false);
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    } finally {
      setCollectingAll(false);
    }
  };

  // Mismo patrón que "Cobrar todos", en sentido inverso — vive en
  // Cobrados, opera sobre `paidAll` (respeta los filtros activos, igual
  // que su contraparte) y reutiliza bulkUpdateStatus/ConfirmDialog sin
  // introducir un segundo mecanismo.
  const markAllPaidAsPending = async () => {
    if (paidAll.length === 0) return;
    const targetStatus = oppositeStatus(paidAll[0].status, paymentStatuses.rows);
    const count = await bulkUpdateStatus(paidAll, targetStatus);
    toast?.success(`${count} ${count === 1 ? "movimiento marcado como pendiente" : "movimientos marcados como pendientes"}`);
  };

  const [confirmingMarkAllPending, setConfirmingMarkAllPending] = useState(false);
  const [markingAllPending, setMarkingAllPending] = useState(false);
  const confirmMarkAllPending = async () => {
    setMarkingAllPending(true);
    try {
      await markAllPaidAsPending();
      setConfirmingMarkAllPending(false);
    } catch {
      toast?.error("No se pudo actualizar. Inténtalo de nuevo.");
    } finally {
      setMarkingAllPending(false);
    }
  };

  const activitiesForSchool = (school) => {
    const names = [...new Set(rates.rows.filter((r) => r.school === school).map((r) => r.activity))];
    return names.length > 0 ? names : activityNames;
  };
  const colleagueSuggestions = (school) =>
    [...new Set(colleaguePayments.rows.filter((p) => p.school === school).map((p) => p.colleague_name))];
  // Smart default de Curso: la actividad que impartiste más recientemente
  // en esa escuela, no un valor global fijo — es el único campo del
  // formulario sin un buen valor por defecto hoy (Fecha=hoy, Escuela=la
  // que marques como tuya en Configuración, Nº personas=1). Solo se usa al
  // ABRIR el formulario (emptyFormFor) — cambiar de escuela a mitad de
  // formulario nunca reescribe una elección ya hecha.
  const lastActivityFor = (type, school) => {
    const source = type === "ganado" ? "ganado" : "comision";
    const matches = activityEntries.filter((e) => e._source === source && e.school === school);
    if (matches.length === 0) return null;
    return matches.reduce((latest, e) => (e.date > latest.date ? e : latest)).activity;
  };

  // -----------------------------------------------------------------
  // Creación y edición comparten la misma hoja inferior — misma
  // disposición de campos, mismo botón "Guardar", solo cambia el título
  // y si se hace insert o update al confirmar. Antes la edición usaba una
  // fila en línea de hasta 6 columnas dentro de la propia lista: en móvil
  // eso obligaba a repartir 6 campos en 3 filas de 2 columnas muy
  // estrechas, con dos selects abiertos pudiendo solaparse entre sí. Un
  // único formulario para ambos casos es también el patrón habitual en
  // apps profesionales (Linear, Stripe) y coincide con la convención ya
  // establecida de "crear = hoja inferior" (ver CLAUDE.md) — editar sigue
  // la misma convención en vez de tener un patrón de interacción propio.
  const [creating, setCreating] = useState(null); // null | "ganado" | "comision" | "companeros"
  const [form, setForm] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null); // null = creando; si no, la entrada que se está editando
  // Solo se sugiere "usar como favorita" tras un cambio activo del usuario
  // en esta sesión del formulario — no en el valor preseleccionado al
  // abrir, aunque ese valor también sea distinto de la favorita guardada.
  const [currencyTouched, setCurrencyTouched] = useState(false);
  // Notas es el campo de menor frecuencia de uso — colapsado por defecto
  // tras "+ Añadir nota"; si la entrada que se edita ya tiene notas, se ve
  // igualmente (el render comprueba form.notes, no solo este estado).
  const [notesOpen, setNotesOpen] = useState(false);
  const notesRef = useAutoResizeTextarea(form?.notes);
  const fabVisible = useHideFabOnScroll();
  // La hoja de creación/edición es la única superficie de esta pantalla
  // que no pasa por useFloatingDropdown (no es un panel flotante, es una
  // hoja inferior a pantalla completa) — bloquea el scroll de fondo por
  // su cuenta con el mismo hook compartido.
  useBodyScrollLock(!!creating);
  // Prueba de concepto de Motion (ver docs/ADR pendiente de motion): la
  // hoja de creación/edición gana entrada/salida animadas y un gesto de
  // arrastre para cerrar, en vez del aparecer/desaparecer instantáneo que
  // tenía antes. reducedMotion colapsa la duración sin quitar el gesto —
  // arrastrar para cerrar es una interacción iniciada por el usuario, no
  // una animación decorativa automática, así que sigue disponible.
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setCreating(entry._source);
    setForm(entry._source === "companeros"
      ? { date: entry.date, school: entry.school, activity: entry.activity, colleague_name: entry.colleague_name, amount: entry.amount, currency: entry.currency, notes: entry.notes || "" }
      : { date: entry.date, school: entry.school, activity: entry.activity, people: entry.people, notes: entry.notes || "" });
    setCurrencyTouched(false);
    setNotesOpen(false);
  };
  const closeSheet = () => {
    setCreating(null); setForm(null); setEditingEntry(null);
    setAddingRate(false); setRateForm(null); setCurrencyTouched(false); setNotesOpen(false);
  };

  // La tarjeta de "añadir tarifa" tiene su propio estilo (tarjeta blanca
  // con sombra), distinto de la caja de vista previa que la precede — no
  // reutiliza su mismo fondo, para no sentirse "incrustada" dentro de un
  // cuadro de texto informativo cuando en realidad es un mini-formulario
  // con su propia acción de guardar.
  const [addingRate, setAddingRate] = useState(false);
  const [rateForm, setRateForm] = useState(null);
  const [savingRate, setSavingRate] = useState(false);

  const emptyFormFor = (type, school = defaultSchool) => {
    const base = { date: new Date().toISOString().slice(0, 10), school, notes: "" };
    if (type === "companeros") return { ...base, activity: "", colleague_name: "", amount: "", currency: favoriteCurrency || defaultCurrency };
    return { ...base, activity: lastActivityFor(type, school) || defaultActivity, people: 1 };
  };
  const openCreate = (type) => {
    setCreating(type);
    setForm(emptyFormFor(type));
    setEditingEntry(null);
    setCurrencyTouched(false);
    setNotesOpen(false);
  };
  // Cambiar de tipo dentro de la propia hoja (selector Curso/Comisión/
  // Ajuste arriba) — sustituye a la hoja intermedia "¿Qué quieres
  // añadir?": el FAB entra directo al caso más frecuente (Curso
  // impartido, ver docs/ADR/0005) y este selector cubre el resto sin una
  // transición de hoja aparte. Solo aplica al crear — el tipo de una
  // entrada ya existente no se cambia desde aquí (movería la fila entre
  // tablas distintas, fuera de alcance).
  const switchType = (type) => {
    setCreating(type);
    setForm(emptyFormFor(type, form?.school));
    setCurrencyTouched(false);
    setAddingRate(false);
    setRateForm(null);
    setNotesOpen(false);
  };

  // Llegado desde el acceso directo de Home: abre directamente el
  // formulario del tipo correspondiente, sin pasar por el selector.
  useEffect(() => {
    if (autoOpenType === "log") openCreate("ganado");
    else if (autoOpenType === "comisiones") openCreate("comision");
    if (autoOpenType) onAutoOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ratesTableFor = (type) => (type === "ganado" ? rates : commissionRates);
  const rateFor = (type, school, activity) => ratesTableFor(type).rows.find((r) => r.school === school && r.activity === activity);

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
      if (editingEntry) {
        const patch = creating === "companeros"
          ? { ...form, amount: Number(form.amount) }
          : { ...form, people: Number(form.people) || 0 };
        await tableFor(creating).updateRow(editingEntry.id, patch);
        toast?.success("Cambios guardados");
      } else if (creating === "companeros") {
        await colleaguePayments.insertRow({ ...form, amount: Number(form.amount), status: defaultStatus });
        toast?.success("Ajuste añadido");
      } else {
        await tableFor(creating).insertRow({ ...form, people: Number(form.people) || 0, status: defaultStatus });
        toast?.success(creating === "ganado" ? "Curso añadido" : "Comisión añadida");
      }
      closeSheet();
    } catch {
      toast?.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  const openInlineRate = () => {
    setRateForm({ school: form.school, activity: form.activity, payment_type: defaultPaymentType, currency: defaultCurrency, rate: "" });
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
  // Mismo icono que su fila en "¿Qué quieres añadir?" — conecta visualmente
  // el paso 1 (elegir tipo) con el paso 2 (el formulario), y da a la hoja
  // la misma identidad visual que ya usa el resto de "Movimientos".
  const SheetIcon = CREATE_TYPES.find((t) => t.key === creating)?.icon;
  const typeColor = formAccentColor(creating, form?.amount);

  return (
    <div className="relative space-y-4 pb-24">
      <PendingCollectionCard totals={pendingTotals} count={pendingIncomeCount} currencyRows={currencies.rows} color={SUN} onPress={onOpenPayments} />

      <div className="flex items-center gap-5 border-b border-gray-200">
        {[["pendientes", `Pendientes${pendingAll.length > 0 ? ` · ${pendingAll.length}` : ""}`], ["cobrados", "Cobrados"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            aria-pressed={statusFilter === key}
            className="min-h-11 border-b-2 pb-2 text-[15px] font-semibold transition-colors"
            style={statusFilter === key ? { borderColor: TEAL, color: NAVY } : { borderColor: "transparent", color: "#9CA3AF" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${filtersOpen ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-600"}`}
          style={filtersOpen ? { backgroundColor: TEAL } : {}}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtrar{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
        {statusFilter === "pendientes" && pendingAll.length > 0 && (
          <button onClick={() => setConfirmingCollectAll(true)} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
            Cobrar todos
          </button>
        )}
        {statusFilter === "cobrados" && paidAll.length > 0 && (
          <button onClick={() => setConfirmingMarkAllPending(true)} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
            Marcar todos como pendientes
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingCollectAll}
        title={`¿Cobrar ${pendingAll.length} ${pendingAll.length === 1 ? "movimiento pendiente" : "movimientos pendientes"}?`}
        message={
          hasNegativeAjuste
            ? `Vas a marcar ${pendingAll.length === 1 ? "este movimiento" : `estos ${pendingAll.length} movimientos`} como cobrado(s) o liquidado(s) de golpe, según corresponda a cada uno. Puedes revertir cada uno por separado después, igual que al confirmarlo de uno en uno.`
            : `Vas a marcar ${pendingAll.length === 1 ? "este movimiento" : `estos ${pendingAll.length} movimientos`} como cobrado${pendingAll.length === 1 ? "" : "s"} de golpe. Puedes revertir cada uno por separado después, igual que al confirmarlo de uno en uno.`
        }
        onConfirm={confirmCollectAll}
        onCancel={() => setConfirmingCollectAll(false)}
        loading={collectingAll}
        confirmLabel="Cobrar"
        danger={false}
      />

      {/* Misma lógica que "Cobrar todos" en sentido inverso — vive en
          Cobrados, opera sobre los elementos visibles con los filtros
          activos (paidAll), mismo componente de confirmación. */}
      <ConfirmDialog
        open={confirmingMarkAllPending}
        title={`¿Marcar ${paidAll.length} ${paidAll.length === 1 ? "movimiento cobrado" : "movimientos cobrados"} como pendientes?`}
        message={`Vas a devolver ${paidAll.length === 1 ? "este movimiento" : `estos ${paidAll.length} movimientos`} a pendiente de golpe. Puedes revertir cada uno por separado después, igual que al hacerlo de uno en uno.`}
        onConfirm={confirmMarkAllPending}
        onCancel={() => setConfirmingMarkAllPending(false)}
        loading={markingAllPending}
        confirmLabel="Marcar pendientes"
        danger={false}
      />

      {filtersOpen && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
          <Field label="Periodo">
            <DateRangePicker from={filters.from} to={filters.to} onChange={(r) => setFilters({ ...filters, ...r })} />
          </Field>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Escuela"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" /></Field>
            <Field label="Curso"><MultiSelect value={filters.activity} onChange={(v) => setFilters({ ...filters, activity: v })} options={presentValues("activity")} placeholder="Todos" /></Field>
            <Field label="Tipo"><Select value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={TYPE_OPTIONS} placeholder="Todos" /></Field>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="min-h-9 text-xs font-medium text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {!dataLoaded ? (
          <div aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3.5 w-32 rounded bg-gray-200" />
                  <div className="h-3.5 w-14 rounded bg-gray-200" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="h-3 w-20 rounded bg-gray-100" />
                  <div className="h-3 w-16 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleList.length === 0 ? (
          // animate-help-fade-in (index.css): sin él, cuando la última fila
          // pendiente se anima fuera de la lista, este bloque aparece de
          // golpe al terminar la animación de la fila y "salta" al tomar su
          // propia altura de un tirón — reutiliza la única animación de
          // aparición ya existente en la app en vez de crear una nueva.
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center animate-help-fade-in">
            {statusFilter === "pendientes" && !hasActiveFilters && <PartyPopper size={26} className="text-gray-300" aria-hidden="true" />}
            <p className="text-sm text-gray-400">{emptyMessage(statusFilter, hasActiveFilters)}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="min-h-9 text-xs font-semibold" style={{ color: TEAL }}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div>
            {visibleList.map((e, i) => {
              const showGroupHeader = i === 0 || visibleList[i - 1].date !== e.date;
              return (
                <React.Fragment key={entryKey(e)}>
                  {showGroupHeader && (
                    <div className="bg-gray-50/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {dateGroupLabel(e.date)}
                    </div>
                  )}
                  <EntryRow
                    entry={e} activityColor={activityColor} currencyRows={currencies.rows}
                    isPending={statusFilter === "pendientes"}
                    onToggle={() => toggleStatus(e)}
                    onEdit={() => startEdit(e)}
                    onDelete={() => tableFor(e._source).deleteRow(e.id)}
                    animPhase={rowAnim[entryKey(e)]}
                  />
                </React.Fragment>
              );
            })}
            {showPaidCapHint && (
              <p className="px-4 py-3 text-center text-xs text-gray-400">
                Mostrando los {RECENT_PAID_LIMIT} cobrados más recientes de {paidAll.length} — usa "Filtrar" para ver un periodo concreto.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Antes el FAB abría una hoja intermedia "¿Qué quieres añadir?" y
          esa hoja abría a su vez la del formulario — dos transiciones para
          la acción más repetida de la app. Ahora entra directo al caso
          dominante (Curso impartido, ver docs/ADR/0005) y el selector de
          tipo vive arriba de la propia hoja (ver más abajo) — una
          transición menos, sin perder la posibilidad de elegir Comisión o
          Ajuste. */}
      <button
        onClick={() => openCreate("ganado")}
        aria-label="Añadir"
        aria-hidden={!fabVisible}
        tabIndex={fabVisible ? 0 : -1}
        className="fixed bottom-24 right-4 z-20 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-90"
        style={{
          backgroundColor: accentColor, width: 52, height: 52,
          opacity: fabVisible ? 1 : 0,
          transform: fabVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.7)",
          pointerEvents: fabVisible ? "auto" : "none",
        }}
      >
        <Plus size={24} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {creating && form && (
          <motion.div
            key="mi-trabajo-sheet-backdrop"
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

            {/* Selector de tipo integrado — sustituye a la hoja "¿Qué
                quieres añadir?". Solo al crear: el tipo de una entrada ya
                guardada no se cambia desde aquí (ver switchType). */}
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

            {creating === "companeros" && (
              <p className="mb-3 text-xs text-gray-400">Importe positivo si te paga a ti; negativo si le pagas tú a él/ella.</p>
            )}

            {/* Curso primero: es el único campo sin buen valor por
                defecto — Fecha ya es hoy, Escuela ya trae la tuya de
                Configuración (o la última que usaste en esa escuela, ver
                lastActivityFor), Nº personas ya es 1. Es literalmente la
                única decisión que casi siempre hace falta tomar, así que
                lidera el formulario en vez de ser un campo más. Curso en
                su propia fila también evita el solape de paneles que daba
                emparejarlo con otro select ancho (ver Select en
                shared.jsx). Notas al final, colapsada, por ser el campo
                de menor frecuencia de uso. */}
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
                  <>
                    <Field label="Instructor relacionado">
                      <input
                        list="mi-trabajo-colleague-names"
                        value={form.colleague_name}
                        onChange={(e) => setForm({ ...form, colleague_name: e.target.value })}
                        className={`${inputCls} w-full`}
                        placeholder="Ana, Marc..."
                      />
                      <datalist id="mi-trabajo-colleague-names">
                        {colleagueSuggestions(form.school).map((n) => <option key={n} value={n} />)}
                      </datalist>
                    </Field>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="Importe (puede ser negativo)">
                        <MoneyInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="90 ó -30" />
                      </Field>
                      <Field label="Moneda">
                        {/* Botón de favorita integrado junto al propio campo
                            (icono solo, mismo objetivo táctil 44×44 que el
                            resto de la app) en vez de una píldora de texto
                            suelta debajo — aparece pegado a la moneda que
                            describe, no como un elemento aparte más abajo
                            en el formulario. */}
                        <div className="flex items-center gap-1.5">
                          <div className="min-w-0 flex-1">
                            <CurrencySearchSelect
                              value={form.currency}
                              onChange={(v) => { setForm({ ...form, currency: v }); setCurrencyTouched(true); }}
                              currencyRows={currencies.rows}
                            />
                          </div>
                          {currencyTouched && form.currency && form.currency !== favoriteCurrency && (
                            <button
                              type="button"
                              onClick={() => markFavoriteCurrency(form.currency)}
                              aria-label={`Usar ${form.currency} como favorita`}
                              title={`Usar ${form.currency} como favorita`}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border"
                              style={{ borderColor: TEAL, color: TEAL }}
                            >
                              <Star size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </Field>
                    </div>
                  </>
                ) : (
                  // Nº personas y Total emparejados: el total es
                  // consecuencia directa de las personas, así que vive
                  // justo al lado del dato que lo modifica — antes era un
                  // bloque propio a todo lo ancho, ocupaba más scroll del
                  // que esta información necesita.
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
                    formulario, no como "otro formulario dentro del
                    formulario". Botón de guardar solo-icono, coherente con
                    el resto de acciones rápidas (stepper, favorita). */}
                {creating !== "companeros" && addingRate && (
                  <div className="space-y-2 border-l-2 pl-3" style={{ borderColor: "#FCD34D" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tarifa — {form.school} · {form.activity}</span>
                      <button type="button" onClick={() => { setAddingRate(false); setRateForm(null); }} disabled={savingRate} aria-label="Cancelar" className="text-gray-400">
                        <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 shrink-0">
                        <CurrencySearchSelect value={rateForm.currency} onChange={(v) => setRateForm({ ...rateForm, currency: v })} currencyRows={currencies.rows} />
                      </div>
                      <MoneyInput value={rateForm.rate} onChange={(v) => setRateForm({ ...rateForm, rate: v })} placeholder="Tarifa" aria-label="Tarifa" className="flex-1" />
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

    </div>
  );
}
