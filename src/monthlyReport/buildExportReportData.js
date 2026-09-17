// buildExportReportData.js — capa de datos, pura, para el informe de
// "Exportar informe" de Resumen (ver el informe de diseño de la sesión que
// lo encargó). Nunca toca el DOM ni pdfmake: solo agrupa/filtra/suma, igual
// que rateCalc.js — así se puede testear sin montar ni la hoja ni el
// generador de PDF.
import { buildEntriesBySource } from "../rateCalc";

const inRange = (dateStr, from, to) => dateStr >= from && dateStr <= to;

// Candidatos de Ajuste de curso para la escuela+rango elegidos — usada
// tanto por la lista de checkboxes de la hoja (modo "Elegir") como, con
// todos marcados, por el modo "Todas". Ordenados por fecha, más reciente
// primero (mismo criterio de lectura que el resto de listas de la app).
export function listAdjustmentCandidates({ school, from, to, colleaguePayments, fallbackCurrency }) {
  const { companeros } = buildEntriesBySource({ worklog: [], rates: [], comisiones: [], commissionRates: [], colleaguePayments, fallbackCurrency });
  return companeros
    .filter((p) => p.school === school && from && to && inRange(p.date, from, to))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function sumByCurrency(entries, key = "total") {
  const totals = {};
  entries.forEach((e) => { totals[e.currency] = (totals[e.currency] || 0) + (e[key] || 0); });
  return totals;
}

function addTotals(a, b) {
  const out = { ...a };
  Object.entries(b).forEach(([code, amount]) => { out[code] = (out[code] || 0) + amount; });
  return out;
}

const isPending = (statusName, paymentStatusRows) => paymentStatusRows.find((s) => s.name === statusName)?.is_default ?? false;

// school/from/to: el alcance del informe — una escuela, un rango de fechas
// (siempre los dos, nunca "todo"). showCollected=false (por defecto, pedido
// explícito): el informe empieza enseñando solo lo pendiente de cobro.
// includeAdjustments/adjustmentMode/selectedAdjustmentIds/sumAdjustments:
// las tres preguntas de la sección "Ajustes de curso" de la hoja — ver el
// informe de diseño para el porqué de cada una.
export function buildExportReportData({
  school, from, to,
  worklog, rates, comisiones, commissionRates, colleaguePayments,
  fallbackCurrency, paymentStatuses,
  showCollected = false,
  includeAdjustments = false,
  adjustmentMode = "all",
  selectedAdjustmentIds = [],
  sumAdjustments = false,
}) {
  const { ganado, comision } = buildEntriesBySource({ worklog, rates, comisiones, commissionRates, colleaguePayments: [], fallbackCurrency });

  const scoped = (list) => list
    .filter((e) => e.school === school && from && to && inRange(e.date, from, to))
    .filter((e) => showCollected || isPending(e.status, paymentStatuses))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const courses = scoped(ganado);
  const commissions = scoped(comision);

  const candidates = includeAdjustments
    ? listAdjustmentCandidates({ school, from, to, colleaguePayments, fallbackCurrency })
    : [];
  const chosen = adjustmentMode === "choose" ? candidates.filter((p) => selectedAdjustmentIds.includes(p.id)) : candidates;
  const adjustments = chosen
    .filter((e) => showCollected || isPending(e.status, paymentStatuses))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const coursesSubtotal = sumByCurrency(courses);
  const commissionsSubtotal = sumByCurrency(commissions);
  const adjustmentsSubtotal = sumByCurrency(adjustments);

  const reconciliationEntries = [...courses, ...commissions];
  const mainTotal = sumAdjustments ? addTotals(sumByCurrency(reconciliationEntries), adjustmentsSubtotal) : sumByCurrency(reconciliationEntries);
  const paidTotal = sumByCurrency(reconciliationEntries.filter((e) => !isPending(e.status, paymentStatuses)));
  const pendingTotal = sumByCurrency(reconciliationEntries.filter((e) => isPending(e.status, paymentStatuses)));

  return {
    courses, commissions, adjustments,
    coursesSubtotal, commissionsSubtotal, adjustmentsSubtotal,
    mainTotal, paidTotal, pendingTotal,
    counts: { courses: courses.length, commissions: commissions.length, adjustments: adjustments.length },
    isEmpty: courses.length === 0 && commissions.length === 0 && adjustments.length === 0,
  };
}
