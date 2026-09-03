import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

// Cambia el is_admin de OTRA cuenta — exclusivo de superadmin. is_superadmin
// nunca se acepta aquí ni se toca: protect_profile_roles() en la base de
// datos lo bloquea de forma incondicional pase lo que pase en este archivo,
// así que ni siquiera se intenta desde aquí. Las comprobaciones de este
// endpoint son solo para devolver un error legible antes de llegar a la
// base de datos — la barrera final, definitiva, sigue siendo el trigger
// (ver schema.sql).
//
// Lógica de negocio pura, sin nada de Vercel — mismo patrón
// que createUser.js: recibe una petición ya normalizada ({ method, headers,
// body }) y devuelve una respuesta normalizada ({ status, payload }).

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

export async function handleUpdateAdminStatus({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("update-admin-status: faltan variables de entorno de Supabase");
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

  // Contrato estrecho a propósito: solo target_user_id + is_admin. No se lee
  // is_superadmin del body en ningún caso, y el user_id de quien llama NUNCA
  // sale del body — siempre del token verificado más abajo.
  const { target_user_id: targetUserId, is_admin: isAdminValue } = input;
  if (!targetUserId || typeof isAdminValue !== "boolean") {
    return { status: 400, payload: { error: "Faltan target_user_id o is_admin (booleano)." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede cambiar el rol de admin de otra cuenta.");
  if (denied) return denied;

  if (targetUserId === caller.id) {
    return { status: 400, payload: { error: "No puedes cambiar tu propio rol de admin desde aquí." } };
  }

  const client = getServiceRoleClient();

  // Comprobación previa solo para un error legible — protect_profile_roles()
  // rechazaría igualmente el update si el objetivo es superadmin, pero así
  // se evita depender del texto crudo de una excepción de Postgres.
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
    return { status: 400, payload: { error: "No se puede cambiar el rol de admin de una cuenta superadmin." } };
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({ is_admin: isAdminValue })
    .eq("user_id", targetUserId);

  if (updateError) {
    console.error(updateError);
    return { status: 400, payload: { error: updateError.message } };
  }

  return { status: 200, payload: { user_id: targetUserId, is_admin: isAdminValue } };
}
