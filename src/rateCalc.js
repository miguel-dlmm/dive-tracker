// rateCalc.js — única fuente de verdad para el importe de un registro
// (Work Log / Comisiones) a partir de su tarifa y el nº de personas.
// Antes duplicado en WorkLogTab, ComisionesTab, PaymentsTab, SummaryTab y HomeTab.
export function computeRateTotal(rate, people) {
  if (!rate) return 0;
  return rate.payment_type === "Per Person"
    ? rate.rate * (Number(people) || 0)
    : rate.rate;
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
