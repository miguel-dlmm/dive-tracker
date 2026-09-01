import { verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { provisionUser, friendlyError } from "./provisionUser.js";

// Alta de usuarios por un superadmin (MVP). Delega la orquestación de
// Supabase (crear cuenta, clonar dataset, enviar activación) en
// provisionUser.js, compartida con el registro externo (externalRegister.js)
// — este handler solo se ocupa de HTTP + autorización de superadmin + qué
// dataset_key usar (aquí, el que el propio superadmin elige en el formulario).
//
// Lógica de negocio pura, sin nada de Vercel: recibe una petición ya
// normalizada ({ method, headers, body }) y devuelve una respuesta
// normalizada ({ status, payload }). El adaptador (api/create-user.js) es
// el único que traduce el formato de evento/HTTP de la plataforma
// hacia/desde esta forma.

// req.body ya llega parseado como objeto cuando el Content-Type es JSON;
// se acepta también un string por si acaso, sin nada que parsear de más.
function parseBody(body) {
  if (body == null) return {};
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

// req.headers no garantiza una capitalización concreta, así que la
// búsqueda es case-insensitive.
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

  const { email, first_name, last_name, nickname, dataset_key, language } = input;
  if (!email || !nickname || !dataset_key) {
    return { status: 400, payload: { error: "Email, nickname y dataset inicial son obligatorios." } };
  }
  // Mismos 2 idiomas que el check de profiles.language (schema.sql) — si
  // llega algo distinto (o nada), provisionUser()/handle_new_user() caen
  // al 'es' por defecto, nunca se propaga un valor sin validar a metadata.
  const safeLanguage = ["es", "en"].includes(language) ? language : undefined;

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  // Crear usuarios es exclusivo de superadmin — los admins normales solo
  // tienen acceso de lectura al directorio (ver ConfigTab → UsersDirectory).
  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede crear usuarios.");
  if (denied) return denied;

  const result = await provisionUser({ email, first_name, last_name, nickname, dataset_key, reason: "signup", language: safeLanguage });
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
