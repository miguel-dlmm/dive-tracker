// rateCalc.js — única fuente de verdad para el importe de un registro
// (Work Log / Comisiones) a partir de su tarifa y el nº de personas.
// Antes duplicado en WorkLogTab, ComisionesTab, PaymentsTab, SummaryTab y HomeTab.
//
// Sin distinción por payment_type desde 2026-09-02 (ADR-0003, pasos 1-2 del
// plan de migración — la columna payment_type sigue existiendo en BD por
// ahora, solo el frontend deja de leerla/depender de ella): auditoría
// completa confirmó que ningún formulario de la app expuso nunca un
// selector real para elegir tarifa fija — "Per Person" era el único valor
// que cualquier flujo llegaba a escribir a propósito. La excepción real
// encontrada (ADR-0003, addendum 2026-08-30) no era una tarifa fija
// intencional: una cuenta cuyo catálogo payment_types no incluía
// exactamente "Per Person" obtenía tarifas fijas de forma silenciosa,
// sin aviso — el propio bug que esta simplificación elimina de raíz.
export function computeRateTotal(rate, people) {
  if (!rate) return 0;
  return rate.rate * (Number(people) || 0);
}

// Única fuente de verdad de toda la actividad económica del instructor —
// Registro + Comisiones + TODOS los pagos de compañeros, incluidos los
// negativos (lo que tú debes, no solo lo que te deben). Es la base de "Mi
// trabajo" — ver docs/ADR/0005-mi-trabajo-unificacion-economica.md.
export function buildActivityEntries({ worklog, rates, comisiones, commissionRates, colleaguePayments, fallbackCurrency }) {
  const rateTotal = (e, ratesTable) => {
    const r = ratesTable.find((r) => r.school === e.school && r.activity === e.activity);
    return { total: computeRateTotal(r, e.people), currency: r?.currency || e.currency || fallbackCurrency };
  };
  const ganado = worklog.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" }));
  const comision = comisiones.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" }));
  const companeros = colleaguePayments.map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" }));
  return [...ganado, ...comision, ...companeros];
}

// Única fuente de verdad de qué cuenta como "dinero que generas o te
// deben" — un filtro sobre buildActivityEntries que descarta los ajustes
// de compañero negativos (lo que tú debes, un concepto distinto que no
// cuenta aquí). HomeTab y PaymentsTab parten de esta función para que sus
// cifras nunca puedan divergir entre sí — ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md.
export function buildIncomeEntries(args) {
  return buildActivityEntries(args).filter((e) => e._source !== "companeros" || e.total > 0);
}

// Único punto de comparación entre dos totales por moneda (mapa moneda ->
// importe, ver groupSum en SummaryTab.jsx / monthTotals en HomeTab.jsx).
// Solo tiene sentido si CADA total está en una única moneda — con varias
// monedas mezcladas en cualquiera de los dos lados, un delta agregado sería
// engañoso, así que se devuelve null en vez de un número que parezca
// preciso sin serlo. Usado por HeroTotal (Resumen, comparación al periodo
// anterior) y por el indicio de tendencia de "Generado este mes" (Home,
// comparación al mes anterior) — misma regla, un único sitio, para que las
// dos pantallas nunca puedan divergir en qué cuenta como "comparable".
export function singleCurrencyAmount(totals) {
  const keys = Object.keys(totals || {});
  return keys.length === 1 ? { code: keys[0], amount: totals[keys[0]] } : null;
}

export function comparePeriods(currentTotals, previousTotals) {
  const cur = singleCurrencyAmount(currentTotals);
  const prev = singleCurrencyAmount(previousTotals);
  if (!cur || !prev || cur.code !== prev.code) return null;
  const delta = cur.amount - prev.amount;
  const pct = prev.amount !== 0 ? (delta / Math.abs(prev.amount)) * 100 : null;
  return { code: cur.code, delta, pct };
}
