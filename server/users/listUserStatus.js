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

  const { data, error } = await getServiceRoleClient().auth.admin.listUsers({ page: 1, perPage: LIST_USERS_PER_PAGE });
  if (error) {
    console.error(error);
    return { status: 500, payload: { error: "No se pudo consultar el estado de las cuentas." } };
  }

  const active = {};
  data.users.forEach((u) => { active[u.id] = !isBanned(u); });

  return { status: 200, payload: { active } };
}
