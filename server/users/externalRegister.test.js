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

function makeClient({ configResult = { data: { allow_external_registration: true }, error: null }, datasetsResult = { data: [{ key: "ihasia" }], error: null } } = {}) {
  const configMaybeSingle = vi.fn().mockResolvedValue(configResult);
  const configEq = vi.fn().mockReturnValue({ maybeSingle: configMaybeSingle });
  const configSelect = vi.fn().mockReturnValue({ eq: configEq });

  const datasetsLimit = vi.fn().mockResolvedValue(datasetsResult);
  const datasetsOrder = vi.fn().mockReturnValue({ limit: datasetsLimit });
  const datasetsSelect = vi.fn().mockReturnValue({ order: datasetsOrder });

  const from = vi.fn((table) => {
    if (table === "app_config") return { select: configSelect };
    if (table === "setup_datasets") return { select: datasetsSelect };
    throw new Error(`tabla inesperada en el mock: ${table}`);
  });
  return { from };
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
  });
  expect(result).toEqual({ status: 200, payload: { email_sent: true } });
});

it("no expone user_id en la respuesta (a diferencia de create-user, aquí no hay superadmin al otro lado)", async () => {
  const result = await handleExternalRegister(request());

  expect(result.payload.user_id).toBeUndefined();
});

it("devuelve 500 si no hay ningún dataset inicial disponible", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ datasetsResult: { data: [], error: null } }));

  const result = await handleExternalRegister(request());

  expect(provisionUser).not.toHaveBeenCalled();
  expect(result).toEqual({ status: 500, payload: { error: "No se pudo completar el registro. Inténtalo más tarde." } });
});

it("propaga el error de provisionUser traducido con friendlyError", async () => {
  provisionUser.mockResolvedValue({ error: { message: "unknown setup dataset: x" } });

  const result = await handleExternalRegister(request());

  expect(result).toEqual({ status: 400, payload: { error: "unknown setup dataset: x" } });
});

it("incluye action_link en la respuesta si el email no se pudo enviar", async () => {
  provisionUser.mockResolvedValue({ user_id: "new-user-1", email_sent: false, email_error: "Configuración de email incompleta.", action_link: "https://app.example/activate?token=x" });

  const result = await handleExternalRegister(request());

  expect(result).toEqual({
    status: 200,
    payload: { email_sent: false, email_error: "Configuración de email incompleta.", action_link: "https://app.example/activate?token=x" },
  });
});
