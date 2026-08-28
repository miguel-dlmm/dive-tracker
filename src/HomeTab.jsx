import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { NAVY, TEAL, SUN } from "./App";
import { Money, MonthCalendar, colorFor, isPendingStatus, MOVEMENT_TYPE_META } from "./shared";
import { computeRateTotal, buildIncomeEntries } from "./rateCalc";
import PendingCollectionCard from "./PendingCollectionCard";

// worklog / rates / comisiones / commissionRates / colleaguePayments / activities /
// schools / currencies / paymentStatuses: hooks de useSupabaseTable
// onQuickCreate: (type, date?) => abre MovementSheet SIN cambiar de
// pestaña (Home sigue visible mientras se rellena) — solo al guardar con
// éxito se navega a Mi trabajo, ver App.jsx/startHomeCreate. date opcional
// preselecciona esa fecha en vez de la de hoy (la usa el calendario de
// abajo). type es directamente "ganado"/"comision"/"companeros" — ya no
// hace falta el id de pestaña antiguo ("log"), ver docs/ADR/0005 addendum.
// onOpenPayments: () => navega a la pantalla de Pagos (tarjeta "Pendiente de cobrar")
export default function HomeTab({ worklog, rates, comisiones, commissionRates, colleaguePayments, activities, currencies, paymentStatuses, onQuickCreate, onOpenPayments }) {
  const now = new Date();
  const activityColor = (name) => colorFor(activities.rows, name, "#94A3B8");

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

  const monthAllEntries = useMemo(() => [...ganadoEntries, ...comisionEntries, ...companerosEntries].filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }), [ganadoEntries, comisionEntries, companerosEntries]);

  // Dato secundario de "Generado este mes" — personas formadas, no comisión
  // ni ajustes: son clientes que TÚ has impartido este mes, un dato humano y
  // sin ambigüedad de alcance (no cuenta clientes referidos que forma otro
  // instructor, ni ajustes económicos, que no representan formación). Da a
  // la tarjeta un segundo dato con el mismo peso visual que "N pagos
  // pendientes" en la tarjeta de al lado.
  const peopleTrainedThisMonth = useMemo(() => ganadoEntries
    .filter((e) => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((sum, e) => sum + (e.people || 0), 0), [ganadoEntries]);

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
      .filter((e) => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
      .forEach((e) => { map[e.currency] = (map[e.currency] || 0) + e.total; });
    return map;
  }, [incomeEntries]);

  // "Pendiente de cobrar": sin filtro de fecha (una deuda de hace 2 meses
  // sigue siendo una deuda), solo estado pendiente.
  const pendingSummary = useMemo(() => {
    const pendingEntries = incomeEntries.filter((e) => isPendingStatus(e.status, paymentStatuses.rows));
    const totals = {};
    pendingEntries.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + e.total; });
    return { totals, count: pendingEntries.length };
  }, [incomeEntries, paymentStatuses.rows]);

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
          PendingCollectionCard para no interferir con onPress (Pagos). */}
      <PendingCollectionCard
        totals={pendingSummary.totals}
        count={pendingSummary.count}
        currencyRows={currencies.rows}
        color={SUN}
        onPress={onOpenPayments}
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
          principal. sourceMeta viene de MOVEMENT_TYPE_META (shared.jsx,
          única fuente para Home/Resumen/Mi trabajo). onCreateForDay solo
          se pasa aquí, no en Resumen: tocar un día vacío inicia un
          movimiento para esa fecha; uno con datos conserva su desglose y
          gana un "+" para añadir otro. */}
      <div>
        <MonthCalendar
          year={now.getFullYear()}
          month={now.getMonth()}
          entries={monthAllEntries}
          dotColor={TEAL}
          currencyRows={currencies.rows}
          activityColor={activityColor}
          autoSelectFirstDay
          detailed
          groupBySource
          sourceMeta={MOVEMENT_TYPE_META}
          onCreateForDay={(dateStr) => onQuickCreate("ganado", dateStr)}
        />
        <p className="mt-2 px-1 text-center text-[11px] text-gray-400">
          Toca un día para ver el detalle, o uno vacío para añadir un movimiento.
        </p>
      </div>

      {/* 3. Generado este mes — información secundaria de cierre, no la
          protagonista: una cifra que solo se consulta, complementaria al
          propio calendario de arriba (que ya muestra qué días tuvieron
          actividad). "Generado" y no "Ganado" porque cuenta las 3 fuentes
          (Registro + Comisiones + Compañeros que te pagan). El dato de
          abajo (personas formadas) le da el mismo equilibrio de "cifra +
          conteo" que "Pendiente de cobrar". */}
      <div className="rounded-xl border border-gray-200 bg-white p-4" data-testid="generated-this-month-card">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <TrendingUp size={14} style={{ color: TEAL }} aria-hidden="true" />
          Generado este mes
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
            ? `${peopleTrainedThisMonth} ${peopleTrainedThisMonth === 1 ? "persona formada" : "personas formadas"} este mes`
            : "Sin cursos este mes"}
        </div>
      </div>
    </div>
  );
}
