// Contador de "Training Records generados" — puramente decorativo para la
// tarjeta de Home (2026-09-08, "otra manera dinámica y atractiva de
// integrarlo en la home"). Deliberadamente NO es un histórico de verdad:
// la app nunca guarda datos de alumnos en la nube ("nada de lo que
// rellenes aquí se guarda, solo se descarga" — ver installApp.json/
// help.json), así que no existe ningún sitio real donde llevar la cuenta
// de certificados emitidos sin romper esa garantía. Este contador es un
// entero suelto en localStorage (mismo criterio "preferencia de
// dispositivo, no de cuenta" que installBannerDismissed en HomeTab.jsx
// tenía) — no identifica a ningún alumno, solo cuántas veces se ha
// generado un PDF con éxito desde ESTE navegador/móvil.
//
// Limitación conocida, aceptada a propósito: regenerar el mismo listado
// de alumnos (p. ej. tras corregir una fecha) vuelve a sumar — no es un
// libro de certificados emitidos, es un indicador de actividad/uso. Igual
// de válido para el propósito real (que la tarjeta de Home se sienta viva
// y refleje que la herramienta se usa) sin necesitar guardar nada nuevo.
const GENERATED_COUNT_KEY = "oceanpulse:trainingRecordsGeneratedCount";

export function getGeneratedCount() {
  try {
    const raw = localStorage.getItem(GENERATED_COUNT_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function addGeneratedCount(by) {
  if (!Number.isFinite(by) || by <= 0) return getGeneratedCount();
  const next = getGeneratedCount() + by;
  try {
    localStorage.setItem(GENERATED_COUNT_KEY, String(next));
  } catch { /* no-op — contador decorativo, no crítico */ }
  return next;
}
