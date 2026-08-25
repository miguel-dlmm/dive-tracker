vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  isSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleUpdateAdminStatus } from "./updateAdminStatus.js";
import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";
const TARGET_ID = "target-1";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify({ target_user_id: TARGET_ID, is_admin: true }),
    ...overrides,
  };
}

function makeClient({ lookupResult, updateResult = { error: null } }) {
  const maybeSingle = vi.fn().mockResolvedValue(lookupResult);
  const eqForSelect = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: eqForSelect });
  const eqForUpdate = vi.fn().mockResolvedValue(updateResult);
  const update = vi.fn().mockReturnValue({ eq: eqForUpdate });
  const from = vi.fn().mockReturnValue({ select, update });
  return { from, select, update, eqForSelect, eqForUpdate };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  isSuperadmin.mockResolvedValue(true);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleUpdateAdminStatus(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleUpdateAdminStatus(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 400 si el cuerpo no es JSON válido", async () => {
  const result = await handleUpdateAdminStatus(request({ body: "{not json" }));

  expect(result).toEqual({ status: 400, payload: { error: "Cuerpo de la petición inválido." } });
});

it("devuelve 400 si falta target_user_id", async () => {
  const result = await handleUpdateAdminStatus(
    request({ body: JSON.stringify({ is_admin: true }) })
  );

  expect(result).toEqual({
    status: 400,
    payload: { error: "Faltan target_user_id o is_admin (booleano)." },
  });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 400 si is_admin no es booleano", async () => {
  const result = await handleUpdateAdminStatus(
    request({ body: JSON.stringify({ target_user_id: TARGET_ID, is_admin: "true" }) })
  );

  expect(result).toEqual({
    status: 400,
    payload: { error: "Faltan target_user_id o is_admin (booleano)." },
  });
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin consultar la cuenta objetivo", async () => {
  isSuperadmin.mockResolvedValue(false);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({
    status: 403,
    payload: { error: "Solo un superadmin puede cambiar el rol de admin de otra cuenta." },
  });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("rechaza que el superadmin se cambie el rol a sí mismo, sin consultar la base de datos", async () => {
  const result = await handleUpdateAdminStatus(
    request({ body: JSON.stringify({ target_user_id: CALLER_ID, is_admin: true }) })
  );

  expect(result).toEqual({
    status: 400,
    payload: { error: "No puedes cambiar tu propio rol de admin desde aquí." },
  });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("devuelve 500 si falla la comprobación de la cuenta objetivo", async () => {
  const client = makeClient({ lookupResult: { data: null, error: { message: "boom" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar la cuenta objetivo." } });
});

it("devuelve 404 si la cuenta objetivo no existe", async () => {
  const client = makeClient({ lookupResult: { data: null, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({ status: 404, payload: { error: "No existe ningún usuario con ese id." } });
});

it("rechaza cambiar el rol de admin de una cuenta superadmin", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: true }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({
    status: 400,
    payload: { error: "No se puede cambiar el rol de admin de una cuenta superadmin." },
  });
  expect(client.update).not.toHaveBeenCalled();
});

it("actualiza is_admin y devuelve exactamente { user_id, is_admin }", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({ status: 200, payload: { user_id: TARGET_ID, is_admin: true } });
  expect(client.update).toHaveBeenCalledWith({ is_admin: true });
  expect(client.eqForUpdate).toHaveBeenCalledWith("user_id", TARGET_ID);
});

it("no permite inyectar is_superadmin desde el body", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  await handleUpdateAdminStatus(
    request({ body: JSON.stringify({ target_user_id: TARGET_ID, is_admin: true, is_superadmin: true }) })
  );

  expect(client.update).toHaveBeenCalledWith({ is_admin: true });
});

it("propaga el error de Supabase si falla la actualización", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    updateResult: { error: { message: "connection lost" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleUpdateAdminStatus(request());

  expect(result).toEqual({ status: 400, payload: { error: "connection lost" } });
});
