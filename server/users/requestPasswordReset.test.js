vi.mock("../supabaseAdmin.js", () => ({
  hasServerConfig: vi.fn(),
  getServiceRoleClient: vi.fn(),
}));

vi.mock("./activationLink.js", () => ({
  generateActivationLink: vi.fn(),
}));

vi.mock("../email/EmailService.js", () => ({
  sendActivationEmail: vi.fn(),
}));

import { handleRequestPasswordReset } from "./requestPasswordReset.js";
import { hasServerConfig, getServiceRoleClient } from "../supabaseAdmin.js";
import { generateActivationLink } from "./activationLink.js";
import { sendActivationEmail } from "../email/EmailService.js";

const EXISTING_EMAIL = "diver@example.com";
const EXISTING_USER = { id: "user-1", email: EXISTING_EMAIL };

function request(overrides = {}) {
  return {
    method: "POST",
    body: JSON.stringify({ email: EXISTING_EMAIL }),
    ...overrides,
  };
}

function makeClient({ listUsersResult = { data: { users: [EXISTING_USER] }, error: null }, profileResult = { data: { first_name: "Ada", nickname: "ada" }, error: null } } = {}) {
  const listUsers = vi.fn().mockResolvedValue(listUsersResult);
  const maybeSingle = vi.fn().mockResolvedValue(profileResult);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { auth: { admin: { listUsers } }, from };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  getServiceRoleClient.mockReturnValue(makeClient());
  generateActivationLink.mockReset();
  generateActivationLink.mockResolvedValue({ activationLink: "https://app.example/activate?token_hash=abc", error: null });
  sendActivationEmail.mockReset();
  sendActivationEmail.mockResolvedValue({ sent: true });
});

it("rechaza métodos distintos de POST", async () => {
  const result = await handleRequestPasswordReset(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
});

it("devuelve 400 si falta el email", async () => {
  const result = await handleRequestPasswordReset(request({ body: "{}" }));

  expect(result).toEqual({ status: 400, payload: { error: "Falta el email." } });
});

it("flujo correcto: cuenta existente, genera enlace y envía email con motivo password_reset_request", async () => {
  const result = await handleRequestPasswordReset(request());

  expect(generateActivationLink).toHaveBeenCalledWith(EXISTING_EMAIL, { flow: "recovery" });
  expect(sendActivationEmail).toHaveBeenCalledWith({
    email: EXISTING_EMAIL,
    firstName: "Ada",
    nickname: "ada",
    actionLink: "https://app.example/activate?token_hash=abc",
    reason: "password_reset_request",
  });
  expect(result).toEqual({ status: 200, payload: { ok: true } });
});

it("email inexistente: misma respuesta genérica, sin generar enlace ni enviar nada", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ listUsersResult: { data: { users: [] }, error: null } }));

  const result = await handleRequestPasswordReset(request({ body: JSON.stringify({ email: "nadie@example.com" }) }));

  expect(generateActivationLink).not.toHaveBeenCalled();
  expect(sendActivationEmail).not.toHaveBeenCalled();
  expect(result).toEqual({ status: 200, payload: { ok: true } });
});

it("nunca devuelve action_link en la respuesta, ni cuando el envío falla", async () => {
  sendActivationEmail.mockResolvedValue({ sent: false, error: "Configuración de email incompleta." });

  const result = await handleRequestPasswordReset(request());

  expect(result).toEqual({ status: 200, payload: { ok: true } });
  expect(result.payload.action_link).toBeUndefined();
});

it("proveedor de email caído (excepción inesperada): sigue devolviendo la respuesta genérica, no un error", async () => {
  sendActivationEmail.mockRejectedValue(new Error("Resend caído"));

  const result = await handleRequestPasswordReset(request());

  expect(result).toEqual({ status: 200, payload: { ok: true } });
});

it("fallo al generar el enlace: respuesta genérica igualmente, sin enviar email", async () => {
  generateActivationLink.mockResolvedValue({ activationLink: null, error: "No se pudo generar el enlace de activación." });

  const result = await handleRequestPasswordReset(request());

  expect(sendActivationEmail).not.toHaveBeenCalled();
  expect(result).toEqual({ status: 200, payload: { ok: true } });
});

it("fallo al listar usuarios: respuesta genérica, no un 500", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ listUsersResult: { data: null, error: { message: "boom" } } }));

  const result = await handleRequestPasswordReset(request());

  expect(result).toEqual({ status: 200, payload: { ok: true } });
});

it("configuración de servidor incompleta: respuesta genérica, no revela el problema", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleRequestPasswordReset(request());

  expect(result).toEqual({ status: 200, payload: { ok: true } });
  expect(generateActivationLink).not.toHaveBeenCalled();
});

it("no distingue mayúsculas/minúsculas al buscar el email", async () => {
  const result = await handleRequestPasswordReset(request({ body: JSON.stringify({ email: "DIVER@EXAMPLE.COM" }) }));

  expect(generateActivationLink).toHaveBeenCalledWith(EXISTING_EMAIL, { flow: "recovery" });
  expect(result).toEqual({ status: 200, payload: { ok: true } });
});
