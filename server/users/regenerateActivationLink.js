import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { generateActivationLink } from "./activationLink.js";

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
    .select("is_superadmin")
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

  const { activationLink, error: linkErrorMessage } = await generateActivationLink(authUser.user.email);
  if (linkErrorMessage) {
    return { status: 500, payload: { error: linkErrorMessage } };
  }

  return { status: 200, payload: { user_id: targetUserId, action_link: activationLink } };
}
