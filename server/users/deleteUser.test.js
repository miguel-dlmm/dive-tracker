vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  isSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleDeleteUser } from "./deleteUser.js";
import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";
const TARGET_ID = "target-1";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify({ target_user_id: TARGET_ID }),
    ...overrides,
  };
}

function makeClient({ lookupResult, deleteResult = { error: null } }) {
  const maybeSingle = vi.fn().mockResolvedValue(lookupResult);
  const eqForSelect = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: eqForSelect });
  const from = vi.fn().mockReturnValue({ select });
  const deleteUser = vi.fn().mockResolvedValue(deleteResult);
  return { from, select, eqForSelect, auth: { admin: { deleteUser } } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  isSuperadmin.mockResolvedValue(true);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleDeleteUser(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleDeleteUser(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 400 si el cuerpo no es JSON válido", async () => {
  const result = await handleDeleteUser(request({ body: "{not json" }));

  expect(result).toEqual({ status: 400, payload: { error: "Cuerpo de la petición inválido." } });
});

it("devuelve 400 si falta target_user_id", async () => {
  const result = await handleDeleteUser(request({ body: JSON.stringify({}) }));

  expect(result).toEqual({ status: 400, payload: { error: "Falta target_user_id." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin consultar la cuenta objetivo", async () => {
  isSuperadmin.mockResolvedValue(false);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un superadmin puede eliminar usuarios." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("rechaza que el superadmin se elimine a sí mismo, sin consultar la base de datos", async () => {
  const result = await handleDeleteUser(request({ body: JSON.stringify({ target_user_id: CALLER_ID }) }));

  expect(result).toEqual({ status: 400, payload: { error: "No puedes eliminar tu propia cuenta desde aquí." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("devuelve 500 si falla la comprobación de la cuenta objetivo", async () => {
  const client = makeClient({ lookupResult: { data: null, error: { message: "boom" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar la cuenta objetivo." } });
});

it("devuelve 404 si la cuenta objetivo no existe", async () => {
  const client = makeClient({ lookupResult: { data: null, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 404, payload: { error: "No existe ningún usuario con ese id." } });
});

it("rechaza eliminar una cuenta superadmin", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: true }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 400, payload: { error: "No se puede eliminar una cuenta superadmin." } });
  expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
});

it("elimina la cuenta y devuelve exactamente { user_id, deleted }", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 200, payload: { user_id: TARGET_ID, deleted: true } });
  expect(client.auth.admin.deleteUser).toHaveBeenCalledWith(TARGET_ID);
});

it("propaga el error de Supabase si falla el borrado", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    deleteResult: { error: { message: "connection lost" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleDeleteUser(request());

  expect(result).toEqual({ status: 400, payload: { error: "connection lost" } });
});
