import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { NAVY, TEAL, SUN, GREEN, CORAL } from "./App";
import { Money, formatMoney, MonthCalendar, colorFor, isPendingStatus, MOVEMENT_TYPE_META } from "./shared";
import { computeRateTotal, buildIncomeEntries, comparePeriods } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";

// worklog / rates / comisiones / commissionRates / colleaguePayments / activities /
// schools / currencies / paymentStatuses: hooks de useSupabaseTable
// onQuickCreate: (type, date?) => abre MovementSheet SIN cambiar de
// pestaña (Home sigue visible mientras se rellena) — solo al guardar con
// éxito se navega a Mi trabajo, ver App.jsx/startHomeCreate. date opcional
// preselecciona esa fecha en vez de la de hoy (la usa el calendario de
// abajo). type es directamente "ganado"/"comision"/"companeros" — ya no
// hace falta el id de pestaña antiguo ("log"), ver docs/ADR/0005 addendum.
// onOpenPending: () => navega a Mi trabajo (tarjeta "Pendiente de cobrar")
// — Mi trabajo abre ya en su pestaña "Pendientes" por defecto, así que no
// hace falta pasarle ningún filtro explícito.
// onOpenSummary: () => navega a Resumen — puente táctil desde "Generado
// este mes" (ver comentario junto a esa tarjeta más abajo). Resumen se
// monta de cero al entrar (no queda en el DOM mientras se ve otra pestaña,
// ver App.jsx), así que ya abre por defecto en "Mes"/mes actual sin
// necesidad de pasarle ningún estado de periodo.
// "YYYY-MM" de un Date construido con componentes locales — nunca
// toISOString() ni new Date(e.date).getMonth(): un string de fecha sin
// hora ("2026-08-01") se parsea como medianoche UTC (ECMA-262), y
// .getMonth()/.getFullYear() lo leen de vuelta en la zona horaria LOCAL —
// en cualquier huso negativo (América, incluida cualquier escuela en
// México/Caribe), esa medianoche UTC cae la noche anterior en local, así
// que un movimiento del día 1 de un mes podía contarse en el mes
// ANTERIOR. Comparar "YYYY-MM" como string evita el problema de raíz: ni
// el mes actual ni la fecha del movimiento pasan nunca por ese parseo.
// Mismo bug, mismo tipo de corrección que en SummaryTab.jsx (ver nota
// junto a withinRange ahí).
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Curso/Comisión/Ajuste traducidos una única vez (common:movementTypes,
// fuente única compartida con SummaryTab/MiTrabajoTab/RatesTab, pedido
// explícito del usuario 2026-09-01 para no repetir esta traducción por
// pantalla) — MOVEMENT_TYPE_META (shared.jsx) sigue siendo la fuente de
// los colores, solo el label se resuelve aquí con t().
function useTranslatedMovementTypeMeta(t) {
  return {
    ganado: { ...MOVEMENT_TYPE_META.ganado, label: t("common:movementTypes.ganado") },
    comision: { ...MOVEMENT_TYPE_META.comision, label: t("common:movementTypes.comision") },
    companeros: { ...MOVEMENT_TYPE_META.companeros, label: t("common:movementTypes.companeros") },
  };
}

export default function HomeTab({ worklog, rates, comisiones, commissionRates, colleaguePayments, activities, currencies, paymentStatuses, onQuickCreate, onOpenPending, onOpenSummary }) {
  const { t } = useTranslation("home");
  const translatedTypeMeta = useTranslatedMovementTypeMeta(t);
  const now = new Date();
  const currentMonthKey = monthKey(now);
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");

  // Corrección 7/7 (2026-09-01): navegación de meses en el calendario de
  // Home — antes fijo siempre al mes actual (now.getFullYear()/getMonth()
  // pasados directos a MonthCalendar). Estado propio de Home, no de
  // MonthCalendar (que sigue siendo controlado, ver shared.jsx): solo
  // afecta a qué mes se ve en el calendario, nunca a "Generado este mes" /
  // "Pendiente de cobrar" (arriba), que siguen ancladas al mes real de
  // hoy — son cifras de "ahora mismo", no de lo que se esté navegando.
  const [calendarCursor, setCalendarCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const isCurrentCalendarMonth = calendarCursor.year === now.getFullYear() && calendarCursor.month === now.getMonth();
  const goToPrevMonth = () => setCalendarCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  const goToNextMonth = () => setCalendarCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  const goToCurrentMonth = () => setCalendarCursor({ year: now.getFullYear(), month: now.getMonth() });

  const fallbackCurrency = currencies.rows.find((c) => c.is_default)?.code || currencies.rows[0]?.code || "EUR";
  const rateTotal = (e, ratesTable) => {
    const r = ratesTable.rows.find((r) => r.school === e.school && r.activity === e.activity);
    return { total: computeRateTotal(r, e.people), currency: r?.currency || e.currency || fallbackCurrency };
  };

  // ganado/comision/companeros: se mantienen separadas porque el calendario
  // de abajo necesita distinguir la fuente de cada apunte del día (incluye
  // pagos de compañeros en cualquier sentido, también los que tú pagas).
  const ganadoEntries = useMemo(() => worklog.rows.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" })), [worklog.rows, rates.rows, fallbackCurrency]);
  const comisionEntries = useMemo(() => comisiones.rows.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" })), [comisiones.rows, commissionRates.rows, fallbackCurrency]);
  const companerosEntries = useMemo(() => colleaguePayments.rows.map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" })), [colleaguePayments.rows]);

  // Sin filtrar por mes aquí: MonthCalendar (shared.jsx) ya filtra por su
  // propio year/month internamente (byDay) — pre-filtrar al mes actual
  // aquí impedía navegar a cualquier otro mes (los datos ya habrían
  // desaparecido del array antes de llegar al calendario).
  const calendarEntries = useMemo(() => [...ganadoEntries, ...comisionEntries, ...companerosEntries],
    [ganadoEntries, comisionEntries, companerosEntries]);

  // Dato secundario de "Generado este mes" — personas formadas, no comisión
  // ni ajustes: son clientes que TÚ has impartido este mes, un dato humano y
  // sin ambigüedad de alcance (no cuenta clientes referidos que forma otro
  // instructor, ni ajustes económicos, que no representan formación). Da a
  // la tarjeta un segundo dato con el mismo peso visual que "N pagos
  // pendientes" en la tarjeta de al lado.
  const peopleTrainedThisMonth = useMemo(() => ganadoEntries
    .filter((e) => e.date.slice(0, 7) === currentMonthKey)
    .reduce((sum, e) => sum + (e.people || 0), 0), [ganadoEntries, currentMonthKey]);

  // Base común de las dos métricas financieras del dashboard — ver
  // buildIncomeEntries en rateCalc.js y docs/ADR/0004-home-dashboard-operativo-instructor.md.
  // "Generado este mes" y "Pendiente de cobrar" parten de este mismo array
  // (también lo usa PaymentsTab), solo cambia el filtro que le aplican.
  const incomeEntries = useMemo(
    () => buildIncomeEntries({ worklog: worklog.rows, rates: rates.rows, comisiones: comisiones.rows, commissionRates: commissionRates.rows, colleaguePayments: colleaguePayments.rows, fallbackCurrency }),
    [worklog.rows, rates.rows, comisiones.rows, commissionRates.rows, colleaguePayments.rows, fallbackCurrency]
  );

  // "Generado este mes": filtro de fecha (mes actual), sin filtro de
  // estado — cuenta lo cobrado y lo pendiente por igual, porque ya lo has
  // generado aunque todavía no te lo hayan pagado.
  const monthTotals = useMemo(() => {
    const map = {};
    incomeEntries
      .filter((e) => e.date.slice(0, 7) === currentMonthKey)
      .forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [incomeEntries, currentMonthKey]);

  // "Pendiente de cobrar": sin filtro de fecha (una deuda de hace 2 meses
  // sigue siendo una deuda), solo estado pendiente.
  const pendingSummary = useMemo(() => {
    const pendingEntries = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows));
    const totals = {};
    pendingEntries.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.total; });
    return { totals, count: pendingEntries.length };
  }, [incomeEntries, paymentStatuses.rows]);

  // Indicio de tendencia de "Generado este mes" — mismo total del mes
  // anterior, mismo filtro (fecha, sin estado). comparePeriods (rateCalc.js)
  // es la misma regla de comparación que ya usa HeroTotal en Resumen: se
  // omite (null) si cualquiera de los dos meses mezcla más de una moneda,
  // en vez de mostrar un delta agregado que parecería preciso sin serlo.
  const previousMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const previousMonthTotals = useMemo(() => {
    const map = {};
    incomeEntries
      .filter((e) => e.date.slice(0, 7) === previousMonthKey)
      .forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [incomeEntries, previousMonthKey]);
  const monthTrend = useMemo(() => comparePeriods(monthTotals, previousMonthTotals), [monthTotals, previousMonthTotals]);

  return (
    <div className="space-y-4">
      {/* 1. Pendiente de cobrar — información financiera principal, la más
          visible de la pantalla. Integra también el acceso rápido de
          creación (botón "+" a la derecha, onQuickAdd): antes era una fila
          aparte debajo de esta tarjeta, con el mismo ancho y casi el mismo
          peso visual, compitiendo por atención con la propia cifra
          pendiente. Vive aquí en vez de eso porque un único acceso
          "Añadir movimiento" (no un botón por tipo — el propio formulario
          resuelve el tipo con su selector, mismo criterio ya validado en
          Mi trabajo, ADR-0005) no necesita una fila propia si cabe, claro
          y con buen tamaño táctil, en el espacio libre de la tarjeta más
          consultada de Home. onQuickAdd usa e.stopPropagation() dentro de
          PendingCollectionCard para no interferir con onPress (ahora
          navega a Mi trabajo, ver comentario de onOpenPending arriba). */}
      <PendingCollectionCard
        totals={pendingSummary.totals}
        count={pendingSummary.count}
        currencyRows={currencies.rows}
        color={SUN}
        onPress={onOpenPending}
        onQuickAdd={() => onQuickCreate("ganado")}
      />

      {/* 2. Calendario del mes — revisión de jerarquía 2026-08-29 (ver
          docs/ADR/0004, addendum): antes iba en tercer y último lugar,
          después de "Generado este mes", cuando en la práctica un día
          normal no acumula demasiados movimientos distintos (el propio
          desglose del día lo confirma: casi siempre 1-2 líneas) — no
          hacía falta "reservarle" el fondo de la pantalla. El calendario
          es también la vía más directa para crear (tocar un día vacío) y
          para entender el mes de un vistazo (qué días hubo actividad, de
          qué tipo), así que sube justo debajo de la cifra financiera
          principal. sourceMeta viene de useTranslatedMovementTypeMeta,
          sobre MOVEMENT_TYPE_META (shared.jsx) con el label ya traducido
          desde common:movementTypes — única fuente para Home/Resumen/Mi
          trabajo/Tarifas. onCreateForDay solo
          se pasa aquí, no en Resumen: tocar un día vacío inicia un
          movimiento para esa fecha; uno con datos conserva su desglose y
          gana un "+" para añadir otro.
          Segunda revisión (misma fecha, más tarde): un widget "Los más
          antiguos por cobrar" (ya retirado, ver comentario junto a
          "Generado este mes" más abajo) se probó brevemente entre la
          tarjeta principal y el calendario — este último conserva el
          segundo lugar por el mismo motivo de siempre: responde "¿qué
          pasó este mes?", la pregunta más frecuente al entrar en Home. */}
      <div>
        <MonthCalendar
          year={calendarCursor.year}
          month={calendarCursor.month}
          entries={calendarEntries}
          dotColor={TEAL}
          currencyRows={currencies.rows}
          activityColor={activityColor}
          caption={t("calendarCaption")}
          autoSelectFirstDay
          detailed
          groupBySource
          sourceMeta={translatedTypeMeta}
          onCreateForDay={(dateStr) => onQuickCreate("ganado", dateStr)}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onGoToday={goToCurrentMonth}
          isCurrentMonth={isCurrentCalendarMonth}
        />
      </div>

      {/* 3. Generado este mes — información secundaria de cierre, no la
          protagonista: una cifra que solo se consulta, complementaria al
          propio calendario de arriba (que ya muestra qué días tuvieron
          actividad). "Generado" y no "Ganado" porque cuenta las 3 fuentes
          (Registro + Comisiones + Compañeros que te pagan). El dato de
          abajo (personas formadas) le da el mismo equilibrio de "cifra +
          conteo" que "Pendiente de cobrar".

          2026-08-29 (rediseño Home/Resumen): antes esta tarjeta era un
          callejón sin salida — la única de Home que no llevaba a ningún
          sitio al tocarla. Se le añaden dos piezas, reutilizando cálculo
          ya existente (comparePeriods, la misma regla que HeroTotal en
          Resumen — nunca una segunda implementación del mismo criterio):
          (1) un indicio de tendencia de una línea (↑/↓ vs mes anterior),
          la versión "de un vistazo" de lo que Resumen ya hace en
          profundidad con TrendBars; (2) la tarjeta entera se vuelve
          táctil y navega a Resumen (onOpenSummary), que ya abre en "Mes"/
          mes actual por defecto — el puente que le faltaba al "¿por qué,
          de dónde viene esta cifra?". Sustituye al widget "Los más
          antiguos por cobrar" (retirado en el mismo cambio): duplicaba
          una acción que "Pendiente de cobrar" → Mi trabajo ya resuelve
          mejor (animación, deshacer, filtros, sin límite de 3 filas), sin
          responder a una pregunta nueva — ver docs/PROPUESTA-home-resumen.md. */}
      <button
        type="button"
        onClick={onOpenSummary}
        data-testid="generated-this-month-card"
        className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <TrendingUp size={14} style={{ color: TEAL }} aria-hidden="true" />
          {t("generatedThisMonth")}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: NAVY }}>
          {Object.keys(monthTotals).length === 0 ? (
            "—"
          ) : (
            Object.entries(monthTotals).map(([code, amt], i) => (
              <span key={code}>{i > 0 && " + "}<Money amount={amt} code={code} currencyRows={currencies.rows} /></span>
            ))
          )}
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {peopleTrainedThisMonth > 0
            ? t("peopleTrained", { count: peopleTrainedThisMonth })
            : t("noCoursesThisMonth")}
        </div>
        {monthTrend && (
          <div className="mt-1.5 flex items-center gap-1 text-xs font-medium" style={{ color: monthTrend.delta > 0 ? GREEN : monthTrend.delta < 0 ? CORAL : "#9CA3AF" }}>
            {monthTrend.delta > 0 ? <TrendingUp size={12} aria-hidden="true" /> : monthTrend.delta < 0 ? <TrendingDown size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
            {t("trendVsPreviousMonth", {
              delta: monthTrend.pct !== null
                ? `${monthTrend.delta >= 0 ? "+" : ""}${monthTrend.pct.toFixed(0)}%`
                : `${monthTrend.delta >= 0 ? "+" : ""}${formatMoney(monthTrend.delta, monthTrend.code, currencies.rows)}`,
            })}
          </div>
        )}
      </button>
    </div>
  );
}
