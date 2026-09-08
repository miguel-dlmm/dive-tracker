// Contador de "Training Records generados" — puramente decorativo para la
// tarjeta de Home (2026-09-08, "otra manera dinámica y atractiva de
// integrarlo en la home"). Deliberadamente NO es un histórico de verdad:
// la app nunca guarda datos de alumnos en la nube ("nada de lo que
// rellenes aquí se guarda, solo se descarga" — ver installApp.json/
// help.json), así que no existe ningún sitio real donde llevar la cuenta
// de certificados emitidos sin romper esa garantía. Este contador es un
// entero suelto en localStorage — no identifica a ningún alumno, solo
// cuántas veces se ha generado un PDF con éxito.
//
// Por CUENTA, no por dispositivo (bug real reportado 2026-09-08: "he
// creado un TR con el admin y cuando entro con una cuenta demo mía sigue
// poniendo el número de generados pese a q aún no he generado ninguno")
// — a diferencia de installBannerDismissed (HomeTab.jsx), que sí es
// deliberadamente de dispositivo, este contador representa "cuánto ha
// generado ESTA cuenta", y varias cuentas comparten navegador a menudo en
// este proyecto (bypass de login en desarrollo, cuentas admin/demo en el
// mismo dispositivo de pruebas). Mismo criterio ya establecido por
// whatsNewSeenKey (App.jsx): la clave de localStorage incluye el user_id,
// "anon" como respaldo si todavía no hay sesión resuelta.
const GENERATED_COUNT_KEY_PREFIX = "oceanpulse:trainingRecordsGeneratedCount";

function keyFor(userId) {
  return `${GENERATED_COUNT_KEY_PREFIX}:${userId || "anon"}`;
}

export function getGeneratedCount(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function addGeneratedCount(userId, by) {
  if (!Number.isFinite(by) || by <= 0) return getGeneratedCount(userId);
  const next = getGeneratedCount(userId) + by;
  try {
    localStorage.setItem(keyFor(userId), String(next));
  } catch { /* no-op — contador decorativo, no crítico */ }
  return next;
}
