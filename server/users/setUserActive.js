import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

// Desactiva/reactiva una cuenta — exclusivo de superadmin. A diferencia de
// eliminar, esto NO borra nada: usa el "ban" ya incorporado en Supabase Auth
// (auth.admin.updateUserById con ban_duration), que bloquea el login sin
// tocar profiles ni ninguna tabla de datos (worklog, comisiones, tarifas...
// siguen intactas). No requiere ningún cambio de esquema — a diferencia de
// la primera propuesta (ver docs/ADR/0008-rediseno-configuracion.md, que
// planteaba extender admin_list_profiles() para exponer este estado), el
// propio Admin API ya expone banned_until sin tocar ninguna función SQL —
// ver listUserStatus.js, que lee ese mismo campo para mostrar el estado en
// el directorio.
//
// "876000h" (~100 años) como ban_duration para desactivar: es el valor que
// la propia documentación de Supabase usa como "indefinido" — no existe un
// literal "forever", así que un plazo absurdamente largo cumple la misma
// función. "none" desactiva el baneo (reactiva la cuenta).
const BAN_FOREVER = "876000h";
const BAN_NONE = "none";

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

export async function handleSetUserActive({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("set-user-active: faltan variables de entorno de Supabase");
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

  const { target_user_id: targetUserId, active } = input;
  if (!targetUserId || typeof active !== "boolean") {
    return { status: 400, payload: { error: "Faltan target_user_id o active (booleano)." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede activar o desactivar usuarios.");
  if (denied) return denied;

  if (targetUserId === caller.id) {
    return { status: 400, payload: { error: "No puedes desactivar tu propia cuenta desde aquí." } };
  }

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
    return { status: 400, payload: { error: "No se puede desactivar una cuenta superadmin." } };
  }

  const { error: updateError } = await client.auth.admin.updateUserById(targetUserId, {
    ban_duration: active ? BAN_NONE : BAN_FOREVER,
  });
  if (updateError) {
    console.error(updateError);
    return { status: 400, payload: { error: updateError.message } };
  }

  return { status: 200, payload: { user_id: targetUserId, active } };
}
