import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

// Elimina una cuenta por completo — exclusivo de superadmin. Llama al Admin
// API de Supabase Auth (auth.admin.deleteUser), que borra la fila de
// auth.users; profiles.user_id y las 9 tablas de negocio (schools,
// activities, payment_types, payment_statuses, rates, commission_rates,
// worklog, comisiones, colleague_payments) referencian auth.users(id) on
// delete cascade (ver schema.sql, corregido 2026-08-30 — antes NO tenían
// cascade, y por eso deleteUser fallaba con "Database error deleting
// user" para cualquier cuenta con datos reales, ver
// docs/ADR/0018-cascade-borrado-de-usuario.md), así que todo lo que
// cuelga del usuario desaparece con la misma operación — no hace falta
// borrar tabla por tabla desde aquí.
//
// No requiere ningún cambio de esquema: a diferencia de "desactivar" (que sí
// necesitaría poder distinguir el estado en el directorio de usuarios y por
// tanto tocar admin_list_profiles()), eliminar es una operación de una sola
// vía que no necesita persistir ningún estado nuevo.
//
// Lógica de negocio pura, sin nada de Vercel — mismo patrón
// que createUser.js / updateAdminStatus.js: recibe una petición ya
// normalizada ({ method, headers, body }) y devuelve una respuesta
// normalizada ({ status, payload }).

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

export async function handleDeleteUser({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("delete-user: faltan variables de entorno de Supabase");
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

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede eliminar usuarios.");
  if (denied) return denied;

  if (targetUserId === caller.id) {
    return { status: 400, payload: { error: "No puedes eliminar tu propia cuenta desde aquí." } };
  }

  const client = getServiceRoleClient();

  // Mismo criterio que updateAdminStatus: comprobación previa solo para un
  // error legible, no la única barrera. protect_profile_roles() no cubre el
  // borrado (solo updates de rol), así que aquí SÍ hace falta esta
  // comprobación como barrera real, no solo cosmética.
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
    return { status: 400, payload: { error: "No se puede eliminar una cuenta superadmin." } };
  }

  const { error: deleteError } = await client.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    console.error(deleteError);
    return { status: 400, payload: { error: deleteError.message } };
  }

  return { status: 200, payload: { user_id: targetUserId, deleted: true } };
}
