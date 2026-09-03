vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

vi.mock("./provisionUser.js", () => ({
  provisionUser: vi.fn(),
  friendlyError: (m) => m,
}));

import { handleExternalRegister } from "./externalRegister.js";
import { hasServerConfig, getServiceRoleClient } from "../supabaseAdmin.js";
import { provisionUser } from "./provisionUser.js";

const VALID_BODY = { email: "diver@example.com", first_name: "Ada", last_name: "Lovelace", nickname: "ada" };

function request(overrides = {}) {
  return { method: "POST", body: JSON.stringify(VALID_BODY), ...overrides };
}

// pickDatasetKey (externalRegister.js) hace hasta dos consultas contra
// setup_datasets: primero busca el activo marcado is_default
// (.eq().eq().maybeSingle()) y, si no hay ninguno, cae a "el primero
// activo por label" (.eq().order().limit()) — ambas ramas cuelgan del
// mismo primer .eq("is_active", true), por eso el objeto que devuelve
// necesita soportar tanto .eq() como .order() a continuación.
function makeClient({
  configResult = { data: { allow_external_registration: true }, error: null },
  defaultDatasetResult = { data: null, error: null },
  fallbackDatasetResult = { data: [{ key: "ihasia" }], error: null },
  invitationLookupResult = { data: null, error: null },
  invitationUpdateResult = { error: null },
} = {}) {
  const configMaybeSingle = vi.fn().mockResolvedValue(configResult);
  const configEq = vi.fn().mockReturnValue({ maybeSingle: configMaybeSingle });
  const configSelect = vi.fn().mockReturnValue({ eq: configEq });

  const defaultMaybeSingle = vi.fn().mockResolvedValue(defaultDatasetResult);
  const fallbackLimit = vi.fn().mockResolvedValue(fallbackDatasetResult);
  const fallbackOrder = vi.fn(() => ({ limit: fallbackLimit }));
  const afterActiveEq = { eq: vi.fn(() => ({ maybeSingle: defaultMaybeSingle })), order: fallbackOrder };
  const datasetsEq = vi.fn(() => afterActiveEq);
  const datasetsSelect = vi.fn(() => ({ eq: datasetsEq }));

  const invitationMaybeSingle = vi.fn().mockResolvedValue(invitationLookupResult);
  const invitationSelectEq = vi.fn(() => ({ maybeSingle: invitationMaybeSingle }));
  const invitationSelect = vi.fn(() => ({ eq: invitationSelectEq }));
  const invitationUpdateEq = vi.fn().mockResolvedValue(invitationUpdateResult);
  const invitationUpdate = vi.fn(() => ({ eq: invitationUpdateEq }));

  const from = vi.fn((table) => {
    if (table === "app_config") return { select: configSelect };
    if (table === "setup_datasets") return { select: datasetsSelect };
    if (table === "invitation_links") return { select: invitationSelect, update: invitationUpdate };
    throw new Error(`tabla inesperada en el mock: ${table}`);
  });
  return { from, invitationUpdate, invitationUpdateEq };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  getServiceRoleClient.mockReturnValue(makeClient());
  provisionUser.mockReset();
  provisionUser.mockResolvedValue({ user_id: "new-user-1", email_sent: true, email_error: null, action_link: undefined });
});

it("rechaza métodos distintos de POST", async () => {
  const result = await handleExternalRegister(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleExternalRegister(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 400 si falta email o nickname", async () => {
  const result = await handleExternalRegister(request({ body: JSON.stringify({ email: "x@example.com" }) }));

  expect(result).toEqual({ status: 400, payload: { error: "Email y nickname son obligatorios." } });
  expect(provisionUser).not.toHaveBeenCalled();
});

it("devuelve 403 si el registro externo está desactivado, sin llamar a provisionUser", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ configResult: { data: { allow_external_registration: false }, error: null } }));

  const result = await handleExternalRegister(request());

  expect(result).toEqual({ status: 403, payload: { error: "El registro externo no está habilitado." } });
  expect(provisionUser).not.toHaveBeenCalled();
});

it("flujo correcto: registro externo activado, provisiona con el primer dataset disponible y reason external_signup", async () => {
  const result = await handleExternalRegister(request());

  expect(provisionUser).toHaveBeenCalledWith({
    email: VALID_BODY.email,
    first_name: VALID_BODY.first_name,
    last_name: VALID_BODY.last_name,
    nickname: VALID_BODY.nickname,
    dataset_key: "ihasia",
    reason: "external_signup",
    language: undefined,
  });
  expect(result).toEqual({ status: 200, payload: { email_sent: true } });
});

// Release V1, Fase 2 (multidioma): language solo se propaga si es uno de
// los 2 idiomas soportados — cualquier otro valor cae a undefined, y
// provisionUser()/handle_new_user() lo resuelven a 'es' por defecto.
it("propaga language cuando es un idioma soportado", async () => {
  await handleExternalRegister(request({ body: JSON.stringify({ ...VALID_BODY, language: "en" }) }));

  expect(provisionUser).toHaveBeenCalledWith(expect.objectContaining({ language: "en" }));
});

it("ignora un language no soportado, cae a undefined", async () => {
  await handleExternalRegister(request({ body: JSON.stringify({ ...VALID_BODY, language: "fr" }) }));

  expect(provisionUser).toHaveBeenCalledWith(expect.objectContaining({ language: undefined }));
});

it("no expone user_id en la respuesta (a diferencia de create-user, aquí no hay superadmin al otro lado)", async () => {
  const result = await handleExternalRegister(request());

  expect(result.payload.user_id).toBeUndefined();
});

it("devuelve 500 si no hay ningún dataset activo disponible", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ fallbackDatasetResult: { data: [], error: null } }));

  const result = await handleExternalRegister(request());

  expect(provisionUser).not.toHaveBeenCalled();
  expect(result).toEqual({ status: 500, payload: { error: "No se pudo completar el registro. Inténtalo más tarde." } });
});

it("usa el dataset activo marcado is_default cuando existe, sin caer al de respaldo", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    defaultDatasetResult: { data: { key: "otro-dataset" }, error: null },
    fallbackDatasetResult: { data: [{ key: "ihasia" }], error: null },
  }));

  await handleExternalRegister(request());

  expect(provisionUser).toHaveBeenCalledWith(expect.objectContaining({ dataset_key: "otro-dataset" }));
});

it("propaga el error de provisionUser traducido con friendlyError", async () => {
  provisionUser.mockResolvedValue({ error: { message: "unknown setup dataset: x" } });

  const result = await handleExternalRegister(request());

  expect(result).toEqual({ status: 400, payload: { error: "unknown setup dataset: x" } });
});

it("email ya registrado: responde igual que un alta con éxito, sin revelar que la cuenta ya existía (anti-enumeración, ADR-0022)", async () => {
  provisionUser.mockResolvedValue({ error: { message: "A user with this email address has already been registered" } });

  const result = await handleExternalRegister(request());

  expect(result).toEqual({ status: 200, payload: { email_sent: true } });
});

it("incluye action_link en la respuesta si el email no se pudo enviar", async () => {
  provisionUser.mockResolvedValue({ user_id: "new-user-1", email_sent: false, email_error: "Configuración de email incompleta.", action_link: "https://app.example/activate?token=x" });

  const result = await handleExternalRegister(request());

  expect(result).toEqual({
    status: 200,
    payload: { email_sent: false, email_error: "Configuración de email incompleta.", action_link: "https://app.example/activate?token=x" },
  });
});

// Release V1, 2026-09-02 — enlace de invitación: permite registrarse
// aunque allow_external_registration esté desactivado, con prioridad
// total sobre ese criterio general.
describe("invite_token (enlace de invitación)", () => {
  const FUTURE = new Date(Date.now() + 60_000).toISOString();
  const PAST = new Date(Date.now() - 60_000).toISOString();
  const TOKEN = "11111111-1111-1111-1111-111111111111";

  function requestWithInvite(overrides = {}) {
    return request({ body: JSON.stringify({ ...VALID_BODY, invite_token: TOKEN, ...overrides }) });
  }

  it("token válido: provisiona aunque el registro externo esté desactivado, sin comprobar allow_external_registration", async () => {
    const client = makeClient({
      configResult: { data: { allow_external_registration: false }, error: null },
      invitationLookupResult: { data: { token: TOKEN, expires_at: FUTURE, used_at: null }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);

    const result = await handleExternalRegister(requestWithInvite());

    expect(provisionUser).toHaveBeenCalledWith(expect.objectContaining({ reason: "external_signup" }));
    expect(result).toEqual({ status: 200, payload: { email_sent: true } });
  });

  it("marca la invitación como usada tras un alta con éxito", async () => {
    const client = makeClient({
      invitationLookupResult: { data: { token: TOKEN, expires_at: FUTURE, used_at: null }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);

    await handleExternalRegister(requestWithInvite());

    expect(client.invitationUpdate).toHaveBeenCalledWith({ used_at: expect.any(String) });
    expect(client.invitationUpdateEq).toHaveBeenCalledWith("token", TOKEN);
  });

  it("token inexistente: 403 con el mensaje de enlace de invitación inválido, sin llamar a provisionUser", async () => {
    getServiceRoleClient.mockReturnValue(makeClient({ invitationLookupResult: { data: null, error: null } }));

    const result = await handleExternalRegister(requestWithInvite());

    expect(provisionUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 403,
      payload: { error: "Este enlace de invitación ya no es válido. Puede que haya caducado o que ya se haya usado. Pide uno nuevo a quien te invitó." },
    });
  });

  it("token caducado: 403, sin llamar a provisionUser", async () => {
    getServiceRoleClient.mockReturnValue(makeClient({
      invitationLookupResult: { data: { token: TOKEN, expires_at: PAST, used_at: null }, error: null },
    }));

    const result = await handleExternalRegister(requestWithInvite());

    expect(provisionUser).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
  });

  it("token ya usado: 403, sin llamar a provisionUser", async () => {
    getServiceRoleClient.mockReturnValue(makeClient({
      invitationLookupResult: { data: { token: TOKEN, expires_at: FUTURE, used_at: "2026-09-01T00:00:00Z" }, error: null },
    }));

    const result = await handleExternalRegister(requestWithInvite());

    expect(provisionUser).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
  });

  it("email ya registrado con invite_token: no marca la invitación como usada (nada nuevo se creó)", async () => {
    const client = makeClient({
      invitationLookupResult: { data: { token: TOKEN, expires_at: FUTURE, used_at: null }, error: null },
    });
    getServiceRoleClient.mockReturnValue(client);
    provisionUser.mockResolvedValue({ error: { message: "A user with this email address has already been registered" } });

    const result = await handleExternalRegister(requestWithInvite());

    expect(result).toEqual({ status: 200, payload: { email_sent: true } });
    expect(client.invitationUpdate).not.toHaveBeenCalled();
  });
});
