import { getServiceRoleClient, verifyCaller, hasServerConfig } from "../supabaseAdmin.js";

// Autoborrado de cuenta (Bloque 5, privacidad) — distinto de deleteUser.js
// (que es exclusivo de superadmin borrando a OTRA cuenta y bloquea
// explícitamente el self-delete por esa vía). Aquí es al revés: cualquier
// cuenta autenticada puede pedir borrar la SUYA propia, sin necesitar ser
// admin ni superadmin — nunca recibe target_user_id del cliente, siempre
// borra al propio caller identificado por su token, para que nadie pueda
// borrar una cuenta ajena llamando a este endpoint.
//
// Única cuenta que este endpoint nunca borra: la de un superadmin —
// dejaría la instalación sin nadie que pueda gestionar usuarios/RLS de
// superadmin, y no hay forma de deshacerlo desde la propia app (haría
// falta el SQL editor de Supabase). Mismo criterio ya aplicado en
// deleteUser.js al borrar la cuenta de OTRO usuario.
//
// Cascada de borrado: idéntica a deleteUser.js (ver ADR-0018) —
// auth.admin.deleteUser dispara on delete cascade en profiles y las 9
// tablas de negocio, sin necesitar borrar tabla por tabla aquí.

function getHeader(headers, name) {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export async function handleDeleteOwnAccount({ method, headers }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("delete-own-account: faltan variables de entorno de Supabase");
    return { status: 500, payload: { error: "Configuración del servidor incompleta." } };
  }

  const authHeader = getHeader(headers, "authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { status: 401, payload: { error: "Falta el token de sesión." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const client = getServiceRoleClient();

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("is_superadmin")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (profileError) {
    console.error(profileError);
    return { status: 500, payload: { error: "No se pudo comprobar tu cuenta." } };
  }
  if (profile?.is_superadmin) {
    return { status: 400, payload: { error: "Una cuenta superadmin no puede eliminarse a sí misma desde aquí. Contacta con otro superadmin, o hazlo desde Supabase directamente." } };
  }

  const { error: deleteError } = await client.auth.admin.deleteUser(caller.id);
  if (deleteError) {
    console.error(deleteError);
    return { status: 400, payload: { error: "No se pudo eliminar la cuenta. Inténtalo de nuevo." } };
  }

  return { status: 200, payload: { deleted: true } };
}
