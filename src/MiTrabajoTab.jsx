import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw, SlidersHorizontal, PartyPopper } from "lucide-react";
import { NAVY, TEAL, SUN, CORAL, GREEN } from "./App";
import {
  Money, Field, Select, MultiSelect, DateRangePicker, ConfirmDialog, colorFor,
  isPendingStatus, oppositeStatus, useToast, RowMenu, todayStr, addDays, MOVEMENT_TYPE_META, Fab,
} from "./shared";
import { buildActivityEntries, buildIncomeEntries } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";
import MovementSheet from "./MovementSheet";

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

  // 2026-08-29: el doble rAF de la versión anterior NO garantizaba lo que
  // decía garantizar — confirmado con muestreo real (Playwright, sampling
  // cada pocos ms): maxHeight saltaba de "none" a "0px" en el primer
  // fotograma capturable, sin ningún valor intermedio, exactamente el
  // fallo que el doble rAF pretendía evitar. Causa real: `fixedHeight` se
  // fijaba dentro de un `useEffect` normal (efecto "pasivo", se ejecuta
  // DESPUÉS de que el navegador ya pueda haber pintado), así que no había
  // garantía real de que ese valor llegara a pintarse antes de que el rAF
  // disparase el colapso — a diferencia de handleDelete, donde
  // `setFixedHeight` ocurre de forma síncrona dentro del propio manejador
  // de clic (React lo confirma pintado antes de que corra cualquier rAF
  // posterior). `useLayoutEffect` sí da esa garantía por contrato (corre
  // de forma síncrona tras la mutación del DOM, antes de que el navegador
  // pinte) — con eso, un único rAF vuelve a bastar, igual que en
  // handleDelete: la primera pasada (fixedHeight aún null) mide y fija la
  // altura real, sin pintar todavía el colapso; la segunda pasada
  // (fixedHeight ya fijado) programa el único rAF que dispara el colapso,
  // ahora sí después de un pintado real con un valor numérico de partida.
  useLayoutEffect(() => {
    if (animPhase !== "exiting" || toggleExiting) return;
    if (fixedHeight == null) {
      const el = rowRef.current;
      if (el) setFixedHeight(el.scrollHeight);
      return;
    }
    const raf = requestAnimationFrame(() => setToggleExiting(true));
    return () => cancelAnimationFrame(raf);
  }, [animPhase, toggleExiting, fixedHeight]);

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
            {entry.date}{MOVEMENT_TYPE_META[entry._source]?.label ? ` · ${MOVEMENT_TYPE_META[entry._source].label}` : ""}
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

function emptyMessage(statusFilter, hasActiveFilters) {
  if (statusFilter === "pendientes") {
    return hasActiveFilters ? "Sin elementos pendientes con estos filtros." : "Estás al día — nada pendiente.";
  }
  return hasActiveFilters ? "Sin elementos cobrados con estos filtros." : "Todavía no has marcado nada como cobrado.";
}

// schools / activities / paymentTypes / paymentStatuses / currencies: { rows: [...] } — de useSupabaseTable
// rates / commissionRates / worklog / comisiones / colleaguePayments: { rows: [...], insertRow, updateRow, deleteRow, bulkUpdateWhere }
// accentColor: color de sección (nav_sections), para el FAB y el botón "Guardar" de la hoja (ver MovementSheet)
// userId: profile.user_id — clave de la moneda favorita en localStorage (ver MovementSheet)
// Unifica Registro + Comisiones + Compañeros en una única experiencia — ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md. Adaptador puro sobre el
// modelo actual (sin migración de datos ni cambio de esquema): sigue
// escribiendo sobre worklog/comisiones/colleague_payments de siempre.
export default function MiTrabajoTab({
  schools, activities, paymentTypes, paymentStatuses, currencies,
  rates, commissionRates, worklog, comisiones, colleaguePayments,
  accentColor = TEAL, userId = null, onOpenPayments,
}) {
  const toast = useToast();
  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";

  const activityColor = (name) => colorFor(activities.rows, name, "#374151");

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
  // Se actualiza en un efecto (tras el commit), no durante el propio
  // render — mutar un ref mientras se renderiza es una violación real de
  // las reglas de React (linter, Bloque final del job nocturno
  // 2026-09-03), aunque en la práctica no causara ningún bug observable
  // aquí: solo se LEE más tarde, desde `changeStatus`, nunca durante este
  // mismo render. Sin dependencias — debe correr tras cada render, igual
  // que la asignación directa que sustituye.
  useEffect(() => {
    liveRef.current = { filters, statusFilter };
  });
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

  // -----------------------------------------------------------------
  // Creación y edición delegadas por completo en MovementSheet (ver ese
  // archivo) — única fuente de verdad para la experiencia de
  // crear/editar, compartida con el acceso rápido y el calendario de Home
  // (ver docs/ADR/0005, addendum). Aquí solo vive qué se le pide abrir.
  const [sheetRequest, setSheetRequest] = useState(null);
  const fabVisible = useHideFabOnScroll();

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
          {/* Filtro de Escuela oculto con una sola escuela configurada
              (2026-08-30, reducción de complejidad): filtrar por algo que
              solo puede tener un valor no es un filtro, es ruido — vuelve a
              aparecer en cuanto exista una segunda escuela. */}
          <div className={`grid grid-cols-2 gap-2 ${schools.rows.length > 1 ? "sm:grid-cols-3" : ""}`}>
            {schools.rows.length > 1 && (
              <Field label="Escuela"><Select value={filters.school} onChange={(v) => setFilters({ ...filters, school: v })} options={presentValues("school")} placeholder="Todas" /></Field>
            )}
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
                    onEdit={() => setSheetRequest({ type: e._source, editingEntry: e })}
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
          tipo vive arriba de la propia hoja (ver MovementSheet) — una
          transición menos, sin perder la posibilidad de elegir Comisión o
          Ajuste. */}
      <Fab
        onClick={() => setSheetRequest({ type: "ganado", editingEntry: null })}
        label="Añadir"
        color={accentColor}
        visible={fabVisible}
      />

      <MovementSheet
        request={sheetRequest}
        onClose={() => setSheetRequest(null)}
        schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses}
        currencies={currencies} rates={rates} commissionRates={commissionRates}
        worklog={worklog} comisiones={comisiones} colleaguePayments={colleaguePayments}
        accentColor={accentColor} userId={userId}
      />
    </div>
  );
}
