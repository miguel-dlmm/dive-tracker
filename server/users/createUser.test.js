vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  isSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

vi.mock("../email/sendWelcomeEmail.js", () => ({
  sendWelcomeEmail: vi.fn(),
}));

import { handleCreateUser } from "./createUser.js";
import { getServiceRoleClient, verifyCaller, isSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { sendWelcomeEmail } from "../email/sendWelcomeEmail.js";

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
  let generateLink;

  beforeEach(() => {
    createUser = vi.fn();
    generateLink = vi.fn().mockResolvedValue({
      data: { properties: { action_link: "https://example.supabase.co/verify?token=abc" } },
      error: null,
    });
    getServiceRoleClient.mockReturnValue({ auth: { admin: { createUser, generateLink } } });
    sendWelcomeEmail.mockReset();
    sendWelcomeEmail.mockResolvedValue({ sent: true });
  });

  it("crea el usuario y devuelve { user_id, email_sent: true } cuando todo va bien", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    const result = await handleCreateUser(request());

    expect(result).toEqual({ status: 200, payload: { user_id: "new-user-1", email_sent: true } });
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

  it("genera un enlace de recovery de un solo uso y lo pasa al email de bienvenida", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    await handleCreateUser(request());

    expect(generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: VALID_BODY.email,
      options: { redirectTo: process.env.APP_URL },
    });
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      email: VALID_BODY.email,
      firstName: VALID_BODY.first_name,
      nickname: VALID_BODY.nickname,
      actionLink: "https://example.supabase.co/verify?token=abc",
    });
  });

  it("no bloquea la creación si falla la generación del enlace — la cuenta ya existe", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    generateLink.mockResolvedValue({ data: null, error: { message: "rate limit" } });

    const result = await handleCreateUser(request());

    expect(result).toEqual({
      status: 200,
      payload: { user_id: "new-user-1", email_sent: false, email_error: "No se pudo generar el enlace de acceso." },
    });
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("no bloquea la creación si falla el envío del email — la cuenta ya existe", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    sendWelcomeEmail.mockResolvedValue({ sent: false, error: "No se pudo enviar el email de bienvenida." });

    const result = await handleCreateUser(request());

    expect(result).toEqual({
      status: 200,
      payload: { user_id: "new-user-1", email_sent: false, email_error: "No se pudo enviar el email de bienvenida." },
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
