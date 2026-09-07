import { getServiceRoleClient, verifyCaller, requireAdmin, hasServerConfig } from "../supabaseAdmin.js";

// Resumen de actividad de un usuario para la hoja de detalle de
// Configuración → Usuarios (Fase 9, 2026-09-07, pedido explícito: "quiero
// ver al consultar los datos de perfil de un usuario, cuantos movimientos
// tiene dados de alta y cuando creo/edito/elimino el último movimiento").
//
// Por qué un endpoint aparte, con service role, y no una consulta normal
// desde el cliente: worklog/comisiones/colleague_payments tienen RLS "own
// rows" (auth.uid() = user_id, ver schema.sql) — un admin viendo el
// perfil de OTRO usuario no puede leer sus filas con su propia sesión,
// necesita saltarse esa RLS como ya hace listUserStatus.js para
// auth.admin.listUsers(). Por usuario, bajo demanda al abrir su hoja de
// detalle (no en el listado entero) — calcular esto para todos los
// usuarios en cada carga del directorio sería trabajo desperdiciado para
// un dato que solo se consulta al entrar al detalle de uno en concreto.
//
// count: número de movimientos activos (deleted_at is null) — "cuántos
// tiene dados de alta hoy", no un histórico completo.
// lastActivityAt: el created_at/updated_at más reciente entre las 3
// tablas, INCLUYENDO filas borradas lógicamente — el trigger
// set_updated_at() se dispara en cualquier UPDATE, y la baja lógica
// (deleted_at) es una UPDATE como otra cualquiera, así que este único
// valor ya cubre "creó, editó o eliminó", sin necesitar tres consultas
// separadas por tipo de acción.

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

const TABLES = ["worklog", "comisiones", "colleague_payments"];

export async function handleGetUserActivitySummary({ method, headers, body }) {
  if (method !== "POST") {
    return { status: 405, payload: { error: "Method not allowed" } };
  }

  if (!hasServerConfig()) {
    console.error("get-user-activity-summary: faltan variables de entorno de Supabase");
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
  const targetUserId = input.user_id;
  if (!targetUserId || typeof targetUserId !== "string") {
    return { status: 400, payload: { error: "Falta user_id." } };
  }

  const caller = await verifyCaller(token);
  if (!caller) {
    return { status: 401, payload: { error: "Sesión inválida o caducada." } };
  }

  const denied = await requireAdmin(caller.id, "Solo un admin puede consultar la actividad de otra cuenta.");
  if (denied) return denied;

  const admin = getServiceRoleClient();
  let count = 0;
  let lastActivityAt = null;

  for (const table of TABLES) {
    const { count: tableCount, error: countError } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .is("deleted_at", null);
    if (countError) {
      console.error(countError);
      return { status: 500, payload: { error: "No se pudo consultar la actividad de la cuenta." } };
    }
    count += tableCount || 0;

    // orden desc + limit 1, no MAX(updated_at) en SQL — más simple desde
    // el cliente JS de Supabase, y el índice ya existente (user_id) hace
    // esta consulta barata sin necesitar uno nuevo.
    const { data: latestRow, error: latestError } = await admin
      .from(table)
      .select("updated_at")
      .eq("user_id", targetUserId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      console.error(latestError);
      return { status: 500, payload: { error: "No se pudo consultar la actividad de la cuenta." } };
    }
    if (latestRow?.updated_at && (!lastActivityAt || latestRow.updated_at > lastActivityAt)) {
      lastActivityAt = latestRow.updated_at;
    }
  }

  return { status: 200, payload: { count, lastActivityAt } };
}
