import { getServiceRoleClient } from "../supabaseAdmin.js";
import { sendActivationEmail } from "../email/EmailService.js";
import { generateActivationLink } from "./activationLink.js";

// Traduce violaciones de constraint conocidas de public.profiles a mensajes
// legibles; cualquier otro error (de Postgres o de GoTrue) se propaga tal
// cual, ya suele venir en un formato razonable. Compartida por
// createUser.js y externalRegister.js — ambos llaman a provisionUser() y
// pueden toparse con los mismos errores (nickname duplicado, dataset
// desconocido).
export function friendlyError(message) {
  if (!message) return "Error desconocido";
  if (message.includes("profiles_nickname_lower_key")) return "Ese nickname ya está en uso.";
  if (message.includes("profiles_nickname_no_at")) return 'El nickname no puede contener "@".';
  if (message.includes("unknown setup dataset")) return "El dataset seleccionado ya no existe. Recarga la página e inténtalo de nuevo.";
  return message;
}

// Núcleo compartido de "dar de alta un usuario nuevo": crea la cuenta en
// Supabase Auth (sin contraseña — el acceso depende exclusivamente del
// enlace de primer acceso, ver CreatePasswordScreen), clona el dataset
// inicial y envía el email de activación, en ese orden y con el mismo
// criterio de qué falla revierte el alta (dataset) y qué es best-effort
// (email). Extraído de createUser.js al añadir el registro externo
// (ADR-0023): lo llaman handleCreateUser (admin, superadmin verificado,
// dataset elegido a mano) y handleExternalRegister (público, gateado por
// app_config.allow_external_registration, dataset elegido
// automáticamente) — la única diferencia entre ambos es CÓMO deciden si
// pueden llamar aquí y qué dataset_key/reason pasan, nunca la
// orquestación de Supabase en sí. No dupliques esta lógica en un tercer
// sitio — añade un caller nuevo encima de esta función.
//
// is_admin / is_superadmin NUNCA se pasan aquí a propósito: handle_new_user()
// no los toca al crear la fila de profiles, así que nace siempre con ambos
// en false, sin importar el origen de la llamada.
export async function provisionUser({ email, first_name, last_name, nickname, dataset_key, reason = "signup" }) {
  const client = getServiceRoleClient();

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: first_name || null,
      last_name: last_name || null,
      nickname,
    },
  });
  if (createError) {
    return { error: createError };
  }

  // Dataset inicial obligatorio: sin esto, el alta dejaría al usuario con
  // escuelas/actividades/tarifas/comisiones/catálogos de pago completamente
  // vacíos. A diferencia del bloque best-effort de más abajo, un fallo aquí
  // SÍ deshace el alta — no se deja un usuario a medias, sin configuración
  // inicial.
  const { error: cloneError } = await client.rpc("clone_setup_dataset", {
    p_dataset_key: dataset_key,
    p_target_user_id: created.user.id,
  });
  if (cloneError) {
    await client.auth.admin.deleteUser(created.user.id);
    return { error: cloneError };
  }

  // Enlace de primer acceso + email de activación — best-effort: la cuenta
  // ya está creada, así que un fallo aquí no debe impedir la respuesta de
  // éxito. Si falla, quien llamó puede seguir compartiendo el enlace a
  // mano (ver action_link más abajo).
  let emailSent = false;
  let emailError = null;
  const { activationLink, error: linkErrorMessage } = await generateActivationLink(email);

  if (linkErrorMessage) {
    emailError = linkErrorMessage;
  } else {
    try {
      const result = await sendActivationEmail({ email, firstName: first_name, nickname, actionLink: activationLink, reason });
      emailSent = result.sent;
      if (!result.sent) emailError = result.error;
    } catch (err) {
      console.error("provisionUser: sendActivationEmail lanzó una excepción inesperada", err);
      emailError = "No se pudo enviar el email de bienvenida.";
    }
  }

  // Solo se devuelve cuando el email NO se ha enviado (fallo de envío o
  // configuración incompleta) — si el envío funciona, la respuesta no
  // incluye el enlace.
  const actionLink = !emailSent ? activationLink : undefined;

  return { user_id: created.user.id, email_sent: emailSent, email_error: emailError, action_link: actionLink };
}
