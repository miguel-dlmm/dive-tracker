import { getServiceRoleClient, verifyCaller, requireAdmin, hasServerConfig } from "../supabaseAdmin.js";

// Devuelve qué cuentas están desactivadas (baneadas) — para pintar el
// estado en el directorio de Usuarios (ConfigTab → UsersDirectory). Lectura
// de directorio, igual que admin_list_profiles() en la base de datos: la
// hace cualquier admin, no solo superadmin (solo TOGGLEAR el estado es
// exclusivo de superadmin, ver setUserActive.js).
//
// No necesita ningún cambio de esquema: auth.admin.listUsers() ya expone
// banned_until directamente desde Supabase Auth — no hace falta extender
// ninguna función SQL para consultarlo (ver docs/ADR/0008-rediseno-configuracion.md,
// que planteaba justo esa extensión antes de descubrir esta vía más simple).
//
// perPage=200 sin paginar de verdad: proporcional al tamaño real de este
// proyecto (una decena de usuarios reales más cuentas de prueba, ver
// docs/BACKLOG.md) — revisar si el número de cuentas se acerca a ese límite
// algún día, no antes.
const LIST_USERS_PER_PAGE = 200;

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

// Un usuario está baneado si banned_until existe y es una fecha futura —
// GoTrue no siempre limpia el campo a null tras expirar por sí solo, así
// que comparar contra "ahora" es más fiable que solo comprobar presencia.
function isBanned(user) {
  if (!user.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}

// Resumen de actividad de UN usuario (cuántos movimientos tiene dados de
// alta y cuándo fue el último) para la hoja de detalle de Configuración →
// Usuarios — fusionado aquí 2026-09-07, antes era un endpoint aparte
// (get-user-activity-summary.js). Motivo del fusionado, no cosmético: el
// plan Hobby de Vercel limita a 12 Serverless Functions por deployment —
// esa función nueva era la 13ª y tumbó todos los deployments desde que se
// añadió ("No more than 12 Serverless Functions can be added...",
// confirmado con `vercel deploy --prebuilt` en local). Mismo criterio que
// cualquier endpoint admin de este archivo: aquí ya se autentica y se
// comprueba el rol, añadir una función nueva por cada consulta admin no
// escala contra ese límite del plan — de ahí que esta consulta puntual
// por usuario viva como una rama más de `handleListUserStatus` (activada
// por `user_id` en el cuerpo) en vez de un fichero propio.
const ACTIVITY_TABLES = ["worklog", "comisiones", "colleague_payments"];
async function activitySummaryFor(admin, userId) {
  let count = 0;
  let lastActivityAt = null;
  for (const table of ACTIVITY_TABLES) {
    const { count: tableCount, error: countError } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (countError) return { error: countError };
    count += tableCount || 0;

    // orden desc + limit 1, no MAX(updated_at) en SQL — más simple desde
    // el cliente JS de Supabase, y el índice ya existente (user_id) hace
    // esta consulta barata sin necesitar uno nuevo. INCLUYE filas
    // borradas lógicamente (deleted_at no se filtra aquí): el trigger
    // set_updated_at() se dispara en cualquier UPDATE, y la baja lógica es
    // una UPDATE como otra cualquiera, así que este único valor ya cubre
    // "creó, editó o eliminó", sin tres consultas separadas por tipo de
    // acción.
    const { data: latestRow, error: latestError } = await admin
      .from(table)
      .select("updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) return { error: latestError };
    if (latestRow?.updated_at && (!lastActivityAt || latestRow.updated_at > lastActivityAt)) {
      lastActivityAt = latestRow.updated_at;
    }
  }
  return { count, lastActivityAt };
}

export async function handleListUserStatus({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("list-user-status: faltan variables de entorno de Supabase");
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

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireAdmin(caller.id, "Solo un admin puede consultar el estado de las cuentas.");
  if (denied) return denied;

  // Rama de "resumen de actividad de un usuario" — ver activitySummaryFor()
  // arriba para el porqué de vivir aquí en vez de en su propio fichero.
  // Nunca junto al listado masivo de abajo: si llega user_id, es la ÚNICA
  // consulta de esta llamada (la hoja de detalle ya tiene el resto de
  // datos del usuario de la carga inicial del directorio).
  if (input.user_id) {
    if (typeof input.user_id !== "string") {
      return { status: 400, payload: { error: "user_id inválido." } };
    }
    const summary = await activitySummaryFor(getServiceRoleClient(), input.user_id);
    if (summary.error) {
      console.error(summary.error);
      return { status: 500, payload: { error: "No se pudo consultar la actividad de la cuenta." } };
    }
    return { status: 200, payload: summary };
  }

  const { data, error } = await getServiceRoleClient().auth.admin.listUsers({ page: 1, perPage: LIST_USERS_PER_PAGE });
  if (error) {
    console.error(error);
    return { status: 500, payload: { error: "No se pudo consultar el estado de las cuentas." } };
  }

  // lastSignInAt junto a active: mismo listUsers() ya en curso, sin ninguna
  // llamada ni columna extra — auth.users.last_sign_in_at es la fuente
  // correcta de "último login real" (a diferencia de derivarlo de
  // cualquier otra actividad en la app, que respondería a otra pregunta).
  const active = {};
  const lastSignInAt = {};
  data.users.forEach((u) => {
    active[u.id] = !isBanned(u);
    lastSignInAt[u.id] = u.last_sign_in_at || null;
  });

  return { status: 200, payload: { active, lastSignInAt } };
}
