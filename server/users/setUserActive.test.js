vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  isSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleSetUserActive } from "./setUserActive.js";
import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

const CALLER_ID = "caller-1";
const TARGET_ID = "target-1";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify({ target_user_id: TARGET_ID, active: false }),
    ...overrides,
  };
}

function makeClient({ lookupResult, updateResult = { error: null } }) {
  const maybeSingle = vi.fn().mockResolvedValue(lookupResult);
  const eqForSelect = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: eqForSelect });
  const from = vi.fn().mockReturnValue({ select });
  const updateUserById = vi.fn().mockResolvedValue(updateResult);
  return { from, select, eqForSelect, auth: { admin: { updateUserById } } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  isSuperadmin.mockResolvedValue(true);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleSetUserActive(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleSetUserActive(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 400 si el cuerpo no es JSON válido", async () => {
  const result = await handleSetUserActive(request({ body: "{not json" }));

  expect(result).toEqual({ status: 400, payload: { error: "Cuerpo de la petición inválido." } });
});

it("devuelve 400 si falta target_user_id o active no es booleano", async () => {
  const result = await handleSetUserActive(request({ body: JSON.stringify({ target_user_id: TARGET_ID }) }));

  expect(result).toEqual({ status: 400, payload: { error: "Faltan target_user_id o active (booleano)." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin consultar la cuenta objetivo", async () => {
  isSuperadmin.mockResolvedValue(false);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un superadmin puede activar o desactivar usuarios." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("rechaza que el superadmin se desactive a sí mismo, sin consultar la base de datos", async () => {
  const result = await handleSetUserActive(
    request({ body: JSON.stringify({ target_user_id: CALLER_ID, active: false }) })
  );

  expect(result).toEqual({ status: 400, payload: { error: "No puedes desactivar tu propia cuenta desde aquí." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("devuelve 500 si falla la comprobación de la cuenta objetivo", async () => {
  const client = makeClient({ lookupResult: { data: null, error: { message: "boom" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar la cuenta objetivo." } });
});

it("devuelve 404 si la cuenta objetivo no existe", async () => {
  const client = makeClient({ lookupResult: { data: null, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 404, payload: { error: "No existe ningún usuario con ese id." } });
});

it("rechaza desactivar una cuenta superadmin", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: true }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 400, payload: { error: "No se puede desactivar una cuenta superadmin." } });
  expect(client.auth.admin.updateUserById).not.toHaveBeenCalled();
});

it("desactiva con ban_duration de larga duración y devuelve { user_id, active: false }", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleSetUserActive(request({ body: JSON.stringify({ target_user_id: TARGET_ID, active: false }) }));

  expect(result).toEqual({ status: 200, payload: { user_id: TARGET_ID, active: false } });
  expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: "876000h" });
});

it("reactiva con ban_duration 'none' y devuelve { user_id, active: true }", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleSetUserActive(request({ body: JSON.stringify({ target_user_id: TARGET_ID, active: true }) }));

  expect(result).toEqual({ status: 200, payload: { user_id: TARGET_ID, active: true } });
  expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: "none" });
});

it("propaga el error de Supabase si falla la actualización", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    updateResult: { error: { message: "connection lost" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleSetUserActive(request());

  expect(result).toEqual({ status: 400, payload: { error: "connection lost" } });
});
