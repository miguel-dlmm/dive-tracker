// Fechas de un Training Record: el campo impreso dice "Fecha (DD/MM/AA)"
// (año a 2 dígitos) — distinto del formato YYYY-MM-DD que ya usa el resto
// de la app internamente (DatePicker en shared.jsx), así que se convierte
// justo antes de dibujar el valor en el PDF, nunca antes.
export function formatDateDDMMYY(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y.slice(2)}`;
}

// Fecha de hoy en formato YYYY-MM-DD (mismo formato interno que value en
// DatePicker) — usada para la fecha de las firmas, que siempre es la fecha
// de generación del documento, nunca una que teclee el instructor.
export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
