import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

// Genera un enlace de invitación de un solo uso (24h) — pedido explícito
// del usuario 2026-09-02: junto a "Crear usuario" en Configuración, deja
// autoregistrarse a quien lo reciba aunque el registro externo general
// (app_config.allow_external_registration) esté cerrado. Ver
// docs/RELEASE-V1-PROGRESS.md, "Cola de tareas adicionales", para el
// razonamiento completo y las decisiones de diseño ya tomadas.
//
// Exclusivo de superadmin, mismo nivel que crear usuarios directamente —
// generar una vía de alta alternativa es una acción del mismo peso que dar
// de alta una cuenta en sí.

function getHeader(headers, name) {
  if (!headers) return undefined;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function handleGenerateInvitationLink({ method, headers }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("generate-invitation-link: faltan variables de entorno de Supabase");
    return { status: 500, payload: { error: "Configuración del servidor incompleta." } };
  }
  if (!process.env.APP_URL) {
    console.error("generate-invitation-link: falta APP_URL");
    return { status: 500, payload: { error: "Configuración del servidor incompleta." } };
  }

  const authHeader = getHeader(headers, "authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { status: 401, payload: { error: "Falta el token de sesión." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede generar enlaces de invitación.");
  if (denied) return denied;

  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
  const { data, error } = await getServiceRoleClient()
    .from("invitation_links")
    .insert({ created_by: caller.id, expires_at: expiresAt })
    .select("token")
    .single();

  if (error) {
    console.error("generate-invitation-link: no se pudo crear el enlace", error);
    return { status: 500, payload: { error: "No se pudo generar el enlace de invitación." } };
  }

  const url = new URL(process.env.APP_URL);
  url.searchParams.set("invite", data.token);

  return { status: 200, payload: { invitation_link: url.toString(), expires_at: expiresAt } };
}
