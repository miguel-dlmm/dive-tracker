import { getServiceRoleClient, hasServerConfig } from "../supabaseAdmin.js";
import { provisionUser, friendlyError } from "./provisionUser.js";

// Registro externo (ADR-0023) — segundo consumidor público (sin sesión) de
// server/users/, junto a requestPasswordReset.js. A diferencia de
// handleCreateUser (superadmin, dataset elegido a mano), este:
//
// 1. Comprueba app_config.allow_external_registration en cada petición
//    ANTES de crear nada — nunca se fía de que el botón "Regístrate" esté
//    oculto en el cliente (eso es solo UX, no el control de acceso real).
//    Si está OFF, responde 403 sin tocar Supabase.
// 2. No recibe dataset_key del cliente — un registrante externo no conoce
//    (ni debe elegir) los datasets internos de arranque. Se usa siempre el
//    primero disponible en setup_datasets (hoy solo existe "ihasia"). Si
//    en el futuro hay varios, esto es lo primero a revisar — ver ADR-0023.
// 3. reason: "external_signup" en vez de "signup" — mismo mecanismo de
//    activación (enlace de un solo uso, fijar contraseña, aceptar bases
//    legales, todo vía activateAccount() ya existente), pero el email deja
//    claro que la cuenta se autoregistró, no que un admin la dio de alta.

function parseBody(body) {
  if (body == null) return {};
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

export async function handleExternalRegister({ method, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("external-register: faltan variables de entorno de Supabase");
    return { status: 500, payload: { error: "Configuración del servidor incompleta." } };
  }

  const input = parseBody(body);
  if (input === null) {
    return { status: 400, payload: { error: "Cuerpo de la petición inválido." } };
  }

  const { email, first_name, last_name, nickname } = input;
  if (!email || !nickname) {
    return { status: 400, payload: { error: "Email y nickname son obligatorios." } };
  }

  const client = getServiceRoleClient();

  const { data: configRow, error: configError } = await client
    .from("app_config")
    .select("allow_external_registration")
    .eq("id", true)
    .maybeSingle();
  if (configError) {
    console.error("external-register: no se pudo comprobar app_config", configError);
    return { status: 500, payload: { error: "No se pudo comprobar la configuración del servidor." } };
  }
  if (!configRow?.allow_external_registration) {
    return { status: 403, payload: { error: "El registro externo no está habilitado." } };
  }

  const { data: datasets, error: datasetsError } = await client
    .from("setup_datasets")
    .select("key")
    .order("label")
    .limit(1);
  if (datasetsError || !datasets?.length) {
    console.error("external-register: no hay ningún dataset inicial disponible", datasetsError);
    return { status: 500, payload: { error: "No se pudo completar el registro. Inténtalo más tarde." } };
  }

  const result = await provisionUser({
    email,
    first_name,
    last_name,
    nickname,
    dataset_key: datasets[0].key,
    reason: "external_signup",
  });
  if (result.error) {
    console.error(result.error);
    return { status: 400, payload: { error: friendlyError(result.error.message) } };
  }

  return {
    status: 200,
    payload: {
      email_sent: result.email_sent,
      ...(result.email_error ? { email_error: result.email_error } : {}),
      ...(result.action_link ? { action_link: result.action_link } : {}),
    },
  };
}
