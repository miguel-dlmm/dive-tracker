import { getServiceRoleClient } from "../supabaseAdmin.js";

// Extraído de createUser.js (2026-08-29) al añadir "regenerar link" y
// "regenerar contraseña" — antes esta lógica solo existía en el alta,
// ahora la comparten tres flujos distintos (crear, activar/reactivar,
// regenerar contraseña) que necesitan generar exactamente el mismo tipo
// de enlace de un solo uso.
//
// Se reutiliza tanto al pedir el enlace a Supabase como al construir la
// URL de activación propia, para que ambos usos no puedan desincronizarse.
const ACTIVATION_LINK_TYPE = "recovery";

// URL de activación propia de la app — NUNCA se envía el action_link de
// Supabase directamente. Ese enlace apunta al endpoint público de
// verificación de Supabase, que consume el token con un simple GET: un
// escáner de email/link-preview que lo precargue lo invalidaría antes de
// que el usuario llegue a pulsarlo. Con esta URL propia, cargar la página
// no consume nada — solo lo hace activateAccount()/resetPassword() al
// enviar el formulario (ver useSession.js). email va en la URL a
// propósito: AuthGate lo necesita para poder detectar una sesión ajena
// (ver App.jsx), y no añade exposición nueva — es el mismo email al que
// ya se envía el correo o que ya conoce el superadmin que gestiona la
// cuenta.
//
// flow (opcional): únicamente "recovery" (recuperación autoservicio, ver
// requestPasswordReset.js) lo pasa hoy — le dice a AuthGate que muestre
// ResetPasswordScreen en vez de CreatePasswordScreen (sin bases legales,
// ver ADR pendiente de esta sesión). Los otros tres llamadores
// (createUser/regenerateActivationLink/regeneratePassword) no lo pasan:
// sus enlaces se comportan exactamente igual que siempre.
function buildActivationUrl(baseUrl, { tokenHash, email, flow }) {
  const url = new URL(baseUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", ACTIVATION_LINK_TYPE);
  url.searchParams.set("email", email);
  if (flow) url.searchParams.set("flow", flow);
  return url.toString();
}

// Genera un enlace de activación de un solo uso para `email`. Nunca
// lanza — devuelve { activationLink: null, error: "mensaje" } en
// cualquier fallo (enlace no generado, o falta una base para la URL)
// para que cada llamador decida cómo responder sin necesitar try/catch
// propio.
//
// baseUrl (opcional): bug real reportado 2026-09-07 — "el email de
// recuperar contraseña lleva a la URL de TEST fija, no a la del Preview
// Deployment concreto desde el que se pidió". Antes esta función SIEMPRE
// usaba `process.env.APP_URL` (una única URL fija por proyecto Vercel),
// así que cualquier Preview Deployment de rama (una URL única por PR,
// distinta de APP_URL) generaba enlaces que apuntaban a un despliegue
// distinto de aquel donde se pidió el restablecimiento — mismo backend
// de Supabase (todos los Preview de este proyecto comparten TEST), pero
// dominio equivocado. `baseUrl`, cuando se pasa, gana sobre `APP_URL` —
// pensado para que cada llamador HTTP pase el host real de la petición
// entrante (`req.headers.host`, ver api/request-password-reset.js), que
// sí varía por despliegue. Extendido a TODOS los flujos que generan un
// enlace de este tipo (Fase 10, 2026-09-07, pedido explícito: "aplica a
// todos los enlaces generados en la app"): alta de usuario y registro
// externo (provisionUser.js), reactivar/regenerar enlace de activación
// (regenerateActivationLink.js) y regenerar contraseña
// (regeneratePassword.js) — los cuatro pasan ahora su propio `baseUrl`
// igual que "olvidé mi contraseña". Un llamador que aun así no lo pase
// cae al mismo `APP_URL` fijo de siempre, sin romper nada.
export async function generateActivationLink(email, { flow, baseUrl } = {}) {
  const { data: linkData, error: linkError } = await getServiceRoleClient().auth.admin.generateLink({
    type: ACTIVATION_LINK_TYPE,
    email,
    options: { redirectTo: process.env.APP_URL },
  });

  if (linkError) {
    console.error("generateActivationLink: no se pudo generar el enlace", linkError);
    return { activationLink: null, error: "No se pudo generar el enlace de activación." };
  }
  const resolvedBaseUrl = baseUrl || process.env.APP_URL;
  if (!resolvedBaseUrl || !linkData?.properties?.hashed_token) {
    // Sin Site URL de Supabase de respaldo (el action_link de Supabase no
    // se usa, ver buildActivationUrl): sin ninguna base no hay forma de
    // construir ningún enlace de activación.
    console.error("generateActivationLink: falta baseUrl/APP_URL o hashed_token en la respuesta de generateLink");
    return { activationLink: null, error: "No se pudo generar el enlace de activación." };
  }

  return { activationLink: buildActivationUrl(resolvedBaseUrl, { tokenHash: linkData.properties.hashed_token, email, flow }), error: null };
}
