vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  verifyCaller: vi.fn(),
  requireSuperadmin: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

vi.mock("./activationLink.js", () => ({
  generateActivationLink: vi.fn(),
}));

vi.mock("../email/EmailService.js", () => ({
  sendActivationEmail: vi.fn(),
}));

import { handleRegeneratePassword } from "./regeneratePassword.js";
import { getServiceRoleClient, verifyCaller, requireSuperadmin, hasServerConfig } from "../supabaseAdmin.js";
import { generateActivationLink } from "./activationLink.js";
import { sendActivationEmail } from "../email/EmailService.js";

const CALLER_ID = "caller-1";
const TARGET_ID = "target-1";
const TARGET_EMAIL = "target@example.com";

function request(overrides = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: JSON.stringify({ target_user_id: TARGET_ID }),
    ...overrides,
  };
}

function makeClient({
  lookupResult,
  authUserResult = { data: { user: { email: TARGET_EMAIL } }, error: null },
  updateUserResult = { error: null },
  profileUpdateResult = { error: null },
}) {
  const maybeSingle = vi.fn().mockResolvedValue(lookupResult);
  const eqForSelect = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: eqForSelect });
  const eqForUpdate = vi.fn().mockResolvedValue(profileUpdateResult);
  const update = vi.fn().mockReturnValue({ eq: eqForUpdate });
  const from = vi.fn().mockReturnValue({ select, update });
  const getUserById = vi.fn().mockResolvedValue(authUserResult);
  const updateUserById = vi.fn().mockResolvedValue(updateUserResult);
  return { from, select, update, eqForSelect, eqForUpdate, auth: { admin: { getUserById, updateUserById } } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  requireSuperadmin.mockResolvedValue(null);
  getServiceRoleClient.mockReset();
  generateActivationLink.mockReset();
  generateActivationLink.mockResolvedValue({ activationLink: "https://app.example/activate?token_hash=xyz", error: null });
  sendActivationEmail.mockReset();
  sendActivationEmail.mockResolvedValue({ sent: false, error: "Configuración de email incompleta." });
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleRegeneratePassword(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 400 si falta target_user_id", async () => {
  const result = await handleRegeneratePassword(request({ body: "{}" }));

  expect(result).toEqual({ status: 400, payload: { error: "Falta target_user_id." } });
});

it("devuelve 403 si quien llama no es superadmin", async () => {
  requireSuperadmin.mockResolvedValue({ status: 403, payload: { error: "Solo un superadmin puede regenerar la contraseña de otra cuenta." } });

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un superadmin puede regenerar la contraseña de otra cuenta." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("propaga tal cual el resultado de requireSuperadmin si no puede verificarse el permiso (500, no 403)", async () => {
  requireSuperadmin.mockResolvedValue({ status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } });

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } });
});

it("devuelve 404 si la cuenta objetivo no existe", async () => {
  const client = makeClient({ lookupResult: { data: null, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 404, payload: { error: "No existe ningún usuario con ese id." } });
});

it("rechaza regenerar la contraseña de una cuenta superadmin", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: true }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 400, payload: { error: "No se puede regenerar la contraseña de una cuenta superadmin." } });
  expect(client.auth.admin.updateUserById).not.toHaveBeenCalled();
});

it("sobrescribe la contraseña con una cadena aleatoria de 64 caracteres hex, quita el baneo, limpia activated_at y genera un enlace nuevo", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegeneratePassword(request());

  expect(client.auth.admin.updateUserById).toHaveBeenCalledTimes(1);
  const [calledId, calledPayload] = client.auth.admin.updateUserById.mock.calls[0];
  expect(calledId).toBe(TARGET_ID);
  expect(calledPayload.ban_duration).toBe("none");
  expect(calledPayload.password).toMatch(/^[0-9a-f]{64}$/);

  expect(client.update).toHaveBeenCalledWith({ activated_at: null });
  expect(client.eqForUpdate).toHaveBeenCalledWith("user_id", TARGET_ID);
  expect(generateActivationLink).toHaveBeenCalledWith(TARGET_EMAIL);
  expect(result).toEqual({
    status: 200,
    payload: { user_id: TARGET_ID, email_sent: false, action_link: "https://app.example/activate?token_hash=xyz" },
  });
});

it("envía el email de contraseña regenerada con los datos del perfil objetivo y no devuelve action_link si se envía bien", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false, first_name: "Ana", nickname: "ana" }, error: null } });
  getServiceRoleClient.mockReturnValue(client);
  sendActivationEmail.mockResolvedValue({ sent: true });

  const result = await handleRegeneratePassword(request());

  expect(sendActivationEmail).toHaveBeenCalledWith({
    email: TARGET_EMAIL,
    firstName: "Ana",
    nickname: "ana",
    actionLink: "https://app.example/activate?token_hash=xyz",
    reason: "password_reset",
  });
  expect(result).toEqual({ status: 200, payload: { user_id: TARGET_ID, email_sent: true } });
});

it("genera una contraseña distinta en cada llamada", async () => {
  const client1 = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client1);
  await handleRegeneratePassword(request());
  const firstPassword = client1.auth.admin.updateUserById.mock.calls[0][1].password;

  const client2 = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client2);
  await handleRegeneratePassword(request());
  const secondPassword = client2.auth.admin.updateUserById.mock.calls[0][1].password;

  expect(firstPassword).not.toBe(secondPassword);
});

it("propaga el error de Supabase si falla actualizar la contraseña", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    updateUserResult: { error: { message: "connection lost" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 400, payload: { error: "connection lost" } });
  expect(generateActivationLink).not.toHaveBeenCalled();
});

it("no corta la respuesta si falla limpiar activated_at — la contraseña ya se invalidó", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    profileUpdateResult: { error: { message: "boom" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({
    status: 200,
    payload: { user_id: TARGET_ID, email_sent: false, action_link: "https://app.example/activate?token_hash=xyz" },
  });
});

it("devuelve 500 si falla la generación del enlace", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);
  generateActivationLink.mockResolvedValue({ activationLink: null, error: "No se pudo generar el enlace de activación." });

  const result = await handleRegeneratePassword(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo generar el enlace de activación." } });
});
