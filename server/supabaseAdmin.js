import { createClient } from "@supabase/supabase-js";

// Helpers de Supabase con service role, compartidos por cualquier acción de
// gestión de usuarios (hoy solo create-user; edición/roles llegarán más
// adelante y reutilizarán este mismo módulo en vez de duplicar esta lógica).
// No sabe nada de Vercel — solo habla con Supabase.
//
// SUPABASE_SERVICE_ROLE_KEY vive SOLO en el entorno del servidor (Vercel),
// nunca con prefijo VITE_ — Vite mete
// cualquier VITE_* en el bundle del cliente. VITE_SUPABASE_URL y
// VITE_SUPABASE_ANON_KEY sí se reutilizan aquí tal cual: no son secretos
// (el propio frontend los expone), así que no hace falta duplicarlos bajo
// otro nombre solo para el servidor.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasServerConfig() {
  return Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
}

let serviceRoleClient = null;

// Cliente con service role — el único con permiso para leer datos de
// cualquier usuario y para invocar el Admin API de Supabase Auth.
export function getServiceRoleClient() {
  if (!serviceRoleClient) serviceRoleClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  return serviceRoleClient;
}

// Valida el token de quien llama contra Supabase Auth y devuelve su usuario
// real (nunca uno declarado por el propio cliente, que no sería de fiar).
// Deliberadamente NO decide permisos aquí — eso lo hacen helpers específicos
// como isSuperadmin() más abajo, para que cada acción futura pida el
// permiso concreto que necesita en vez de asumir uno solo vale para todo.
export async function verifyCaller(token) {
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await callerClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

// Error específico para "no se pudo comprobar el permiso" (fallo de
// infraestructura: p.ej. SUPABASE_SERVICE_ROLE_KEY inválida — sí, esto
// pasó de verdad: una variable de entorno exportada a mano en una terminal
// concreta, que Vite respeta por encima de `.env.local` en esa misma
// terminal, hizo que la consulta fallara con "Invalid API key" — distinto
// de "se comprobó y el resultado es que no tiene permiso". Antes
// isSuperadmin()/isAdmin() colapsaban ambos casos en `false`, así que un
// problema de configuración del servidor se veía IDÉNTICO a "esta persona
// de verdad no es superadmin" — la ambigüedad exacta que no queremos. Cada
// handler distingue los dos casos con requireSuperadmin/requireAdmin más
// abajo: 403 solo para un "no" confirmado, 500 para "no se pudo saber".
export class PermissionCheckError extends Error {}

// Permiso específico: ¿es esta persona superadmin? No se reutiliza el
// is_admin(uid) de la base de datos porque ese devuelve true también para
// admins normales — mezclaría dos niveles de permiso distintos.
export async function isSuperadmin(userId) {
  const { data, error } = await getServiceRoleClient()
    .from("profiles")
    .select("is_superadmin")
    .eq("user_id", userId)
    .single();
  if (error) throw new PermissionCheckError(error.message);
  return !!data?.is_superadmin;
}

// Permiso de nivel admin (admin normal O superadmin). Lo usa
// listUserStatus.js: ver quién está activo/desactivado es lectura de
// directorio (mismo nivel que admin_list_profiles() en la base de datos),
// no una acción de superadmin como desactivar o eliminar.
export async function isAdmin(userId) {
  const { data, error } = await getServiceRoleClient()
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("user_id", userId)
    .single();
  if (error) throw new PermissionCheckError(error.message);
  return !!(data?.is_admin || data?.is_superadmin);
}

// Wrapper común para las 4 acciones que exigen superadmin (crear/eliminar/
// desactivar/cambiar rol de usuario) — antes cada handler repetía
// `if (!(await isSuperadmin(...))) return 403 ...` sin distinguir un fallo
// real de verificación de un "no, de verdad no tienes permiso". Devuelve
// `null` si puede continuar, o el `{status, payload}` a devolver tal cual
// si debe cortar aquí:
//   const denied = await requireSuperadmin(caller.id, "mensaje exacto");
//   if (denied) return denied;
export async function requireSuperadmin(userId, deniedMessage) {
  let allowed;
  try {
    allowed = await isSuperadmin(userId);
  } catch (e) {
    console.error("requireSuperadmin: no se pudo verificar el permiso", e);
    return { status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } };
  }
  if (!allowed) return { status: 403, payload: { error: deniedMessage } };
  return null;
}

// Mismo wrapper, para el nivel admin (ver isAdmin más arriba).
export async function requireAdmin(userId, deniedMessage) {
  let allowed;
  try {
    allowed = await isAdmin(userId);
  } catch (e) {
    console.error("requireAdmin: no se pudo verificar el permiso", e);
    return { status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } };
  }
  if (!allowed) return { status: 403, payload: { error: deniedMessage } };
  return null;
}
