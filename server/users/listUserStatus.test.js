vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  isAdmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleListUserStatus } from "./listUserStatus.js";
import { getServiceRoleClient, verifyCaller, isAdmin, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: "{}",
    ...overrides,
  };
}

function makeClient(listUsersResult) {
  const listUsers = vi.fn().mockResolvedValue(listUsersResult);
  return { auth: { admin: { listUsers } } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  isAdmin.mockResolvedValue(true);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleListUserStatus(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleListUserStatus(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es admin ni superadmin", async () => {
  isAdmin.mockResolvedValue(false);

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un admin puede consultar el estado de las cuentas." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("devuelve 500 si falla la consulta a Supabase", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ data: null, error: { message: "boom" } }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo consultar el estado de las cuentas." } });
});

it("marca como activo (true) a quien no tiene banned_until", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: null }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 200, payload: { active: { u1: true } } });
});

it("marca como inactivo (false) a quien tiene banned_until en el futuro", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: "2126-08-05T00:00:00.000Z" }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 200, payload: { active: { u1: false } } });
});

it("marca como activo (true) a quien tiene banned_until ya expirado en el pasado", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({
    data: { users: [{ id: "u1", banned_until: "2000-01-01T00:00:00.000Z" }] },
    error: null,
  }));

  const result = await handleListUserStatus(request());

  expect(result).toEqual({ status: 200, payload: { active: { u1: true } } });
});
