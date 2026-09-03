vi.mock("../supabaseAdmin.js", () => ({
  getServiceRoleClient: vi.fn(),
}));

vi.mock("../email/EmailService.js", () => ({
  sendActivationEmail: vi.fn(),
}));

import { provisionUser } from "./provisionUser.js";
import { getServiceRoleClient } from "../supabaseAdmin.js";
import { sendActivationEmail } from "../email/EmailService.js";

const ARGS = { email: "diver@example.com", first_name: "Ada", last_name: "Lovelace", nickname: "ada", dataset_key: "ihasia" };

function makeClient({
  createUserResult = { data: { user: { id: "new-user-1" } }, error: null },
  cloneResult = { error: null },
  generateLinkResult = { data: { properties: { hashed_token: "hashed-token-abc" } }, error: null },
  nicknameLookupResult = { data: null, error: null },
} = {}) {
  const createUser = vi.fn().mockResolvedValue(createUserResult);
  const generateLink = vi.fn().mockResolvedValue(generateLinkResult);
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue(cloneResult);
  const maybeSingle = vi.fn().mockResolvedValue(nicknameLookupResult);
  const ilike = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ ilike }));
  const from = vi.fn(() => ({ select }));
  return { auth: { admin: { createUser, generateLink, deleteUser } }, rpc, from, __mocks: { select, ilike, maybeSingle } };
}

beforeEach(() => {
  getServiceRoleClient.mockReset();
  getServiceRoleClient.mockReturnValue(makeClient());
  sendActivationEmail.mockReset();
  sendActivationEmail.mockResolvedValue({ sent: true });
  process.env.APP_URL = "https://app.example";
});

it("crea el usuario sin contraseña, con los metadatos esperados", async () => {
  const client = makeClient();
  getServiceRoleClient.mockReturnValue(client);

  await provisionUser(ARGS);

  expect(client.auth.admin.createUser).toHaveBeenCalledWith({
    email: ARGS.email,
    email_confirm: true,
    user_metadata: { first_name: "Ada", last_name: "Lovelace", nickname: "ada", language: null },
  });
});

// Release V1, Fase 2 (multidioma): se pasa tal cual a metadata —
// handle_new_user() (schema.sql) resuelve null/ausente a 'es'.
it("propaga language a los metadatos cuando se indica", async () => {
  const client = makeClient();
  getServiceRoleClient.mockReturnValue(client);

  await provisionUser({ ...ARGS, language: "en" });

  expect(client.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
    user_metadata: expect.objectContaining({ language: "en" }),
  }));
});

it("clona el dataset indicado en el usuario recién creado", async () => {
  const client = makeClient();
  getServiceRoleClient.mockReturnValue(client);

  await provisionUser(ARGS);

  expect(client.rpc).toHaveBeenCalledWith("clone_setup_dataset", { p_dataset_key: "ihasia", p_target_user_id: "new-user-1" });
});

it("envía el email de activación con el motivo (reason) indicado", async () => {
  await provisionUser({ ...ARGS, reason: "external_signup" });

  expect(sendActivationEmail).toHaveBeenCalledWith(expect.objectContaining({
    email: ARGS.email,
    firstName: "Ada",
    nickname: "ada",
    reason: "external_signup",
  }));
});

it("reason por defecto es 'signup' si no se indica", async () => {
  await provisionUser(ARGS);

  expect(sendActivationEmail).toHaveBeenCalledWith(expect.objectContaining({ reason: "signup" }));
});

it("devuelve { error } sin lanzar si falla la creación en Supabase Auth", async () => {
  getServiceRoleClient.mockReturnValue(makeClient({ createUserResult: { data: null, error: { message: "email ya en uso" } } }));

  const result = await provisionUser(ARGS);

  expect(result).toEqual({ error: { message: "email ya en uso" } });
  expect(sendActivationEmail).not.toHaveBeenCalled();
});

it("revierte el alta (deleteUser) si falla clonar el dataset, y no envía email", async () => {
  const client = makeClient({ cloneResult: { error: { message: "unknown setup dataset: x" } } });
  getServiceRoleClient.mockReturnValue(client);

  const result = await provisionUser(ARGS);

  expect(client.auth.admin.deleteUser).toHaveBeenCalledWith("new-user-1");
  expect(result).toEqual({ error: { message: "unknown setup dataset: x" } });
  expect(sendActivationEmail).not.toHaveBeenCalled();
});

it("email_sent:true, sin action_link, cuando el envío funciona", async () => {
  const result = await provisionUser(ARGS);

  expect(result).toEqual({ user_id: "new-user-1", email_sent: true, email_error: null, action_link: undefined });
});

it("email_sent:false con action_link cuando el envío falla — la cuenta ya está creada", async () => {
  sendActivationEmail.mockResolvedValue({ sent: false, error: "Configuración de email incompleta." });

  const result = await provisionUser(ARGS);

  expect(result.email_sent).toBe(false);
  expect(result.email_error).toBe("Configuración de email incompleta.");
  expect(result.action_link).toContain("hashed-token-abc");
});

// GoTrue nunca propaga el texto real del error de Postgres cuando
// handle_new_user() falla dentro de client.auth.admin.createUser() — solo
// devuelve el genérico "Database error creating new user", sin el nombre
// de la constraint. Confirmado en vivo probando el registro externo
// (2026-09-01): friendlyError() nunca llegaba a ver
// "profiles_nickname_no_at" en ese mensaje. Por eso provisionUser() valida
// el nickname ANTES de llamar a Supabase Auth, sin depender de lo que
// GoTrue decida devolver.
describe("validación de nickname antes de tocar Supabase Auth", () => {
  it("rechaza un nickname con '@' sin llegar a llamar a createUser", async () => {
    const client = makeClient();
    getServiceRoleClient.mockReturnValue(client);

    const result = await provisionUser({ ...ARGS, nickname: "correo@example.com" });

    expect(result).toEqual({ error: new Error('El nickname no puede contener "@".') });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("rechaza un nickname ya en uso (comprobación case-insensitive) sin llegar a llamar a createUser", async () => {
    const client = makeClient({ nicknameLookupResult: { data: { user_id: "existing-user" }, error: null } });
    getServiceRoleClient.mockReturnValue(client);

    const result = await provisionUser({ ...ARGS, nickname: "ADA" });

    expect(result).toEqual({ error: new Error("Ese nickname ya está en uso.") });
    expect(client.__mocks.ilike).toHaveBeenCalledWith("nickname", "ADA");
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("escapa comodines de ilike (%, _, \\) antes de comprobar el nickname", async () => {
    const client = makeClient();
    getServiceRoleClient.mockReturnValue(client);

    await provisionUser({ ...ARGS, nickname: "a_b%c" });

    expect(client.__mocks.ilike).toHaveBeenCalledWith("nickname", "a\\_b\\%c");
  });

  it("un fallo al comprobar disponibilidad no bloquea el alta — createUser() sigue como último recurso", async () => {
    const client = makeClient({ nicknameLookupResult: { data: null, error: { message: "timeout" } } });
    getServiceRoleClient.mockReturnValue(client);

    await provisionUser(ARGS);

    expect(client.auth.admin.createUser).toHaveBeenCalled();
  });
});
