// rateCalc.js — única fuente de verdad para el importe de un registro
// (Work Log / Comisiones) a partir de su tarifa y el nº de personas.
// Antes duplicado en WorkLogTab, ComisionesTab, PaymentsTab, SummaryTab y HomeTab.
export function computeRateTotal(rate, people) {
  if (!rate) return 0;
  return rate.payment_type === "Per Person"
    ? rate.rate * (Number(people) || 0)
    : rate.rate;
}

// Única fuente de verdad de qué cuenta como "dinero que generas o te
// deben" — Registro + Comisiones + pagos de compañeros con importe
// positivo (los que TE pagan a ti; los que tú pagas a un compañero son
// "lo que debo yo", un concepto distinto que no cuenta aquí). HomeTab y
// PaymentsTab parten de esta misma función para que sus cifras nunca
// puedan divergir entre sí — ver
// docs/ADR/0004-home-dashboard-operativo-instructor.md.
export function buildIncomeEntries({ worklog, rates, comisiones, commissionRates, colleaguePayments, fallbackCurrency }) {
  const rateTotal = (e, ratesTable) => {
    const r = ratesTable.find((r) => r.school === e.school && r.activity === e.activity);
    return { total: computeRateTotal(r, e.people), currency: r?.currency || e.currency || fallbackCurrency };
  };
  const ganado = worklog.map((e) => ({ ...e, ...rateTotal(e, rates), _source: "ganado" }));
  const comision = comisiones.map((e) => ({ ...e, ...rateTotal(e, commissionRates), _source: "comision" }));
  const companeros = colleaguePayments
    .filter((p) => p.amount > 0)
    .map((p) => ({ ...p, total: p.amount, people: 0, _source: "companeros" }));
  return [...ganado, ...comision, ...companeros];
}
