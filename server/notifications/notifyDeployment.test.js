vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  requireSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

vi.mock("../email/EmailService.js", () => ({
  sendDeploymentNoticeEmail: vi.fn(),
}));

import { handleNotifyDeployment } from "./notifyDeployment.js";
import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { sendDeploymentNoticeEmail } from "../email/EmailService.js";

const VALID_BODY = {
  commit_hash: "abc1234def",
  branch: "feature/0.1-deployment-notice",
  summary: "Sistema de avisos de despliegue para superadmin",
  changes: ["Tabla deployment_notices + RLS", "Endpoint /api/notify-deployment"],
  suggested_tests: ["Comprobar que llega el email al superadmin"],
  tests_status: "442 passed (442)",
  build_status: "ok",
  preview_url: "https://dive-tracker-abc123.vercel.app",
};

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify(VALID_BODY),
    ...overrides,
  };
}

const NOTICE_ROW = { id: "notice-1", ...VALID_BODY };

// Mock encadenable mínimo de supabase-js para .from(...).insert(...).select().single()
// y .from(...).select(...).eq(...) — dos formas de uso distintas en el mismo
// cliente, así que se construye una vez por test según lo que necesite.
function buildClient({ insertResult, profilesResult, listUsersResult }) {
  const insertSingle = vi.fn().mockResolvedValue(insertResult);
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insert = vi.fn(() => ({ select: insertSelect }));

  const profilesEq = vi.fn().mockResolvedValue(profilesResult);
  const profilesSelect = vi.fn(() => ({ eq: profilesEq }));

  const from = vi.fn((table) => {
    if (table === "deployment_notices") return { insert };
    if (table === "profiles") return { select: profilesSelect };
    throw new Error(`tabla inesperada en el mock: ${table}`);
  });

  const listUsers = vi.fn().mockResolvedValue(listUsersResult);

  return { from, auth: { admin: { listUsers } }, __mocks: { insert, listUsers } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: "caller-1" });
  requireSuperadmin.mockResolvedValue(null);
  getServiceRoleClient.mockReset();
  sendDeploymentNoticeEmail.mockReset();
  sendDeploymentNoticeEmail.mockResolvedValue({ sent: true, error: null });
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleNotifyDeployment(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleNotifyDeployment(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleNotifyDeployment(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 400 si el cuerpo no es JSON válido", async () => {
  const result = await handleNotifyDeployment(request({ body: "{not json" }));

  expect(result).toEqual({ status: 400, payload: { error: "Cuerpo de la petición inválido." } });
});

it.each(["commit_hash", "branch", "summary"])("devuelve 400 si falta el campo %s", async (field) => {
  const body = { ...VALID_BODY };
  delete body[field];

  const result = await handleNotifyDeployment(request({ body: JSON.stringify(body) }));

  expect(result).toEqual({ status: 400, payload: { error: "commit_hash, branch y summary son obligatorios." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleNotifyDeployment(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin tocar Supabase", async () => {
  requireSuperadmin.mockResolvedValue({ status: 403, payload: { error: "Solo un superadmin puede registrar avisos de despliegue." } });

  const result = await handleNotifyDeployment(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un superadmin puede registrar avisos de despliegue." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

describe("con permisos válidos", () => {
  it("inserta el aviso y envía el email a cada superadmin, nunca a un admin normal ni a un usuario sin rol", async () => {
    const client = buildClient({
      insertResult: { data: NOTICE_ROW, error: null },
      profilesResult: { data: [{ user_id: "super-1" }], error: null },
      listUsersResult: {
        data: {
          users: [
            { id: "super-1", email: "admin@ocean.flow" },
            { id: "admin-normal", email: "admin-normal@ocean.flow" },
            { id: "user-sin-rol", email: "diver@ocean.flow" },
          ],
        },
        error: null,
      },
    });
    getServiceRoleClient.mockReturnValue(client);

    const result = await handleNotifyDeployment(request());

    expect(client.__mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ commit_hash: VALID_BODY.commit_hash, branch: VALID_BODY.branch, summary: VALID_BODY.summary }));
    expect(sendDeploymentNoticeEmail).toHaveBeenCalledTimes(1);
    expect(sendDeploymentNoticeEmail).toHaveBeenCalledWith({ email: "admin@ocean.flow", notice: NOTICE_ROW });
    expect(result).toEqual({
      status: 200,
      payload: { ok: true, notice_id: "notice-1", recipients: [{ email: "admin@ocean.flow", sent: true, error: null }] },
    });
  });

  // Fase 6, Release V1 (2026-09-02): audience se guarda en la fila, pero
  // el email sigue yendo SOLO a superadmins sea cual sea su valor — la
  // plantilla actual es contenido de desarrollo, no algo que enviar a un
  // usuario normal (ver comentario en notifyDeployment.js).
  it("guarda audience='all' en la fila, pero sigue enviando el email solo a superadmins", async () => {
    const client = buildClient({
      insertResult: { data: { ...NOTICE_ROW, audience: "all" }, error: null },
      profilesResult: { data: [{ user_id: "super-1" }], error: null },
      listUsersResult: {
        data: { users: [{ id: "super-1", email: "admin@ocean.flow" }, { id: "user-sin-rol", email: "diver@ocean.flow" }] },
        error: null,
      },
    });
    getServiceRoleClient.mockReturnValue(client);

    const result = await handleNotifyDeployment(request({ body: JSON.stringify({ ...VALID_BODY, audience: "all" }) }));

    expect(client.__mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ audience: "all" }));
    expect(sendDeploymentNoticeEmail).toHaveBeenCalledTimes(1);
    expect(sendDeploymentNoticeEmail).toHaveBeenCalledWith({ email: "admin@ocean.flow", notice: { ...NOTICE_ROW, audience: "all" } });
    expect(result.payload.recipients).toEqual([{ email: "admin@ocean.flow", sent: true, error: null }]);
  });

  it("sin audience en el body, guarda 'superadmin' por defecto (compatibilidad con llamadas ya existentes)", async () => {
    const client = buildClient({
      insertResult: { data: NOTICE_ROW, error: null },
      profilesResult: { data: [], error: null },
      listUsersResult: { data: { users: [] }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);

    await handleNotifyDeployment(request());

    expect(client.__mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ audience: "superadmin" }));
  });

  it("un audience no reconocido cae a 'superadmin', nunca se propaga sin validar", async () => {
    const client = buildClient({
      insertResult: { data: NOTICE_ROW, error: null },
      profilesResult: { data: [], error: null },
      listUsersResult: { data: { users: [] }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);

    await handleNotifyDeployment(request({ body: JSON.stringify({ ...VALID_BODY, audience: "everyone-please" }) }));

    expect(client.__mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ audience: "superadmin" }));
  });

  it("es idempotente — un commit_hash duplicado no crea una fila nueva ni reenvía el email", async () => {
    const client = buildClient({
      insertResult: { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } },
      profilesResult: { data: [], error: null },
      listUsersResult: { data: { users: [] }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);

    const result = await handleNotifyDeployment(request());

    expect(result).toEqual({ status: 200, payload: { ok: true, already_notified: true } });
    expect(sendDeploymentNoticeEmail).not.toHaveBeenCalled();
  });

  it("sin superadmins en profiles, registra el aviso pero no intenta enviar ningún email", async () => {
    const client = buildClient({
      insertResult: { data: NOTICE_ROW, error: null },
      profilesResult: { data: [], error: null },
      listUsersResult: { data: { users: [] }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);

    const result = await handleNotifyDeployment(request());

    expect(result).toEqual({ status: 200, payload: { ok: true, notice_id: "notice-1", recipients: [] } });
    expect(sendDeploymentNoticeEmail).not.toHaveBeenCalled();
    expect(client.__mocks.listUsers).not.toHaveBeenCalled();
  });

  it("no bloquea el registro del aviso si falla el envío de un email concreto", async () => {
    const client = buildClient({
      insertResult: { data: NOTICE_ROW, error: null },
      profilesResult: { data: [{ user_id: "super-1" }], error: null },
      listUsersResult: { data: { users: [{ id: "super-1", email: "admin@ocean.flow" }] }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);
    sendDeploymentNoticeEmail.mockResolvedValue({ sent: false, error: "Fallo de Resend" });

    const result = await handleNotifyDeployment(request());

    expect(result).toEqual({
      status: 200,
      payload: { ok: true, notice_id: "notice-1", recipients: [{ email: "admin@ocean.flow", sent: false, error: "Fallo de Resend" }] },
    });
  });

  it("no bloquea el registro del aviso si sendDeploymentNoticeEmail lanza una excepción inesperada", async () => {
    const client = buildClient({
      insertResult: { data: NOTICE_ROW, error: null },
      profilesResult: { data: [{ user_id: "super-1" }], error: null },
      listUsersResult: { data: { users: [{ id: "super-1", email: "admin@ocean.flow" }] }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);
    sendDeploymentNoticeEmail.mockRejectedValue(new Error("boom"));

    const result = await handleNotifyDeployment(request());

    expect(result).toEqual({
      status: 200,
      payload: { ok: true, notice_id: "notice-1", recipients: [{ email: "admin@ocean.flow", sent: false, error: "Excepción inesperada al enviar." }] },
    });
  });
});
