vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleDeleteOwnAccount } from "./deleteOwnAccount.js";
import { getServiceRoleClient, verifyCaller, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";

function request(overrides = {}) {
  return { method: "POST", headers: { authorization: "Bearer valid-token" }, ...overrides };
}

function makeClient({ profileResult, deleteResult = { error: null } }) {
  const maybeSingle = vi.fn().mockResolvedValue(profileResult);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const deleteUser = vi.fn().mockResolvedValue(deleteResult);
  return { from, select, eq, auth: { admin: { deleteUser } } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleDeleteOwnAccount(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleDeleteOwnAccount(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleDeleteOwnAccount(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleDeleteOwnAccount(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("borra al propio caller (nunca recibe ni usa ningún target_user_id del body)", async () => {
  const client = makeClient({ profileResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteOwnAccount(request());

  expect(client.eq).toHaveBeenCalledWith("user_id", CALLER_ID);
  expect(client.auth.admin.deleteUser).toHaveBeenCalledWith(CALLER_ID);
  expect(result).toEqual({ status: 200, payload: { deleted: true } });
});

it("una cuenta superadmin no puede eliminarse a sí misma por esta vía", async () => {
  const client = makeClient({ profileResult: { data: { is_superadmin: true }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteOwnAccount(request());

  expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
  expect(result.status).toBe(400);
  expect(result.payload.error).toMatch(/superadmin/);
});

it("devuelve 500 si no se puede comprobar el perfil del caller", async () => {
  const client = makeClient({ profileResult: { data: null, error: { message: "boom" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteOwnAccount(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar tu cuenta." } });
  expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
});

it("propaga un error genérico si falla el borrado en Supabase Auth", async () => {
  const client = makeClient({ profileResult: { data: { is_superadmin: false }, error: null }, deleteResult: { error: { message: "internal" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteOwnAccount(request());

  expect(result).toEqual({ status: 400, payload: { error: "No se pudo eliminar la cuenta. Inténtalo de nuevo." } });
});
