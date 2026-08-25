import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

// Alta de usuarios (MVP) — el superadmin fija una contraseña inicial a mano
// en el momento de crear la cuenta, sin invitación ni email de confirmación.
// Esto es deliberadamente temporal: cuando se implemente un flujo de
// invitación o de "restablecer contraseña", esta función deja de aceptar
// `password` en el body y pasa a generar un link de invitación/reset en su
// lugar (p. ej. supabase.auth.admin.inviteUserByEmail /
// generateLink({ type: "recovery" })).
//
// Lógica de negocio pura, sin nada de Netlify ni de Vercel: recibe una
// petición ya normalizada ({ method, headers, body }) y devuelve una
// respuesta normalizada ({ status, payload }). Los adaptadores de cada
// proveedor (netlify/functions/create-user.js, api/create-user.js) son los
// únicos que traducen el formato de evento/HTTP de su plataforma hacia/desde
// esta forma — así no hay lógica duplicada entre proveedores.

// Traduce violaciones de constraint conocidas de public.profiles a mensajes
// legibles; cualquier otro error (de Postgres o de GoTrue) se propaga tal
// cual, ya suele venir en un formato razonable.
function friendlyError(message) {
  if (!message) return "Error desconocido";
  if (message.includes("profiles_nickname_lower_key")) return "Ese nickname ya está en uso.";
  if (message.includes("profiles_nickname_no_at")) return 'El nickname no puede contener "@".';
  return message;
}

// Netlify entrega event.body como string; Vercel ya entrega req.body
// parseado como objeto cuando el Content-Type es JSON. Se acepta cualquiera
// de las dos formas aquí para que ningún adaptador tenga que parsear nada.
function parseBody(body) {
  if (body == null) return {};
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

// event.headers (Netlify) y req.headers (Vercel) no garantizan la misma
// capitalización, así que la búsqueda es case-insensitive.
function getHeader(headers, name) {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export async function handleCreateUser({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("create-user: faltan variables de entorno de Supabase");
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

  const { email, password, first_name, last_name, nickname } = input;
  if (!email || !password || !nickname) {
    return { status: 400, payload: { error: "Email, nickname y contraseña son obligatorios." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  // Crear usuarios es exclusivo de superadmin — los admins normales solo
  // tienen acceso de lectura al directorio (ver ConfigTab → UsersDirectory).
  if (!(await isSuperadmin(caller.id))) {
    return { status: 403, payload: { error: "Solo un superadmin puede crear usuarios." } };
  }

  // is_admin / is_superadmin NUNCA se pasan aquí a propósito: handle_new_user()
  // no los toca al crear la fila de profiles, así que nace siempre con
  // ambos en false, sin importar lo que llegue en el body de esta función.
  const { data: created, error: createError } = await getServiceRoleClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: first_name || null,
      last_name: last_name || null,
      nickname,
    },
  });

  if (createError) {
    console.error(createError);
    return { status: 400, payload: { error: friendlyError(createError.message) } };
  }

  return { status: 200, payload: { user_id: created.user.id } };
}
