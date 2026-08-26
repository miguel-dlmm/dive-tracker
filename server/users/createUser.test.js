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
  first_name: "Ada",
  last_name: "Lovelace",
  nickname: "ada",
  dataset_key: "ihasia",
};

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify(VALID_BODY),
    ...overrides,
  };
}

const APP_URL = "https://app.oceanpulse.example";

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: "caller-1" });
  isSuperadmin.mockResolvedValue(true);
  getServiceRoleClient.mockReset();
  process.env.APP_URL = APP_URL;
});

afterEach(() => {
  delete process.env.APP_URL;
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

it.each(["email", "nickname", "dataset_key"])("devuelve 400 si falta el campo %s", async (field) => {
  const body = { ...VALID_BODY };
  delete body[field];

  const result = await handleCreateUser(request({ body: JSON.stringify(body) }));

  expect(result).toEqual({
    status: 400,
    payload: { error: "Email, nickname y dataset inicial son obligatorios." },
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

// URL de activación que buildActivationUrl() (createUser.js) debería
// construir para el hashed_token de generateLink() de más abajo — se
// recalcula con las mismas APIs (URL/URLSearchParams) en vez de escribirla
// a mano, para no arrastrar un error de escape/orden si el helper cambia.
function expectedActivationLink({ tokenHash, email }) {
  const url = new URL(APP_URL);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("email", email);
  return url.toString();
}

describe("con permisos válidos", () => {
  let createUser;
  let generateLink;
  let deleteUser;
  let rpc;

  beforeEach(() => {
    createUser = vi.fn();
    generateLink = vi.fn().mockResolvedValue({
      data: { properties: { hashed_token: "hashed-token-abc" } },
      error: null,
    });
    deleteUser = vi.fn().mockResolvedValue({ error: null });
    rpc = vi.fn().mockResolvedValue({ error: null });
    getServiceRoleClient.mockReturnValue({ auth: { admin: { createUser, generateLink, deleteUser } }, rpc });
    sendWelcomeEmail.mockReset();
    sendWelcomeEmail.mockResolvedValue({ sent: true });
  });

  it("crea el usuario y devuelve exactamente { user_id, email_sent: true } cuando el email se envía bien, sin exponer el enlace", async () => {
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
      email_confirm: true,
      user_metadata: {
        first_name: VALID_BODY.first_name,
        last_name: VALID_BODY.last_name,
        nickname: VALID_BODY.nickname,
      },
    });
  });

  it("clona el dataset elegido en el usuario recién creado", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    await handleCreateUser(request());

    expect(rpc).toHaveBeenCalledWith("clone_setup_dataset", {
      p_dataset_key: VALID_BODY.dataset_key,
      p_target_user_id: "new-user-1",
    });
  });

  it("revierte el alta si falla el clonado del dataset, sin enviar email de bienvenida", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    rpc.mockResolvedValue({ error: { message: "unknown setup dataset: ihasia" } });

    const result = await handleCreateUser(request());

    expect(deleteUser).toHaveBeenCalledWith("new-user-1");
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 400,
      payload: { error: "El dataset seleccionado ya no existe. Recarga la página e inténtalo de nuevo." },
    });
  });

  it("genera un enlace de recovery de un solo uso con el email como destinatario", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    await handleCreateUser(request());

    expect(generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: VALID_BODY.email,
      options: { redirectTo: process.env.APP_URL },
    });
  });

  it("construye la URL de activación propia (no el action_link de Supabase) y se la pasa al email de bienvenida", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    await handleCreateUser(request());

    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    const { actionLink } = sendWelcomeEmail.mock.calls[0][0];
    const url = new URL(actionLink);

    expect(url.origin).toBe(new URL(APP_URL).origin);
    expect(url.searchParams.get("token_hash")).toBe("hashed-token-abc");
    expect(url.searchParams.get("type")).toBe("recovery");
    expect(url.searchParams.get("email")).toBe(VALID_BODY.email);
    expect(sendWelcomeEmail).toHaveBeenCalledWith({
      email: VALID_BODY.email,
      firstName: VALID_BODY.first_name,
      nickname: VALID_BODY.nickname,
      actionLink: expectedActivationLink({ tokenHash: "hashed-token-abc", email: VALID_BODY.email }),
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

  it("no bloquea la creación si falta APP_URL — no hay base para construir el enlace de activación", async () => {
    delete process.env.APP_URL;
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });

    const result = await handleCreateUser(request());

    expect(result).toEqual({
      status: 200,
      payload: { user_id: "new-user-1", email_sent: false, email_error: "No se pudo generar el enlace de acceso." },
    });
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("no bloquea la creación si generateLink no devuelve hashed_token", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    generateLink.mockResolvedValue({ data: { properties: {} }, error: null });

    const result = await handleCreateUser(request());

    expect(result).toEqual({
      status: 200,
      payload: { user_id: "new-user-1", email_sent: false, email_error: "No se pudo generar el enlace de acceso." },
    });
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it("no bloquea la creación si falla el envío del email — la cuenta ya existe, y devuelve la URL de activación igualmente para probar el flujo a mano", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    sendWelcomeEmail.mockResolvedValue({ sent: false, error: "No se pudo enviar el email de bienvenida." });

    const result = await handleCreateUser(request());

    expect(result).toEqual({
      status: 200,
      payload: {
        user_id: "new-user-1",
        email_sent: false,
        email_error: "No se pudo enviar el email de bienvenida.",
        action_link: expectedActivationLink({ tokenHash: "hashed-token-abc", email: VALID_BODY.email }),
      },
    });
  });

  it("no bloquea la creación ni deja email_sent:true si sendWelcomeEmail lanza una excepción inesperada", async () => {
    createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
    sendWelcomeEmail.mockRejectedValue(new Error("boom"));

    const result = await handleCreateUser(request());

    expect(result).toEqual({
      status: 200,
      payload: {
        user_id: "new-user-1",
        email_sent: false,
        email_error: "No se pudo enviar el email de bienvenida.",
        action_link: expectedActivationLink({ tokenHash: "hashed-token-abc", email: VALID_BODY.email }),
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
