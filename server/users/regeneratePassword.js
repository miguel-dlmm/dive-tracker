import { randomBytes } from "node:crypto";
import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { generateActivationLink } from "./activationLink.js";

// "Regenerar contraseña" — a diferencia de regenerate-activation-link.js,
// esto invalida explícitamente la contraseña actual (no solo genera un
// enlace nuevo dejando la vieja utilizable hasta que se canjee): se
// sobrescribe con una cadena aleatoria de 32 bytes, generada con
// crypto.randomBytes (criptográficamente segura), que nunca se muestra ni
// se guarda en ningún sitio — el único camino de vuelta es el enlace de
// activación nuevo. Pone además profiles.activated_at a null (el usuario
// solo vuelve a "activo" al completar el nuevo proceso) y quita el
// baneo si lo tuviera (mismo motivo que regenerate-activation-link.js: un
// enlace de recovery no puede canjearse con la cuenta bloqueada).

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

export async function handleRegeneratePassword({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("regenerate-password: faltan variables de entorno de Supabase");
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

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede regenerar la contraseña de otra cuenta.");
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
    return { status: 400, payload: { error: "No se puede regenerar la contraseña de una cuenta superadmin." } };
  }

  const { data: authUser, error: authUserError } = await client.auth.admin.getUserById(targetUserId);
  if (authUserError || !authUser?.user?.email) {
    console.error("regenerate-password: no se pudo obtener el email de la cuenta objetivo", authUserError);
    return { status: 500, payload: { error: "No se pudo obtener el email de la cuenta objetivo." } };
  }

  // Contraseña aleatoria, nunca expuesta — el único camino de acceso a
  // partir de aquí es el enlace de activación generado más abajo. Se
  // combina con el desbaneo en la misma llamada.
  const randomPassword = randomBytes(32).toString("hex");
  const { error: updateError } = await client.auth.admin.updateUserById(targetUserId, {
    password: randomPassword,
    ban_duration: BAN_NONE,
  });
  if (updateError) {
    console.error(updateError);
    return { status: 400, payload: { error: updateError.message } };
  }

  // activated_at a null: el usuario vuelve a "pendiente de activación"
  // hasta que complete el nuevo proceso — nunca se marca activo de forma
  // artificial. No toca legal_consents (tabla aparte, ver useSession.js):
  // aceptar las bases legales no depende de activated_at, así que no se
  // vuelve a pedir.
  const { error: profileError } = await client
    .from("profiles")
    .update({ activated_at: null })
    .eq("user_id", targetUserId);
  if (profileError) {
    console.error("regenerate-password: no se pudo limpiar activated_at", profileError);
    // No se corta aquí: la contraseña ya se invalidó (lo importante para
    // seguridad) y el enlace nuevo sigue siendo válido — solo faltaría un
    // dato de estado, que se corregirá solo en el próximo reload().
  }

  const { activationLink, error: linkErrorMessage } = await generateActivationLink(authUser.user.email);
  if (linkErrorMessage) {
    return { status: 500, payload: { error: linkErrorMessage } };
  }

  return { status: 200, payload: { user_id: targetUserId, action_link: activationLink } };
}
