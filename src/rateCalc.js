// rateCalc.js — única fuente de verdad para el importe de un registro
// (Work Log / Comisiones) a partir de su tarifa y el nº de personas.
// Antes duplicado en WorkLogTab, ComisionesTab, PaymentsTab, SummaryTab y HomeTab.
export function computeRateTotal(rate, people) {
  if (!rate) return 0;
  return rate.payment_type === "Per Person"
    ? rate.rate * (Number(people) || 0)
    : rate.rate;
}
