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
//    (ni debe elegir) los datasets internos de arranque, decisión que
//    ADR-0023 tomó a propósito. Se usa el dataset activo marcado
//    is_default (ver pickDatasetKey más abajo) — antes de esto, "el
//    primero por label"; ADR-0023 ya marcaba ese criterio como
//    provisional en cuanto hubiera más de un dataset (Bloque 4, editor de
//    datasets, 2026-09-01).
// 3. reason: "external_signup" en vez de "signup" — mismo mecanismo de
//    activación (enlace de un solo uso, fijar contraseña, aceptar bases
//    legales, todo vía activateAccount() ya existente), pero el email deja
//    claro que la cuenta se autoregistró, no que un admin la dio de alta.

// GoTrue devuelve este mensaje (en inglés, sin traducir) cuando el email ya
// tiene cuenta — descubierto probando el flujo real en el navegador
// (2026-09-01). Dejarlo pasar tal cual a la respuesta pública sería la
// misma vulnerabilidad de enumeración de usuarios que ADR-0022 evitó a
// propósito para "olvidé mi contraseña": cualquiera podría probar emails
// uno a uno contra este formulario y saber, por la respuesta, cuáles ya
// tienen cuenta en Ocean Flow.
const EMAIL_ALREADY_REGISTERED = "already been registered";

// Dataset a usar para un registro externo: el activo marcado is_default,
// o si ningún admin lo ha marcado todavía (instalación recién migrada,
// antes de que el superadmin abra el editor de datasets por primera vez),
// el primero activo por label — nunca deja el registro roto solo por
// faltar ese marcado explícito. Nunca ofrece un dataset con is_active =
// false: desactivar un dataset lo retira de esta selección igual que del
// desplegable de "Crear usuario" (ver ConfigTab.jsx).
async function pickDatasetKey(client) {
  const { data: byDefault } = await client
    .from("setup_datasets")
    .select("key")
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle();
  if (byDefault?.key) return byDefault.key;

  const { data: fallback } = await client
    .from("setup_datasets")
    .select("key")
    .eq("is_active", true)
    .order("label")
    .limit(1);
  return fallback?.[0]?.key || null;
}

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

  const datasetKey = await pickDatasetKey(client);
  if (!datasetKey) {
    console.error("external-register: no hay ningún dataset activo disponible");
    return { status: 500, payload: { error: "No se pudo completar el registro. Inténtalo más tarde." } };
  }

  const result = await provisionUser({
    email,
    first_name,
    last_name,
    nickname,
    dataset_key: datasetKey,
    reason: "external_signup",
  });
  if (result.error) {
    if (result.error.message?.includes(EMAIL_ALREADY_REGISTERED)) {
      // Misma respuesta que un alta con éxito, sin crear nada nuevo ni
      // reenviar ningún email — nunca revela que ese email ya existía.
      return { status: 200, payload: { email_sent: true } };
    }
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
