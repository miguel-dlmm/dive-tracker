import { createClient } from "@supabase/supabase-js";

// Helpers de Supabase con service role, compartidos por cualquier acción de
// gestión de usuarios (hoy solo create-user; edición/roles llegarán más
// adelante y reutilizarán este mismo módulo en vez de duplicar esta lógica).
// No sabe nada de Netlify ni de Vercel — solo habla con Supabase.
//
// SUPABASE_SERVICE_ROLE_KEY vive SOLO en el entorno del servidor (Netlify o
// Vercel, según dónde se despliegue), nunca con prefijo VITE_ — Vite mete
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

// Permiso específico: ¿es esta persona superadmin? No se reutiliza el
// is_admin(uid) de la base de datos porque ese devuelve true también para
// admins normales — mezclaría dos niveles de permiso distintos. Un futuro
// isAdmin(userId) para acciones de nivel admin (no superadmin) se añadiría
// aquí al lado, como un helper igual de específico, no fusionado con este.
export async function isSuperadmin(userId) {
  const { data, error } = await getServiceRoleClient()
    .from("profiles")
    .select("is_superadmin")
    .eq("user_id", userId)
    .single();
  return !error && !!data?.is_superadmin;
}

// Permiso de nivel admin (admin normal O superadmin) — el helper anticipado
// en el comentario de arriba. Lo usa listUserStatus.js: ver quién está
// activo/desactivado es lectura de directorio (mismo nivel que
// admin_list_profiles() en la base de datos), no una acción de superadmin
// como desactivar o eliminar.
export async function isAdmin(userId) {
  const { data, error } = await getServiceRoleClient()
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("user_id", userId)
    .single();
  return !error && !!(data?.is_admin || data?.is_superadmin);
}
