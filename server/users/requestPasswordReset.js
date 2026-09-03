import { getServiceRoleClient, hasServerConfig } from "../supabaseAdmin.js";
import { generateActivationLink } from "./activationLink.js";
import { sendActivationEmail } from "../email/EmailService.js";

// Único endpoint PÚBLICO (sin token de sesión) de todo server/users/ — todos
// los demás exigen superadmin. Por eso su contrato es deliberadamente
// distinto de regenerateActivationLink.js/regeneratePassword.js, aunque
// comparten generateActivationLink()/sendActivationEmail():
//
// 1. SIEMPRE responde { ok: true }, exista o no la cuenta, funcione o no el
//    envío — nunca revela si un email está registrado (superficie de
//    enumeración de usuarios). Ver docs/BACKLOG.md, mismo criterio ya
//    aplicado ahí a email_for_nickname().
// 2. NUNCA devuelve action_link, a diferencia de los flujos de admin. Ese
//    fallback existe ahí porque quien lo ve ya es un superadmin autenticado;
//    aquí lo vería cualquiera que rellene el formulario público — sería
//    equivalente a poder resetear la contraseña de cualquier cuenta sin
//    demostrar acceso a su bandeja de entrada. Si el envío falla, se
//    registra en logs de servidor (visible al admin ahí), no en la
//    respuesta.
// 3. NUNCA toca ban_duration. regenerateActivationLink.js quita el baneo a
//    propósito porque lo dispara un superadmin decidiendo reactivar la
//    cuenta; aquí lo dispara cualquiera con el formulario — desbanear desde
//    aquí sería una vía pública para reactivar cuentas desactivadas sin
//    supervisión de un admin. Si la cuenta está baneada, el enlace se
//    genera igual pero activateAccount() ya lo rechaza con el mensaje de
//    "cuenta desactivada" al intentar canjearlo (ver useSession.js) —
//    mismo comportamiento que un enlace de activación viejo sobre una
//    cuenta que se desactivó después.
// 4. No exige superadmin objetivo distinto: a diferencia de
//    regeneratePassword.js (que SÍ bloquea target superadmin, porque ahí un
//    admin fuerza el cambio en la cuenta de otro), aquí quien pide el
//    restablecimiento solo puede demostrar acceso a SU PROPIA bandeja —
//    no hay tercero al que proteger, así que un superadmin puede
//    recuperarse su propia contraseña por este camino sin restricción.

const GENERIC_RESPONSE = { ok: true };

function parseBody(body) {
  if (body == null) return {};
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

export async function handleRequestPasswordReset({ method, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("request-password-reset: faltan variables de entorno de Supabase");
    // Sigue devolviendo la respuesta genérica — un fallo de configuración
    // del servidor tampoco debe filtrarse a un endpoint público.
    return { status: 200, payload: GENERIC_RESPONSE };
  }

  const input = parseBody(body);
  if (input === null || !input.email) {
    return { status: 400, payload: { error: "Falta el email." } };
  }
  const email = String(input.email).trim().toLowerCase();

  try {
    const client = getServiceRoleClient();
    // perPage alto de sobra para el tamaño real de este proyecto (instructor
    // freelance + colaboradores, no cientos de usuarios) — no hay API de
    // Supabase Admin para "buscar por email exacto" directamente, así que se
    // lista y se filtra en memoria. Si el volumen de usuarios creciera mucho
    // en el futuro, esto es lo primero a revisar.
    const { data: listData, error: listError } = await client.auth.admin.listUsers({ perPage: 200 });
    if (listError) {
      console.error("request-password-reset: no se pudo listar usuarios", listError);
      return { status: 200, payload: GENERIC_RESPONSE };
    }

    const user = listData.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      // No existe la cuenta — misma respuesta que el camino de éxito, sin
      // generar enlace ni enviar nada.
      return { status: 200, payload: GENERIC_RESPONSE };
    }

    const { activationLink, error: linkErrorMessage } = await generateActivationLink(email, { flow: "recovery" });
    if (linkErrorMessage) {
      console.error("request-password-reset: no se pudo generar el enlace", linkErrorMessage);
      return { status: 200, payload: GENERIC_RESPONSE };
    }

    const { data: profileRow } = await client
      .from("profiles")
      .select("first_name, nickname")
      .eq("user_id", user.id)
      .maybeSingle();

    try {
      const result = await sendActivationEmail({
        email,
        firstName: profileRow?.first_name,
        nickname: profileRow?.nickname,
        actionLink: activationLink,
        reason: "password_reset_request",
      });
      if (!result.sent) {
        console.error("request-password-reset: no se pudo enviar el email", result.error);
      }
    } catch (err) {
      console.error("request-password-reset: sendActivationEmail lanzó una excepción inesperada", err);
    }
  } catch (err) {
    console.error("request-password-reset: fallo inesperado", err);
  }

  return { status: 200, payload: GENERIC_RESPONSE };
}
