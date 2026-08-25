vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  isSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

import { handleCreateUser } from "./createUser.js";
import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";

const VALID_BODY = {
  email: "diver@example.com",
  password: "s3cret!",
  first_name: "Ada",
  last_name: "Lovelace",
  nickname: "ada",
};

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify(VALID_BODY),
    ...overrides,
  };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: "caller-1" });
  isSuperadmin.mockResolvedValue(true);
  getServiceRoleClient.mockReset();
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleCreateUser(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleCreateUser(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleCreateUser(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 400 si el cuerpo no es JSON válido", async () => {
  const result = await handleCreateUser(request({ body: "{not json" }));

  expect(result).toEqual({ status: 400, payload: { error: "Cuerpo de la petición inválido." } });
});

it.each(["email", "password", "nickname"])("devuelve 400 si falta el campo %s", async (field) => {
  const body = { ...VALID_BODY };
  delete body[field];

  const result = await handleCreateUser(request({ body: JSON.stringify(body) }));

  expect(result).toEqual({
    status: 400,
    payload: { error: "Email, nickname y contraseña son obligatorios." },
  });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleCreateUser(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin tocar Supabase Admin API", async () => {
  isSuperadmin.mockResolvedValue(false);

  const result = await handleCreateUser(request());

  expect(result).toEqual({
    status: 403,
    payload: { error: "Solo un superadmin puede crear usuarios." },
  });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

describe("con permisos válidos", () => {
  let createUser;

  beforeEach(() => {
    createUser = vi.fn();
    getServiceRoleClient.mockReturnValue({ auth: { admin: { createUser } } });
  });

  it("crea el usuario y devuelve exactamente { user_id }", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    const result = await handleCreateUser(request());

    expect(result).toEqual({ status: 200, payload: { user_id: "new-user-1" } });
  });

  it("envía a Supabase solo los campos esperados, ignorando is_admin/is_superadmin del body", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    const body = { ...VALID_BODY, is_admin: true, is_superadmin: true };

    await handleCreateUser(request({ body: JSON.stringify(body) }));

    expect(createUser).toHaveBeenCalledWith({
      email: VALID_BODY.email,
      password: VALID_BODY.password,
      email_confirm: true,
      user_metadata: {
        first_name: VALID_BODY.first_name,
        last_name: VALID_BODY.last_name,
        nickname: VALID_BODY.nickname,
      },
    });
  });

  it("traduce el error de nickname duplicado a un mensaje legible, sin exponer el detalle de Postgres", async () => {
    createUser.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "profiles_nickname_lower_key"' },
    });

    const result = await handleCreateUser(request());

    expect(result).toEqual({ status: 400, payload: { error: "Ese nickname ya está en uso." } });
  });

  it("traduce el error de nickname con @ a un mensaje legible", async () => {
    createUser.mockResolvedValue({
      data: null,
      error: { message: 'new row for relation "profiles" violates check constraint "profiles_nickname_no_at"' },
    });

    const result = await handleCreateUser(request());

    expect(result).toEqual({ status: 400, payload: { error: 'El nickname no puede contener "@".' } });
  });

  it("propaga cualquier otro error de Supabase tal cual", async () => {
    createUser.mockResolvedValue({ data: null, error: { message: "Email rate limit exceeded" } });

    const result = await handleCreateUser(request());

    expect(result).toEqual({ status: 400, payload: { error: "Email rate limit exceeded" } });
  });
});
