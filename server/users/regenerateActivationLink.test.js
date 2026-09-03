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

import { handleRegenerateActivationLink } from "./regenerateActivationLink.js";
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
  unbanResult = { error: null },
  clearDeactivatedResult = { error: null },
  consentResult = { data: [], error: null },
}) {
  const maybeSingle = vi.fn().mockResolvedValue(lookupResult);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  // update() limpia deactivated_at (Bloque 11) — encadena a su propio eq(),
  // distinto del eq() de select() de arriba (ese sigue a maybeSingle(), este
  // resuelve directamente).
  const eqForUpdate = vi.fn().mockResolvedValue(clearDeactivatedResult);
  const update = vi.fn().mockReturnValue({ eq: eqForUpdate });
  // legal_consents: select().eq().limit() — cadena propia, tabla distinta
  // de profiles (ver comprobación de "ya aceptó antes" en el handler).
  const limit = vi.fn().mockResolvedValue(consentResult);
  const eqForConsent = vi.fn().mockReturnValue({ limit });
  const selectConsent = vi.fn().mockReturnValue({ eq: eqForConsent });
  const from = vi.fn((table) => (table === "legal_consents" ? { select: selectConsent } : { select, update }));
  const getUserById = vi.fn().mockResolvedValue(authUserResult);
  const updateUserById = vi.fn().mockResolvedValue(unbanResult);
  return { from, select, eq, update, eqForUpdate, selectConsent, eqForConsent, limit, auth: { admin: { getUserById, updateUserById } } };
}

beforeEach(() => {
  hasServerConfig.mockReturnValue(true);
  verifyCaller.mockResolvedValue({ id: CALLER_ID });
  requireSuperadmin.mockResolvedValue(null);
  getServiceRoleClient.mockReset();
  generateActivationLink.mockReset();
  generateActivationLink.mockResolvedValue({ activationLink: "https://app.example/activate?token_hash=abc", error: null });
  sendActivationEmail.mockReset();
  sendActivationEmail.mockResolvedValue({ sent: false, error: "Configuración de email incompleta." });
});

it("rechaza métodos distintos de POST sin tocar Supabase", async () => {
  const result = await handleRegenerateActivationLink(request({ method: "GET" }));

  expect(result).toEqual({ status: 405, payload: { error: "Method not allowed" } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 500 si falta configuración de servidor", async () => {
  hasServerConfig.mockReturnValue(false);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "Configuración del servidor incompleta." } });
});

it("devuelve 401 si no hay token de sesión", async () => {
  const result = await handleRegenerateActivationLink(request({ headers: {} }));

  expect(result).toEqual({ status: 401, payload: { error: "Falta el token de sesión." } });
});

it("devuelve 400 si falta target_user_id", async () => {
  const result = await handleRegenerateActivationLink(request({ body: "{}" }));

  expect(result).toEqual({ status: 400, payload: { error: "Falta target_user_id." } });
  expect(verifyCaller).not.toHaveBeenCalled();
});

it("devuelve 401 si el token no corresponde a una sesión válida", async () => {
  verifyCaller.mockResolvedValue(null);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 401, payload: { error: "Sesión inválida o caducada." } });
});

it("devuelve 403 si quien llama no es superadmin, sin consultar la cuenta objetivo", async () => {
  requireSuperadmin.mockResolvedValue({ status: 403, payload: { error: "Solo un superadmin puede activar cuentas o regenerar su enlace de acceso." } });

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 403, payload: { error: "Solo un superadmin puede activar cuentas o regenerar su enlace de acceso." } });
  expect(getServiceRoleClient).not.toHaveBeenCalled();
});

it("propaga tal cual el resultado de requireSuperadmin si no puede verificarse el permiso (500, no 403)", async () => {
  requireSuperadmin.mockResolvedValue({ status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } });

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar tus permisos. Inténtalo de nuevo en unos segundos." } });
});

it("devuelve 500 si falla la comprobación de la cuenta objetivo", async () => {
  const client = makeClient({ lookupResult: { data: null, error: { message: "boom" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo comprobar la cuenta objetivo." } });
});

it("devuelve 404 si la cuenta objetivo no existe", async () => {
  const client = makeClient({ lookupResult: { data: null, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 404, payload: { error: "No existe ningún usuario con ese id." } });
});

it("rechaza regenerar el enlace de una cuenta superadmin", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: true }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 400, payload: { error: "No se puede regenerar el enlace de una cuenta superadmin." } });
  expect(client.auth.admin.updateUserById).not.toHaveBeenCalled();
});

it("quita el baneo (ban_duration: none), genera un enlace nuevo y devuelve action_link si el email no se pudo enviar", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(client.auth.admin.updateUserById).toHaveBeenCalledWith(TARGET_ID, { ban_duration: "none" });
  expect(client.update).toHaveBeenCalledWith({ deactivated_at: null });
  expect(generateActivationLink).toHaveBeenCalledWith(TARGET_EMAIL, {});
  expect(result).toEqual({
    status: 200,
    payload: { user_id: TARGET_ID, email_sent: false, action_link: "https://app.example/activate?token_hash=abc" },
  });
});

it("pasa flow: recovery si la cuenta ya había aceptado las bases legales antes (reactivación real, no primer acceso)", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    consentResult: { data: [{ user_id: TARGET_ID }], error: null },
  });
  getServiceRoleClient.mockReturnValue(client);

  await handleRegenerateActivationLink(request());

  expect(generateActivationLink).toHaveBeenCalledWith(TARGET_EMAIL, { flow: "recovery" });
});

it("no pasa flow (pide bases legales) si la cuenta nunca las aceptó — sigue pendiente de su primer acceso", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    consentResult: { data: [], error: null },
  });
  getServiceRoleClient.mockReturnValue(client);

  await handleRegenerateActivationLink(request());

  expect(generateActivationLink).toHaveBeenCalledWith(TARGET_EMAIL, {});
});

it("si falla comprobar el consentimiento legal, no lo salta — trata la cuenta como si no hubiera aceptado", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    consentResult: { data: null, error: { message: "boom" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(generateActivationLink).toHaveBeenCalledWith(TARGET_EMAIL, {});
  expect(result.status).toBe(200);
});

it("envía el email de reactivación con los datos del perfil objetivo y no devuelve action_link si se envía bien", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false, first_name: "Ana", nickname: "ana" }, error: null } });
  getServiceRoleClient.mockReturnValue(client);
  sendActivationEmail.mockResolvedValue({ sent: true });

  const result = await handleRegenerateActivationLink(request());

  expect(sendActivationEmail).toHaveBeenCalledWith({
    email: TARGET_EMAIL,
    firstName: "Ana",
    nickname: "ana",
    actionLink: "https://app.example/activate?token_hash=abc",
    reason: "reactivation",
  });
  expect(result).toEqual({ status: 200, payload: { user_id: TARGET_ID, email_sent: true } });
});

it("devuelve 500 si no se pudo obtener el email de la cuenta objetivo", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    authUserResult: { data: null, error: { message: "not found" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo obtener el email de la cuenta objetivo." } });
});

it("propaga el error de Supabase si falla quitar el baneo", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    unbanResult: { error: { message: "connection lost" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 400, payload: { error: "connection lost" } });
  expect(generateActivationLink).not.toHaveBeenCalled();
});

it("no bloquea la respuesta si falla limpiar deactivated_at — el desbaneo (lo importante) ya se aplicó", async () => {
  const client = makeClient({
    lookupResult: { data: { is_superadmin: false }, error: null },
    clearDeactivatedResult: { error: { message: "boom" } },
  });
  getServiceRoleClient.mockReturnValue(client);

  const result = await handleRegenerateActivationLink(request());

  expect(result.status).toBe(200);
});

it("devuelve 500 si falla la generación del enlace", async () => {
  const client = makeClient({ lookupResult: { data: { is_superadmin: false }, error: null } });
  getServiceRoleClient.mockReturnValue(client);
  generateActivationLink.mockResolvedValue({ activationLink: null, error: "No se pudo generar el enlace de activación." });

  const result = await handleRegenerateActivationLink(request());

  expect(result).toEqual({ status: 500, payload: { error: "No se pudo generar el enlace de activación." } });
});
