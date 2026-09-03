import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { generateActivationLink } from "./activationLink.js";
import { sendActivationEmail } from "../email/EmailService.js";

// "Activar" una cuenta desactivada, y "regenerar link" para una que sigue
// pendiente de completar su primer acceso, son la MISMA acción — ninguna
// de las dos concede acceso al instante (ver docs/ADR "modelo de
// activación"): quitan el baneo si lo hubiera (para que el enlace de
// recovery pueda canjearse — un usuario baneado no puede usar ni siquiera
// un enlace de un solo uso, confirmado en vivo) y devuelven un enlace
// nuevo para que el superadmin lo comparta. `profiles.activated_at` NO se
// toca aquí — sigue en null hasta que el usuario complete de verdad el
// proceso (ver activateAccount()/markAccountActivated() en useSession.js).
// Por eso esto es un endpoint aparte y no una reutilización de
// `active: true` en set-user-active.js: esa ruta concedía acceso
// instantáneo, comportamiento que se abandona con este cambio.
//
// Envío de email best-effort, igual que createUser.js: si sendActivationEmail
// falla o no está configurado, la respuesta sigue incluyendo action_link
// para que el superadmin lo comparta a mano — nunca deja al usuario sin
// forma de completar el acceso.

function parseBody(body) {
  if (body == null) return {};
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

function getHeader(headers, name) {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

const BAN_NONE = "none";

export async function handleRegenerateActivationLink({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("regenerate-activation-link: faltan variables de entorno de Supabase");
    return { status: 500, payload: { error: "Configuración del servidor incompleta." } };
  }

  const authHeader = getHeader(headers, "authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { status: 401, payload: { error: "Falta el token de sesión." } };
  }

  const input = parseBody(body);
  if (input === null) {
    return { status: 400, payload: { error: "Cuerpo de la petición inválido." } };
  }

  const { target_user_id: targetUserId } = input;
  if (!targetUserId) {
    return { status: 400, payload: { error: "Falta target_user_id." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede activar cuentas o regenerar su enlace de acceso.");
  if (denied) return denied;

  const client = getServiceRoleClient();

  const { data: target, error: targetError } = await client
    .from("profiles")
    .select("is_superadmin, first_name, nickname")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (targetError) {
    console.error(targetError);
    return { status: 500, payload: { error: "No se pudo comprobar la cuenta objetivo." } };
  }
  if (!target) {
    return { status: 404, payload: { error: "No existe ningún usuario con ese id." } };
  }
  if (target.is_superadmin) {
    return { status: 400, payload: { error: "No se puede regenerar el enlace de una cuenta superadmin." } };
  }

  // Necesitamos el email para generar el enlace — auth.users, no profiles.
  const { data: authUser, error: authUserError } = await client.auth.admin.getUserById(targetUserId);
  if (authUserError || !authUser?.user?.email) {
    console.error("regenerate-activation-link: no se pudo obtener el email de la cuenta objetivo", authUserError);
    return { status: 500, payload: { error: "No se pudo obtener el email de la cuenta objetivo." } };
  }

  // Quita el baneo si lo tenía — un enlace de recovery no puede canjearse
  // con la cuenta bloqueada. No toca activated_at: sigue pendiente hasta
  // que el usuario complete el proceso de verdad.
  const { error: unbanError } = await client.auth.admin.updateUserById(targetUserId, { ban_duration: BAN_NONE });
  if (unbanError) {
    console.error(unbanError);
    return { status: 400, payload: { error: unbanError.message } };
  }

  // deactivated_at a null (Bloque 11): la cuenta ya no está de baja — no
  // corta la respuesta si falla, el desbaneo (lo importante) ya se aplicó.
  const { error: clearDeactivatedError } = await client
    .from("profiles")
    .update({ deactivated_at: null })
    .eq("user_id", targetUserId);
  if (clearDeactivatedError) {
    console.error("regenerate-activation-link: no se pudo limpiar deactivated_at", clearDeactivatedError);
  }

  // Este mismo endpoint sirve a dos casos reales distintos (ver
  // ConfigTab.jsx: el switch de "desactivado→activar" y el botón "Regenerar
  // enlace" de una cuenta "pendiente" llaman los dos aquí):
  // - Reactivar una cuenta que YA estuvo activa (aceptó las bases legales
  //   la primera vez) — debe entrar por ResetPasswordScreen, sin volver a
  //   pedir esa aceptación.
  // - Reenviar el enlace a una cuenta que sigue "pendiente" de completar
  //   su primer acceso (nunca aceptó nada todavía) — debe seguir siendo
  //   una activación real, con LegalConsentFields.
  // legal_consents es la señal correcta para distinguirlos (más directa
  // que activated_at/deactivated_at): si ya existe alguna fila para este
  // usuario, ya aceptó antes. Si la consulta falla, se asume que NO aceptó
  // (opción más segura: como mucho vuelve a ver el checkbox, nunca se
  // salta una aceptación legal que hiciera falta).
  const { data: consentRows, error: consentError } = await client
    .from("legal_consents")
    .select("user_id")
    .eq("user_id", targetUserId)
    .limit(1);
  if (consentError) {
    console.error("regenerate-activation-link: no se pudo comprobar el consentimiento legal previo", consentError);
  }
  const alreadyAcceptedLegal = Boolean(consentRows && consentRows.length > 0);

  const { activationLink, error: linkErrorMessage } = await generateActivationLink(authUser.user.email, alreadyAcceptedLegal ? { flow: "recovery" } : {});
  if (linkErrorMessage) {
    return { status: 500, payload: { error: linkErrorMessage } };
  }

  let emailSent = false;
  try {
    const result = await sendActivationEmail({
      email: authUser.user.email,
      firstName: target.first_name,
      nickname: target.nickname,
      actionLink: activationLink,
      reason: "reactivation",
    });
    emailSent = result.sent;
  } catch (err) {
    console.error("regenerate-activation-link: sendActivationEmail lanzó una excepción inesperada", err);
  }

  return {
    status: 200,
    payload: { user_id: targetUserId, email_sent: emailSent, ...(!emailSent ? { action_link: activationLink } : {}) },
  };
}
