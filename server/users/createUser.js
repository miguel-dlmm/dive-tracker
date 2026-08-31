import { verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { provisionUser, friendlyError } from "./provisionUser.js";

// Alta de usuarios por un superadmin (MVP). Delega la orquestación de
// Supabase (crear cuenta, clonar dataset, enviar activación) en
// provisionUser.js, compartida con el registro externo (externalRegister.js)
// — este handler solo se ocupa de HTTP + autorización de superadmin + qué
// dataset_key usar (aquí, el que el propio superadmin elige en el formulario).
//
// Lógica de negocio pura, sin nada de Netlify ni de Vercel: recibe una
// petición ya normalizada ({ method, headers, body }) y devuelve una
// respuesta normalizada ({ status, payload }). Los adaptadores de cada
// proveedor (netlify/functions/create-user.js, api/create-user.js) son los
// únicos que traducen el formato de evento/HTTP de su plataforma hacia/desde
// esta forma — así no hay lógica duplicada entre proveedores.

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

  const { email, first_name, last_name, nickname, dataset_key } = input;
  if (!email || !nickname || !dataset_key) {
    return { status: 400, payload: { error: "Email, nickname y dataset inicial son obligatorios." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  // Crear usuarios es exclusivo de superadmin — los admins normales solo
  // tienen acceso de lectura al directorio (ver ConfigTab → UsersDirectory).
  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede crear usuarios.");
  if (denied) return denied;

  const result = await provisionUser({ email, first_name, last_name, nickname, dataset_key, reason: "signup" });
  if (result.error) {
    console.error(result.error);
    return { status: 400, payload: { error: friendlyError(result.error.message) } };
  }

  return {
    status: 200,
    payload: {
      user_id: result.user_id,
      email_sent: result.email_sent,
      ...(result.email_error ? { email_error: result.email_error } : {}),
      ...(result.action_link ? { action_link: result.action_link } : {}),
    },
  };
}
