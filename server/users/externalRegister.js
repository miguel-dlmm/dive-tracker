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

// Mensaje de un enlace de invitación (Release V1, 2026-09-02) inválido,
// caducado o ya usado — mismo tono cercano que el resto de mensajes de
// enlaces inválidos de la app (ver ACTIVATION_LINK_INVALID en
// useSession.js). Un token roto siempre falla explícitamente: nunca cae en
// silencio al criterio general de allow_external_registration, aunque este
// esté activado — quien llega por un enlace de invitación espera que ESE
// enlace funcione, no una coincidencia con la configuración general.
const INVITATION_LINK_INVALID =
  "Este enlace de invitación ya no es válido. Puede que haya caducado o " +
  "que ya se haya usado. Pide uno nuevo a quien te invitó.";

// Comprueba un invitation_links.token: debe existir, no estar caducado y
// no haber sido usado ya. Devuelve la fila si es válido, o null si no —
// nunca lanza, un token roto es un caso esperado, no un error de
// infraestructura.
async function validateInvitationToken(client, inviteToken) {
  const { data, error } = await client
    .from("invitation_links")
    .select("token, expires_at, used_at")
    .eq("token", inviteToken)
    .maybeSingle();
  if (error || !data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

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

  const { email, first_name, last_name, nickname, language, invite_token } = input;
  if (!email || !nickname) {
    return { status: 400, payload: { error: "Email y nickname son obligatorios." } };
  }
  // Mismos 2 idiomas que el check de profiles.language (schema.sql) — si
  // llega algo distinto (o nada), provisionUser()/handle_new_user() caen
  // al 'es' por defecto, nunca se propaga un valor sin validar a metadata.
  const safeLanguage = ["es", "en"].includes(language) ? language : undefined;

  const client = getServiceRoleClient();

  // Un enlace de invitación (Release V1, 2026-09-02) se comprueba ANTES que
  // allow_external_registration y con prioridad total sobre él — un token
  // roto siempre falla explícitamente, nunca cae en silencio al criterio
  // general (ver INVITATION_LINK_INVALID arriba). Sin invite_token, el
  // comportamiento es exactamente el de antes.
  let invitation = null;
  if (invite_token) {
    invitation = await validateInvitationToken(client, invite_token);
    if (!invitation) {
      return { status: 403, payload: { error: INVITATION_LINK_INVALID } };
    }
  } else {
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
    language: safeLanguage,
  });
  if (result.error) {
    if (result.error.message?.includes(EMAIL_ALREADY_REGISTERED)) {
      // Misma respuesta que un alta con éxito, sin crear nada nuevo ni
      // reenviar ningún email — nunca revela que ese email ya existía.
      // La invitación (si la hay) NO se marca usada aquí a propósito: no
      // se ha creado ninguna cuenta nueva, así que quien se equivocó de
      // email puede reintentar con el mismo enlace mientras siga vigente.
      return { status: 200, payload: { email_sent: true } };
    }
    console.error(result.error);
    return { status: 400, payload: { error: friendlyError(result.error.message) } };
  }

  // Alta real completada — consume la invitación (un solo uso de verdad,
  // no solo por convención de cliente). Un fallo aquí no debe bloquear la
  // respuesta de éxito: la cuenta ya existe, es preferible un enlace que
  // en teoría se pudiera reintentar a perder un alta ya hecha.
  if (invitation) {
    const { error: consumeError } = await client
      .from("invitation_links")
      .update({ used_at: new Date().toISOString() })
      .eq("token", invitation.token);
    if (consumeError) console.error("external-register: no se pudo marcar la invitación como usada", consumeError);
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
