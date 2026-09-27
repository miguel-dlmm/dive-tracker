import { supabase } from "./supabaseClient";

// Informe de refactorización 2026-09, sección 1.1 — el mismo esqueleto
// (token de la sesión actual -> fetch a /api/* con Bearer -> parsear JSON
// -> mapear error) se escribía a mano 10 veces entre ConfigTab.jsx y
// ProfileTab.jsx. Módulo propio, no shared.jsx (ya señalado en el informe
// de deuda técnica como una "bolsa" de 45+ exports): esto no es un
// primitivo de UI, es la convención de cómo la app autentica sus propias
// llamadas a `api/*` — categoría distinta, con un único sitio si algún día
// cambia (p. ej. refrescar el token si ha caducado).
//
// forbidden/fallback son opcionales a propósito: los dos únicos sitios
// "silenciosos" (loadActiveStatus/activitySummary en ConfigTab.jsx, que
// nunca mostraban su propio error al usuario) ya envuelven la llamada en
// su propio try/catch que descarta el error — no necesitan un mensaje que
// nadie va a leer. err.isApiError distingue "el servidor respondió que no"
// (403/400/...) de un fallo de red real — ProfileTab.jsx lo necesita para
// mostrar un mensaje distinto en cada caso, comportamiento que ya tenía
// antes de esta extracción y que no cambia.
function actionErrorMessage(res, payload, { forbidden, fallback }) {
  if (res.status === 403) return forbidden;
  return payload.error || fallback;
}

export async function callAdminApi(endpoint, body, { forbidden = "", fallback = "" } = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(actionErrorMessage(res, payload, { forbidden, fallback }));
    error.isApiError = true;
    throw error;
  }
  return payload;
}
