// Contador de "Training Records generados" — cache LOCAL para la tarjeta
// de Home (2026-09-08, "otra manera dinámica y atractiva de integrarlo en
// la home"), lectura instantánea sin esperar red. Desde el lote
// 2026-09-17/18 este mismo número (+ la fecha del último) también se
// guarda en `profiles` vía `increment_training_records_count()` (ver
// schema.sql, llamado desde TrainingRecordsTab.jsx junto a las llamadas a
// `addGeneratedCount` de aquí abajo) — pedido explícito: verlo desde la
// ficha de admin de otro usuario, no solo desde el propio dispositivo del
// instructor. La garantía de privacidad no cambia: la app sigue sin
// guardar datos de alumnos en la nube ("nada de lo que rellenes aquí se
// guarda, solo se descarga" — ver installApp.json/help.json), el servidor
// solo recibe un entero y una fecha, nunca un nombre ni el documento.
// Este módulo en sí sigue siendo puro localStorage — no identifica a
// ningún alumno, solo cuántas veces se ha generado un PDF con éxito.
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
