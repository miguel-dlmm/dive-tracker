import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { sendDeploymentNoticeEmail } from "../email/EmailService.js";

// Registra un aviso de despliegue (commit completado) y avisa a todos los
// superadmin — vía email y vía el slide in-app que lee esta misma tabla
// (ver src/DeploymentNotice.jsx). Diseño: docs/ADR/0024-propuesta-avisos-despliegue-develop.md
// (implementado 2026-09-01).
//
// Quién lo invoca: Claude Code, con el token de sesión del propio
// superadmin, al final de cada commit de un bloque/subbloque de trabajo —
// no un webhook automático de Vercel (ver ADR-0024, "Quién dispara el
// aviso"). Por eso exige el mismo nivel de autorización que cualquier
// acción de superadmin en server/users/, aunque conceptualmente sea "solo"
// una notificación.
//
// Lógica de negocio pura, sin nada de Vercel — igual que server/users/*.js.
// El adaptador es api/notify-deployment.js.

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

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string" && v.trim().length > 0);
}

export async function handleNotifyDeployment({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("notify-deployment: faltan variables de entorno de Supabase");
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

  const { commit_hash, branch, summary } = input;
  if (!commit_hash || !branch || !summary) {
    return { status: 400, payload: { error: "commit_hash, branch y summary son obligatorios." } };
  }
  // Fase 6, Release V1: 'superadmin' (default, comportamiento original) o
  // 'all' — cualquier otro valor cae también a 'superadmin', nunca se deja
  // pasar algo sin validar a una columna con check constraint (fallaría el
  // insert de todas formas, pero mejor no depender de eso).
  const audience = input.audience === "all" ? "all" : "superadmin";

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireSuperadmin(caller.id, "Solo un superadmin puede registrar avisos de despliegue.");
  if (denied) return denied;

  const client = getServiceRoleClient();

  const { data: notice, error: insertError } = await client
    .from("deployment_notices")
    .insert({
      commit_hash,
      branch,
      summary,
      audience,
      changes: asStringArray(input.changes),
      suggested_tests: asStringArray(input.suggested_tests),
      technical_changes: asStringArray(input.technical_changes),
      functional_changes: asStringArray(input.functional_changes),
      has_ui_changes: Boolean(input.has_ui_changes),
      ui_changes_note: input.ui_changes_note || null,
      steps: asStringArray(input.steps),
      tests_status: input.tests_status || null,
      build_status: input.build_status || null,
      preview_url: input.preview_url || null,
      integration_preview_url: input.integration_preview_url || null,
    })
    .select()
    .single();

  if (insertError) {
    // 23505 = unique_violation sobre commit_hash — este commit ya generó
    // su aviso (reintento, doble llamada, varias pestañas). Idempotente a
    // propósito: nunca crea una fila duplicada ni reenvía el email.
    if (insertError.code === "23505") {
      return { status: 200, payload: { ok: true, already_notified: true } };
    }
    console.error("notify-deployment: no se pudo insertar el aviso", insertError);
    return { status: 500, payload: { error: "No se pudo registrar el aviso de despliegue." } };
  }

  // Fase 6: `audience` solo decide quién puede VER el aviso in-app (RLS de
  // deployment_notices/deployment_notice_views) — el EMAIL sigue yendo
  // exclusivamente a superadmins, sea cual sea audience. Motivo: la
  // plantilla actual (deploymentNoticeEmailTemplate.js — "nuevo
  // despliegue", hash de commit, botones de Preview Deployment) es
  // contenido de desarrollo, no algo que un usuario normal deba recibir
  // por email con el tono actual. Generalizar el email a 'all' necesita
  // su propia plantilla con copy cercano — deliberadamente NO construida
  // esta noche, ver docs/RELEASE-V1-PROGRESS.md, Fase 6.
  const { data: superadminProfiles, error: profilesError } = await client
    .from("profiles")
    .select("user_id")
    .eq("is_superadmin", true);

  if (profilesError) {
    console.error("notify-deployment: no se pudo listar superadmins", profilesError);
    return { status: 200, payload: { ok: true, notice_id: notice.id, recipients: [], recipients_error: "No se pudo listar superadmins." } };
  }

  const targetIds = new Set(superadminProfiles.map((p) => p.user_id));
  if (targetIds.size === 0) {
    return { status: 200, payload: { ok: true, notice_id: notice.id, recipients: [] } };
  }

  // No hay API de Supabase Admin para "traer solo estos user_id" — mismo
  // límite ya documentado en requestPasswordReset.js. perPage alto de sobra
  // para el tamaño real de este proyecto.
  const { data: listData, error: listError } = await client.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    console.error("notify-deployment: no se pudo listar usuarios", listError);
    return { status: 200, payload: { ok: true, notice_id: notice.id, recipients: [], recipients_error: "No se pudo listar usuarios." } };
  }

  const recipients = listData.users.filter((u) => targetIds.has(u.id) && u.email);

  const results = [];
  for (const user of recipients) {
    try {
      const sendResult = await sendDeploymentNoticeEmail({ email: user.email, notice });
      results.push({ email: user.email, sent: sendResult.sent, error: sendResult.error || null });
      if (!sendResult.sent) {
        console.error("notify-deployment: no se pudo enviar el email a", user.email, sendResult.error);
      }
    } catch (err) {
      console.error("notify-deployment: sendDeploymentNoticeEmail lanzó una excepción inesperada", err);
      results.push({ email: user.email, sent: false, error: "Excepción inesperada al enviar." });
    }
  }

  return { status: 200, payload: { ok: true, notice_id: notice.id, recipients: results } };
}
