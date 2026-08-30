import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Building2, GraduationCap, Handshake, Users, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatMoney, colorFor, DatePicker, Select, MoneyLine, MonthCalendar, MOVEMENT_TYPE_META, todayStr, ExpandableCard } from "./shared";
import { listItemVariants, usePrefersReducedMotion } from "./motion";
import { computeRateTotal, comparePeriods } from "./rateCalc";
import { NAVY, CORAL, GREEN } from "./App";

// Rediseño 2026-08-29 (ver docs/ADR/0009-rediseno-resumen.md): Resumen deja
// de mostrar todo a la vez (antes: calendario global + total + 2 desgloses,
// y luego una SEGUNDA sección casi idéntica solo para la escuela elegida,
// siempre montada) y pasa a "vistazo rápido primero, profundidad bajo
// demanda" — un único total protagonista arriba (con comparación al
// periodo anterior, la pregunta de 5 segundos: "¿cómo voy?") y el resto
// como tarjetas plegables (ExpandableCard) que no ocupan espacio hasta que
// se piden. Las listas rankeadas (Por escuela/Por curso) son ahora la
// misma exploración progresiva: tocar una escuela expande su desglose por
// curso en el sitio, en vez de una segunda sección de página completa
// dedicada a una sola escuela elegida en un desplegable aparte.
const NEUTRAL_GRAY = "#94A3B8";
// MOVEMENT_TYPE_META.companeros.color es un neutro claro pensado para texto
// (cabeceras de categoría del calendario, sobre fondo blanco) — aquí hace
// falta relleno sólido con texto blanco encima (botón activo del
// segmentado, tarjeta de total), donde ese mismo tono no da contraste
// suficiente. AJUSTE_FILL es un escalón más oscuro de la misma familia
// neutra (slate), no un color inventado aparte.
const AJUSTE_FILL = "#64748B";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmtInt = (n) => (n || 0).toLocaleString("es-ES");

function shortPeriodLabel(granularity, year, unitIndex) {
  if (granularity === "mensual") return MONTHS_SHORT[unitIndex];
  if (granularity === "trimestral") return `T${unitIndex + 1}`;
  if (granularity === "semestral") return `S${unitIndex + 1}`;
  return `${year}`;
}

const UNITS_PER_YEAR = { mensual: 12, trimestral: 4, semestral: 2, anual: 1 };

// Selector de granularidad + navegación de periodo, rediseñado 2026-08-29
// (ver docs/ADR/0009-rediseno-resumen.md, addendum): antes eran 2 controles
// separados, cada uno en su propia caja — 5 pastillas de granularidad
// ("Mensual"/"Trimestral"/...) que ya envolvían a 2 líneas en móvil, más una
// fila aparte con "‹ Agosto 2026 ›". Se fusionan en un único control (un
// desplegable compacto + la navegación de periodo en la misma fila) porque
// son la misma decisión en la práctica — "qué periodo estoy mirando", no
// dos preguntas distintas. "Personalizado" es la única granularidad sin
// navegación ‹ › con sentido (un rango arbitrario no tiene "periodo
// siguiente"), así que ahí la fila muestra el rango en vez de flechas.
const GRANULARITY_LABELS = { mensual: "Mes", trimestral: "Trimestre", semestral: "Semestre", anual: "Año", personalizado: "Rango" };
const GRANULARITY_LABEL_LIST = Object.values(GRANULARITY_LABELS);
const GRANULARITY_KEY_BY_LABEL = Object.fromEntries(Object.entries(GRANULARITY_LABELS).map(([k, l]) => [l, k]));

const pad2 = (n) => String(n).padStart(2, "0");
// Formatea un Date construido con componentes locales (new Date(y,m,d),
// nunca parseado de un string) de vuelta a "YYYY-MM-DD" leyendo sus PROPIOS
// getFullYear/getMonth/getDate — nunca toISOString(), que convierte a UTC y
// desplazaría el día en cualquier huso horario que no sea UTC+0.
const dstr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Devuelve el rango como strings "YYYY-MM-DD", nunca objetos Date — ver
// nota extensa junto a withinRange sobre por qué (bug real de límites de
// periodo corregido 2026-08-30).
function periodRange(granularity, year, unitIndex, customFrom, customTo) {
  if (granularity === "personalizado") return [customFrom || null, customTo || null];
  if (granularity === "mensual") {
    return [dstr(new Date(year, unitIndex, 1)), dstr(new Date(year, unitIndex + 1, 0))];
  }
  if (granularity === "trimestral") {
    const m0 = unitIndex * 3;
    return [dstr(new Date(year, m0, 1)), dstr(new Date(year, m0 + 3, 0))];
  }
  if (granularity === "semestral") {
    const m0 = unitIndex * 6;
    return [dstr(new Date(year, m0, 1)), dstr(new Date(year, m0 + 6, 0))];
  }
  return [dstr(new Date(year, 0, 1)), dstr(new Date(year, 11, 31))]; // anual
}

function periodLabel(granularity, year, unitIndex) {
  if (granularity === "mensual") return `${MONTHS[unitIndex]} ${year}`;
  if (granularity === "trimestral") return `T${unitIndex + 1} ${year}`;
  if (granularity === "semestral") return `S${unitIndex + 1} ${year}`;
  return `${year}`;
}

// current-period unit index para cada granularidad, a partir de "hoy"
function currentUnitFor(granularity, now) {
  if (granularity === "mensual") return now.getMonth();
  if (granularity === "trimestral") return Math.floor(now.getMonth() / 3);
  if (granularity === "semestral") return Math.floor(now.getMonth() / 6);
  return 0;
}

// Desplaza (year, unitIndex) `delta` unidades en la misma granularidad —
// negativo hacia atrás, positivo hacia delante, sin límite en ninguna
// dirección (igual que goPrev/goNext ya permiten navegar libremente hacia
// el futuro). Único punto de aritmética de periodos: lo usa tanto el
// delta de la tarjeta principal (shiftPeriod(..., -1), "el periodo
// anterior") como la franja de tendencia centrada en el periodo elegido
// (shiftPeriod(..., ±N)) — antes cada uno tenía su propia función. Basado
// en índice absoluto (year*unidadesPorAño + unitIndex) para que cruzar
// varios años de una vez (delta grande) sea aritmética simple, no un
// bucle. "personalizado" no tiene una unidad natural (el usuario ha
// elegido un rango arbitrario), así que nunca se llama con esa
// granularidad — ver canCompare en Hero y el guard de trendPeriods.
function shiftPeriod(granularity, year, unitIndex, delta) {
  const unitsPerYear = UNITS_PER_YEAR[granularity] || 12;
  const absolute = year * unitsPerYear + unitIndex + delta;
  return { year: Math.floor(absolute / unitsPerYear), unitIndex: ((absolute % unitsPerYear) + unitsPerYear) % unitsPerYear };
}

// allColleague: cierto solo si TODAS las entradas de esa clave son Ajustes
// de curso — colleague_payments no tiene concepto de persona (siempre
// aporta 0), así que un grupo compuesto solo por ajustes no debe mostrar
// "0 personas" como si fuera un dato real; un grupo mixto (curso + ajuste
// con la misma escuela/actividad) sigue mostrando el recuento real.
function groupSum(entries, keyFn, opts = {}) {
  const { amountKey = "total", currencyKey = "currency", withPeople = false } = opts;
  const map = {};
  entries.forEach((e) => {
    const key = keyFn(e);
    if (!map[key]) map[key] = { totals: {}, people: 0, allColleague: true };
    map[key].totals[e[currencyKey]] = (map[key].totals[e[currencyKey]] || 0) + e[amountKey];
    if (withPeople) map[key].people += (e.people || 0);
    map[key].allColleague = map[key].allColleague && e._source === "companeros";
  });
  return Object.entries(map).map(([key, v]) => ({ key, totals: v.totals, people: v.people, allColleague: v.allColleague }));
}

// Suma todas las monedas de un total sin convertir — aproximación ya usada
// en este archivo desde antes (ver topSchoolColorForDay) para decidir
// "cuál domina" cuando no hace falta precisión contable, solo orden. Sirve
// igual para rankear listas (mayor primero) que para elegir el color del
// día dominante en el calendario.
function magnitude(totals) {
  return Object.values(totals).reduce((s, v) => s + v, 0);
}

// Lista rankeada (mayor importe primero, ver magnitude()) reutilizada por
// Por escuela / Por curso / los desgloses de Comisiones. onToggle+
// expandedKey+renderExpanded son opcionales: "Por escuela" los usa para
// expandir el desglose por curso de una escuela al tocarla, y "Por curso"
// (2026-08-30, feedback explícito) para expandir el desglose por TIPO de
// movimiento (Curso/Comisión/Ajuste) de un curso concreto al tocarlo —
// la misma exploración progresiva que el resto de la tarjeta, sin una
// segunda pantalla ni un selector aparte. badge es opcional: "Por escuela" lo usa
// para mostrar la evolución vs. el periodo anterior junto al nombre (ver
// SchoolGrowthBadge) sin que RankedList sepa nada de "qué es crecimiento"
// — solo pinta lo que le devuelva badge(key), si lo hay. El orden es
// siempre por importe: mostrarlo todo junto de un vistazo (importe +
// evolución) es más fácil de entender que un modo de ordenación aparte
// que hay que activar y descifrar (ver docs/PROPUESTA-home-resumen.md,
// revisión 2026-08-30 tras feedback explícito de que el toggle anterior
// no se entendía sin explicación).
function RankedList({ rows, currencyRows, textColor, emptyLabel = "Sin datos.", expandedKey, onToggle, renderExpanded, badge }) {
  const reduced = usePrefersReducedMotion();
  const sorted = useMemo(() => [...rows].sort((a, b) => magnitude(b.totals) - magnitude(a.totals)), [rows]);
  if (sorted.length === 0) return <p className="px-1 py-1 text-sm text-gray-400">{emptyLabel}</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            onClick={onToggle ? () => onToggle(r.key) : undefined}
            aria-expanded={onToggle ? expandedKey === r.key : undefined}
            className={`flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm ${onToggle ? "" : "cursor-default"}`}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate font-medium" style={{ color: textColor ? textColor(r.key) : "#334155" }}>
              <span className="truncate">{r.key}</span>
              {badge && badge(r.key)}
              {onToggle && (
                <ChevronDown size={13} aria-hidden="true" className="shrink-0 text-gray-300 transition-transform" style={{ transform: expandedKey === r.key ? "rotate(180deg)" : "none" }} />
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2 tabular-nums">
              {!r.allColleague && <span className="text-xs text-gray-400">{fmtInt(r.people)}p</span>}
              <span className="font-semibold" style={{ color: NAVY }}><MoneyLine totals={r.totals} currencyRows={currencyRows} /></span>
            </span>
          </button>
          {onToggle && (
            <AnimatePresence initial={false}>
              {expandedKey === r.key && (
                <motion.div {...listItemVariants(reduced)} className="pb-2 pl-3">
                  {renderExpanded(r.key)}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </li>
      ))}
    </ul>
  );
}

// Tarjeta protagonista — "¿cómo voy?" en 5 segundos: el total del periodo
// elegido, y cuánto ha cambiado respecto al periodo anterior equivalente
// (mismo mes/trimestre/semestre/año, uno antes). Sin comparación cuando no
// es una cifra exacta y con sentido: rango personalizado (sin "periodo
// anterior" natural), o cuando alguno de los dos totales mezcla más de una
// moneda (ver singleCurrencyAmount) — antes callar que mostrar un delta
// que parezca preciso sin serlo.
function HeroTotal({ label, period, color, total, previousTotal, canCompare, currencyRows }) {
  const cmp = canCompare ? comparePeriods(total, previousTotal) : null;

  return (
    <div className="rounded-lg p-4 text-white shadow-sm" style={{ backgroundColor: color }}>
      <div className="text-xs font-medium opacity-80">{label} — {period}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums"><MoneyLine totals={total} currencyRows={currencyRows} /></div>
      {cmp && (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-medium opacity-90">
          {cmp.delta > 0 ? <TrendingUp size={13} aria-hidden="true" /> : cmp.delta < 0 ? <TrendingDown size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
          {cmp.pct !== null
            ? `${cmp.delta >= 0 ? "+" : ""}${cmp.pct.toFixed(0)}% vs periodo anterior`
            : `${cmp.delta >= 0 ? "+" : ""}${formatMoney(cmp.delta, cmp.code, currencyRows)} vs periodo anterior`}
        </div>
      )}
    </div>
  );
}

// Cuántos periodos se muestran a cada lado del elegido — un vistazo, no
// un histórico completo. 3+elegido+3 = 7 barras, cabe cómodo en el ancho
// de un iPhone con etiquetas legibles debajo de cada una.
const TREND_RADIUS = 3;

// Franja de tendencia — 2026-08-29: la tarjeta principal (HeroTotal) ya
// respondía "¿cómo voy?" comparado con UN periodo anterior, pero nada en
// la pantalla daba una sensación de trayectoria a más largo plazo (¿llevo
// varios meses subiendo, bajando, estable?) — la pregunta que de verdad le
// importa al perfil "obsesionado con los números" antes incluso de
// profundizar por escuela o curso.
//
// Rediseño 2026-08-30 (feedback explícito del usuario): la primera
// versión mostraba siempre los últimos 6 periodos terminando en el
// elegido (el elegido, pegado al borde derecho) — funcionaba como
// atajo de navegación, pero no comunicaba "estoy viendo este periodo y
// puedo moverme a los lados". Ahora la franja se recalcula CENTRADA en
// el periodo elegido (TREND_RADIUS a cada lado) cada vez que cambia: al
// entrar, el periodo actual nace elegido, así que nace centrado; tocar
// cualquier barra (izquierda = atrás, derecha = adelante, sin límite en
// ninguna dirección — mismo criterio que goPrev/goNext) la convierte en
// la nueva elegida y la franja entera se recentra en ella. Sin control
// adicional (flechas propias): el propio gesto de tocar una barra ya es
// la navegación, y la posición central de la barra resaltada es la
// indicación visual de "estoy aquí". La barra que corresponde al periodo
// real de HOY lleva además un punto bajo su etiqueta cuando no es la
// elegida, para no perder de vista "dónde estoy ahora" al navegar lejos.
// Cada barra sigue usando magnitude() (suma sin convertir divisas) solo
// para la ALTURA relativa — aproximación visual ya aceptada en esta
// pantalla (ver topSchoolColorForDay), nunca una cifra mostrada como
// exacta.
// Rediseño 2026-08-30 (segunda vuelta, feedback explícito): la franja se
// solapaba con su propio título y "cambiaba de altura" al tocar barras.
// Causa raíz real, no aparente: cada botón apilaba barra+etiqueta+punto de
// "hoy" (hasta ~70px de contenido) dentro de un contenedor con una altura
// FIJA de 56px — cuando la barra más alta se acercaba a su máximo, el
// contenido entero desbordaba ese contenedor hacia ARRIBA (items-end
// ancla por abajo), invadiendo visualmente el título de encima; y como el
// desborde dependía de qué periodo era el más alto en cada momento, el
// alto total del bloque cambiaba con cada navegación. Arreglo: la barra
// vive dentro de su propio "carril" de altura fija (h-11, con la barra
// alineada abajo dentro de ÉL, no del bloque entero) — el carril nunca
// cambia de tamaño, solo el color/alto de la barra DENTRO de él, así que
// el alto total del botón (carril + etiqueta + punto) es constante para
// los 7 periodos siempre, sin desbordar nada.
function TrendBars({ periods, color, onSelect }) {
  const max = Math.max(1, ...periods.map((p) => magnitude(p.totals)));
  return (
    <div className="flex gap-1.5">
      {periods.map((p) => (
        <button
          key={`${p.year}-${p.unitIndex}`}
          type="button"
          onClick={() => onSelect(p)}
          disabled={p.isSelected}
          aria-label={`Ir a ${p.label}${p.isCurrent ? " (periodo actual)" : ""}`}
          aria-current={p.isSelected ? "true" : undefined}
          className="flex flex-1 flex-col items-center gap-1"
        >
          <div className="flex h-11 w-full items-end">
            <div
              className="w-full rounded-sm"
              style={{ height: Math.round(Math.max(4, (magnitude(p.totals) / max) * 44)), backgroundColor: p.isSelected ? color : `${color}4D` }}
            />
          </div>
          <span className="truncate text-[10px] font-medium" style={{ color: p.isSelected ? color : "#9CA3AF" }}>
            {shortPeriodLabel(p.granularity, p.year, p.unitIndex)}
          </span>
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: color, opacity: p.isCurrent && !p.isSelected ? 1 : 0 }} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

// Evolución de cada escuela vs. el mismo periodo anterior — comparativa de
// ingresos que ya existe a nivel de TOTAL (HeroTotal/TrendBars), ahora
// también por escuela. Rediseño 2026-08-30 tras feedback explícito: la
// primera versión era un toggle "Importe/Crecimiento" que reordenaba toda
// la lista y necesitaba explicarse para entenderse (qué significa cada
// modo, por qué una fila decía "Sin datos anteriores"...). Sustituido por
// esto, mucho más simple: SIEMPRE se ve junto al nombre, en la MISMA lista
// de siempre (ordenada por importe, la pregunta más obvia — "quién me
// genera más"), reutilizando el mismo icono+porcentaje que ya usa
// HeroTotal arriba en la misma pantalla — quien ya entendió esa tarjeta
// entiende esto sin que nadie se lo explique.
//
// Sin base real con la que comparar (sin ningún dato de esa escuela el
// periodo anterior, o mezcla de monedas): silencio, no una etiqueta que
// justificar. Se descartó explícitamente un "Nuevo" para ese caso (una
// versión anterior de este mismo cambio lo tenía): "sin datos el periodo
// anterior" no distingue de forma fiable una escuela realmente nueva de
// una ya establecida que simplemente no tuvo actividad justo el periodo
// anterior — afirmar "Nuevo" ahí sería a veces sencillamente falso. Sin
// una evolución real que mostrar, no hay nada honesto que decir.
function SchoolGrowthBadge({ growth }) {
  if (!growth || growth.pct === null) return null;
  const Icon = growth.pct > 0 ? TrendingUp : growth.pct < 0 ? TrendingDown : Minus;
  const color = growth.pct > 0 ? GREEN : growth.pct < 0 ? CORAL : "#9CA3AF";
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold" style={{ color }}>
      <Icon size={10} aria-hidden="true" />{growth.pct >= 0 ? "+" : ""}{growth.pct.toFixed(0)}%
    </span>
  );
}

// worklog / rates / comisiones / commissionRates / activities / schools / currencies / colleaguePayments: hooks de useSupabaseTable
export default function SummaryTab({ worklog, rates, comisiones, commissionRates, activities, schools, currencies, colleaguePayments }) {
  const now = new Date();
  const [granularity, setGranularity] = useState("mensual");
  const [source, setSource] = useState("total"); // "total" | "ganado" | "comision" | "companeros"
  const [year, setYear] = useState(now.getFullYear());
  const [unitIndex, setUnitIndex] = useState(now.getMonth());
  // dstr()/todayStr(), nunca toISOString() (fecha UTC, desplaza un día en
  // cualquier huso horario negativo) — mismo bug de fondo que el resto de
  // este archivo, ver nota junto a withinRange más abajo.
  const [customFrom, setCustomFrom] = useState(dstr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(todayStr());
  const [expandedSchool, setExpandedSchool] = useState(null);
  const [expandedActivity, setExpandedActivity] = useState(null);

  const SOURCES = [
    ["total", "Total"],
    ["ganado", MOVEMENT_TYPE_META.ganado.label],
    ["comision", MOVEMENT_TYPE_META.comision.label],
    ["companeros", MOVEMENT_TYPE_META.companeros.label],
  ];
  const SOURCE_META = { ...MOVEMENT_TYPE_META, companeros: { ...MOVEMENT_TYPE_META.companeros, color: AJUSTE_FILL } };
  // label -> color, para pintar el desglose por tipo dentro de "Por curso"
  // (renderActivityTypes) con el mismo criterio de color que el resto de
  // la pantalla, sin repetir SOURCE_META con las claves ya traducidas.
  const SOURCE_TYPE_COLOR = Object.fromEntries(Object.values(SOURCE_META).map((m) => [m.label, m.color]));

  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");
  const schoolColor = (name) => colorFor(schools.rows, name, "#334155");
  // Con una sola escuela, cualquier desglose "por escuela" es idéntico al
  // total — reducción de complejidad (2026-08-30): desaparece hasta que
  // exista una segunda escuela, en vez de mostrar una comparación de un
  // único elemento consigo mismo.
  const hasMultipleSchools = schools.rows.length > 1;
  const sourceColor = source === "total" ? NAVY : SOURCE_META[source].color;
  const sourceLabel = source === "total" ? "Total combinado" : `Total ${SOURCE_META[source].label}`;

  const rateTotal = (e, ratesTable) => {
    const r = ratesTable.rows.find((r) => r.school === e.school && r.activity === e.activity);
    return { total: computeRateTotal(r, e.people), currency: r?.currency || e.currency || fallbackCurrency };
  };

  const ganadoEntries = useMemo(() => worklog.rows.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" })), [worklog.rows, rates.rows, fallbackCurrency]);
  const comisionEntries = useMemo(() => comisiones.rows.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" })), [comisiones.rows, commissionRates.rows, fallbackCurrency]);
  const companerosEntries = useMemo(() => colleaguePayments.rows.map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" })), [colleaguePayments.rows]);

  const withTotals = useMemo(() => {
    if (source === "total") return [...ganadoEntries, ...comisionEntries, ...companerosEntries];
    if (source === "ganado") return ganadoEntries;
    if (source === "comision") return comisionEntries;
    return companerosEntries;
  }, [source, ganadoEntries, comisionEntries, companerosEntries]);

  // ---- navegación de periodo — cambiar de granularidad siempre salta al
  // periodo actual de esa granularidad (nunca se queda "colgado" en un
  // índice que no corresponde a hoy). ----
  const changeGranularity = (g) => {
    setGranularity(g);
    setYear(now.getFullYear());
    setUnitIndex(currentUnitFor(g, now));
  };
  // Navegar de uno en uno (antes goPrev/goNext, botones ‹ › en la cabecera)
  // se retiró como control propio 2026-08-30 — la franja de tendencia ya
  // cubre exactamente ese caso (sus dos barras vecinas) con el mismo
  // shiftPeriod, y además "más lejos" en un solo toque. Un único mecanismo
  // de navegación de periodo, no dos.

  // Comparación por STRING "YYYY-MM-DD", nunca por objeto Date — bug real
  // corregido 2026-08-30: e.date es un string de fecha sin hora
  // ("2026-08-01"), y `new Date("2026-08-01")` lo interpreta como
  // medianoche UTC (regla del propio estándar ECMA-262 para strings de
  // fecha sin hora), mientras que `rangeStart`/`rangeEnd` se construían
  // con `new Date(year, month, day)` — medianoche en la ZONA HORARIA
  // LOCAL del navegador. En cualquier huso horario que no sea UTC+0, esas
  // dos medianoches NO coinciden: en husos negativos (América completa),
  // un movimiento fechado el día 1 de un periodo podía comparar como
  // ANTERIOR al inicio del propio periodo y desaparecer de su total; en
  // husos positivos (p. ej. Tailandia, UTC+7), el mismo problema afectaba
  // al último día del periodo. En ambos casos el movimiento podía quedar
  // fuera del periodo actual Y del anterior a la vez — ausente de
  // cualquier suma sin ningún aviso. Comparar los strings ISO
  // "YYYY-MM-DD" directamente (ordenan igual que las fechas que
  // representan) elimina el problema de raíz: ninguna de las dos partes
  // pasa nunca por un huso horario.
  const [rangeStart, rangeEnd] = periodRange(granularity, year, unitIndex, customFrom || null, customTo || null);
  const withinRange = (list, dateKey = "date") => list.filter((e) => {
    if (!rangeStart || !rangeEnd) return false;
    const d = e[dateKey];
    return d >= rangeStart && d <= rangeEnd;
  });

  const periodEntries = useMemo(() => withinRange(withTotals), [withTotals, rangeStart, rangeEnd]);

  // Periodo anterior equivalente, solo para el delta de la tarjeta
  // principal — no alimenta ningún otro desglose de la pantalla.
  const { year: prevYear, unitIndex: prevUnitIndex } = shiftPeriod(granularity, year, unitIndex, -1);
  const [prevStart, prevEnd] = periodRange(granularity, prevYear, prevUnitIndex);
  const previousPeriodEntries = useMemo(() => {
    if (granularity === "personalizado") return [];
    return withTotals.filter((e) => { const d = e.date; return d >= prevStart && d <= prevEnd; });
  }, [withTotals, granularity, prevStart, prevEnd]);

  // Color del círculo de cada día en el calendario: el de la escuela que
  // más ha facturado ese día (sumando importes sin convertir divisas —
  // ver magnitude()), o gris neutro si hay empate.
  const topSchoolColorForDay = (list) => {
    const sums = {};
    list.forEach((e) => { sums[e.school] = (sums[e.school] || 0) + (e.total || 0); });
    const sorted = Object.entries(sums).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return NEUTRAL_GRAY;
    if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return NEUTRAL_GRAY;
    return schoolColor(sorted[0][0]);
  };

  const globalLegend = useMemo(() => {
    const names = [...new Set(periodEntries.map((e) => e.school))];
    return names.map((n) => ({ label: n, color: schoolColor(n) }));
  }, [periodEntries, schools.rows]);

  const globalTotal = groupSum(periodEntries, () => "Total")[0]?.totals || {};
  const previousTotal = groupSum(previousPeriodEntries, () => "Total")[0]?.totals || {};
  const globalBySchool = groupSum(periodEntries, (e) => e.school, { withPeople: true });
  const globalByActivity = groupSum(periodEntries, (e) => e.activity, { withPeople: true });

  // "Rango" no tiene periodo anterior natural (mismo motivo por el que
  // HeroTotal/TrendBars tampoco comparan ahí) — sin indicio de evolución
  // en "Por escuela" mientras dure, la lista se ve exactamente igual que
  // siempre (solo importe).
  const canCompareGrowth = granularity !== "personalizado";
  const previousBySchool = useMemo(() => groupSum(previousPeriodEntries, (e) => e.school, { withPeople: true }), [previousPeriodEntries]);
  const schoolGrowthByKey = useMemo(() => {
    const prevMap = Object.fromEntries(previousBySchool.map((r) => [r.key, r.totals]));
    return Object.fromEntries(globalBySchool.map((r) => [r.key, comparePeriods(r.totals, prevMap[r.key])]));
  }, [globalBySchool, previousBySchool]);

  // En modo Total, el combinado por escuela/curso no distingue de dónde
  // viene el dinero — se añade aparte el desglose solo de Comisiones para
  // no perder esa cifra dentro del total.
  const comisionPeriodEntries = useMemo(() => withinRange(comisionEntries), [comisionEntries, rangeStart, rangeEnd]);
  const comisionBySchool = groupSum(comisionPeriodEntries, (e) => e.school, { withPeople: true });
  const comisionByActivity = groupSum(comisionPeriodEntries, (e) => e.activity, { withPeople: true });

  // Pagos de compañeros del periodo — ya no filtrados a una escuela
  // elegida en un desplegable (ese filtro de página desapareció con la
  // sección "Por escuela" dedicada): un pago a un compañero es sobre una
  // persona, no algo que tenga sentido mirar escuela a escuela.
  const colleaguePeriodEntries = useMemo(() => withinRange(colleaguePayments.rows), [colleaguePayments.rows, rangeStart, rangeEnd]);
  const colleagueByName = groupSum(colleaguePeriodEntries, (p) => p.colleague_name, { amountKey: "amount", currencyKey: "currency" });

  const label = granularity === "personalizado"
    ? (customFrom && customTo ? `${customFrom} → ${customTo}` : "Elige un rango")
    : periodLabel(granularity, year, unitIndex);

  // Ventana de TREND_RADIUS periodos a cada lado del elegido (más antiguo
  // primero), para TrendBars — sin límite hacia el futuro, igual que
  // goNext. Sin sentido en "Rango" (sin secuencia natural de periodos),
  // igual que el delta de HeroTotal.
  const trendPeriods = useMemo(() => {
    if (granularity === "personalizado") return [];
    const nowUnit = currentUnitFor(granularity, now);
    const periods = [];
    for (let offset = -TREND_RADIUS; offset <= TREND_RADIUS; offset++) {
      const { year: y, unitIndex: u } = shiftPeriod(granularity, year, unitIndex, offset);
      const [start, end] = periodRange(granularity, y, u);
      const entries = withTotals.filter((e) => e.date >= start && e.date <= end); // strings, ver nota de withinRange
      periods.push({
        year: y,
        unitIndex: u,
        granularity,
        label: periodLabel(granularity, y, u),
        totals: groupSum(entries, () => "Total")[0]?.totals || {},
        isSelected: offset === 0,
        isCurrent: y === now.getFullYear() && u === nowUnit,
      });
    }
    return periods;
  }, [granularity, year, unitIndex, withTotals]);

  const renderSchoolActivities = (schoolName) => {
    const rows = groupSum(periodEntries.filter((e) => e.school === schoolName), (e) => e.activity, { withPeople: true });
    return <RankedList rows={rows} currencyRows={currencies.rows} textColor={activityColor} emptyLabel="Sin cursos en este periodo." />;
  };

  // Desglose por TIPO de movimiento (Curso/Comisión/Ajuste) de un curso
  // concreto — feedback explícito 2026-08-30. Mismo patrón que "Por
  // escuela" (expandir en el sitio, sin pantalla ni selector aparte): un
  // curso puede generar ingreso por varias vías (lo impartes tú, lo trae
  // un compañero, hay un ajuste de por medio) y hasta ahora "Por curso"
  // solo daba el total combinado, sin decir de dónde venía.
  const renderActivityTypes = (activityName) => {
    const rows = groupSum(periodEntries.filter((e) => e.activity === activityName), (e) => SOURCE_META[e._source]?.label || e._source, { withPeople: true });
    return <RankedList rows={rows} currencyRows={currencies.rows} textColor={(label) => SOURCE_TYPE_COLOR[label] || NAVY} emptyLabel="Sin movimientos en este periodo." />;
  };

  return (
    <div className="space-y-4">
      {/* Cabecera de periodo + tendencia, fusionadas en una misma tarjeta
          (feedback explícito 2026-08-30): antes eran dos bloques
          separados que hacían casi lo mismo — este de aquí cambiaba de
          periodo de uno en uno con flechas, y la franja de tendencia
          (más abajo en el render anterior) también navegaba, con más
          alcance (7 periodos, cualquier distancia). Mantener las dos
          era duplicar el mismo control con menos capacidad en uno de
          ellos, así que las flechas ‹ › desaparecen: la propia franja
          ya cubre "un periodo antes/después" (sus dos barras vecinas) y
          además "más lejos" en un solo toque — sin añadir ningún
          control nuevo, con uno menos que antes. */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 p-2">
          <div className="w-[6.5rem] shrink-0">
            <Select
              value={GRANULARITY_LABELS[granularity]}
              onChange={(l) => changeGranularity(GRANULARITY_KEY_BY_LABEL[l])}
              options={GRANULARITY_LABEL_LIST}
              label="Granularidad del periodo"
            />
          </div>
          <span className="flex-1 truncate text-center text-sm font-semibold tabular-nums" style={{ color: NAVY }}>{label}</span>
        </div>
        {trendPeriods.length > 0 && (
          <div className="border-t border-gray-100 p-3">
            <div className="mb-2 text-xs font-medium text-gray-400">Tendencia — toca un periodo para navegar</div>
            <TrendBars
              periods={trendPeriods}
              color={sourceColor}
              onSelect={(p) => { setYear(p.year); setUnitIndex(p.unitIndex); }}
            />
          </div>
        )}
      </div>

      {granularity === "personalizado" && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-white p-3">
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Desde</span>
            <DatePicker value={customFrom} onChange={setCustomFrom} />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500">Hasta</span>
            <DatePicker value={customTo} onChange={setCustomTo} />
          </div>
        </div>
      )}

      {/* Total / Curso / Comisión / Ajuste */}
      <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {SOURCES.map(([key, l]) => (
          <button
            key={key}
            onClick={() => setSource(key)}
            className="min-h-9 rounded-md px-3.5 text-sm font-medium transition-colors"
            style={source === key ? { backgroundColor: key === "total" ? NAVY : SOURCE_META[key].color, color: "white" } : { color: "#6B7280" }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Protagonista: la respuesta de 5 segundos. */}
      <HeroTotal
        label={sourceLabel}
        period={label}
        color={sourceColor}
        total={globalTotal}
        previousTotal={previousTotal}
        canCompare={granularity !== "personalizado"}
        currencyRows={currencies.rows}
      />

      {/* Todo lo demás es profundidad bajo demanda — nada de esto ocupa
          espacio hasta que se pide, ver ADR-0009. "Por escuela" (y el
          desglose "Por escuela" dentro de Comisiones, y la leyenda de
          colores del calendario) solo tienen sentido con más de una
          escuela configurada — con una sola, "por escuela" es idéntico
          al total y no aporta nada, así que desaparecen hasta que exista
          una segunda (2026-08-30, reducción de complejidad). "Por curso"
          hereda el defaultOpen cuando "Por escuela" no está, para que
          la pantalla no se quede con todo colapsado de entrada. */}
      {hasMultipleSchools && (
        <ExpandableCard title="Por escuela" icon={Building2} iconColor={NAVY} defaultOpen>
          <RankedList
            rows={globalBySchool}
            currencyRows={currencies.rows}
            textColor={schoolColor}
            expandedKey={expandedSchool}
            onToggle={(key) => setExpandedSchool((cur) => (cur === key ? null : key))}
            renderExpanded={renderSchoolActivities}
            badge={canCompareGrowth ? (key) => <SchoolGrowthBadge growth={schoolGrowthByKey[key]} /> : undefined}
          />
        </ExpandableCard>
      )}

      <ExpandableCard title="Por curso" icon={GraduationCap} iconColor={MOVEMENT_TYPE_META.ganado.color} defaultOpen={!hasMultipleSchools}>
        <RankedList
          rows={globalByActivity}
          currencyRows={currencies.rows}
          textColor={activityColor}
          expandedKey={expandedActivity}
          onToggle={(key) => setExpandedActivity((cur) => (cur === key ? null : key))}
          renderExpanded={renderActivityTypes}
        />
      </ExpandableCard>

      {/* Jerarquía revisada 2026-08-30 (Head Designer, sin orden cerrado de
          antemano): Por escuela/Por curso/Comisiones/Ajustes de curso
          responden todas la misma pregunta — "¿de dónde sale el total?",
          cada una con su propio corte — así que van juntas. Calendario
          responde una pregunta distinta ("¿cuándo?", no "¿de dónde?") y
          es la más exploratoria de las cinco, así que cierra la lista en
          vez de partirla en dos mitades. Vocabulario también revisado:
          "Pagos de compañeros" pasa a "Ajustes de curso" — en el resto de
          la app (Mi trabajo, MovementSheet) ya no existe "pago de
          compañero" como concepto propio, es el mismo tipo de movimiento
          que "Ajuste de curso"; Resumen era la última pantalla que
          todavía usaba el nombre antiguo. */}
      {source === "total" && (
        <ExpandableCard title="Comisiones" icon={Handshake} iconColor={SOURCE_META.comision.color}>
          <div className="space-y-3">
            {hasMultipleSchools && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold text-gray-500">Por escuela</h4>
                <RankedList rows={comisionBySchool} currencyRows={currencies.rows} textColor={schoolColor} />
              </div>
            )}
            <div>
              <h4 className="mb-1.5 text-xs font-semibold text-gray-500">Por curso</h4>
              <RankedList rows={comisionByActivity} currencyRows={currencies.rows} textColor={activityColor} />
            </div>
          </div>
        </ExpandableCard>
      )}

      {(source === "total" || source === "companeros") && (
        <ExpandableCard title="Ajustes de curso" icon={Users} iconColor={SOURCE_META.companeros.color}>
          {colleagueByName.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ajustes de curso en este periodo.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {colleagueByName.map((r) => {
                const netPositive = magnitude(r.totals) >= 0;
                return (
                  <li key={r.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-gray-700">{r.key}</span>
                    <span className="font-semibold tabular-nums" style={{ color: netPositive ? GREEN : CORAL }}>
                      <MoneyLine totals={r.totals} currencyRows={currencies.rows} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ExpandableCard>
      )}

      {granularity === "mensual" && (
        <ExpandableCard title="Calendario" icon={Calendar} iconColor={NAVY}>
          <MonthCalendar
            year={year}
            month={unitIndex}
            entries={periodEntries}
            dotColor={topSchoolColorForDay}
            legend={hasMultipleSchools ? globalLegend : undefined}
            currencyRows={currencies.rows}
            activityColor={activityColor}
            groupBySource={source === "total"}
            sourceMeta={SOURCE_META}
          />
        </ExpandableCard>
      )}
    </div>
  );
}
