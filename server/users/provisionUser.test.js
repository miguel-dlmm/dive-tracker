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
  profileUpdateResult = { error: null },
} = {}) {
  const createUser = vi.fn().mockResolvedValue(createUserResult);
  const generateLink = vi.fn().mockResolvedValue(generateLinkResult);
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue(cloneResult);
  const maybeSingle = vi.fn().mockResolvedValue(nicknameLookupResult);
  const ilike = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ ilike }));
  // update -> eq: fecha de nacimiento/país de residencia (best-effort,
  // escrito con un UPDATE normal tras crear la fila vía handle_new_user()
  // — ver el comentario junto a esa llamada en provisionUser.js).
  const updateEq = vi.fn().mockResolvedValue(profileUpdateResult);
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn(() => ({ select, update }));
  return { auth: { admin: { createUser, generateLink, deleteUser } }, rpc, from, __mocks: { select, ilike, maybeSingle, update, updateEq } };
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

// Fase 10, 2026-09-07 — "aplica a todos los enlaces generados en la
// app": el email de bienvenida de CUALQUIER alta (superadmin o
// autoregistro) usaba siempre la URL fija de APP_URL, ignorando el
// dominio real desde el que se pidió el alta. provisionUser() reenvía
// baseUrl (si el llamador lo pasa) a generateActivationLink(), que ya
// sabía priorizarlo sobre APP_URL (ver activationLink.js) desde la
// corrección anterior de "olvidé mi contraseña".
it("cuando se pasa baseUrl, el enlace de activación usa ese dominio en vez de APP_URL", async () => {
  sendActivationEmail.mockResolvedValue({ sent: false, error: "no importa para este test" });

  const result = await provisionUser({ ...ARGS, baseUrl: "https://dive-tracker-git-mi-rama.vercel.app" });

  expect(result.action_link).toMatch(/^https:\/\/dive-tracker-git-mi-rama\.vercel\.app/);
});

it("sin baseUrl, el enlace de activación sigue usando APP_URL (comportamiento de siempre)", async () => {
  sendActivationEmail.mockResolvedValue({ sent: false, error: "no importa para este test" });

  const result = await provisionUser(ARGS);

  expect(result.action_link).toMatch(/^https:\/\/app\.example/);
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

// Fecha de nacimiento / país de residencia (2026-09-07, pedido explícito:
// "añade al formulario de registro los campos fecha de nacimiento y
// país de residencia"). No van en user_metadata/handle_new_user() (evita
// tocar el trigger de alta, un cambio de esquema aparte) — se escriben
// con un UPDATE normal sobre la fila que el propio trigger ya creó,
// best-effort igual que el email.
describe("fecha de nacimiento / país de residencia (best-effort tras crear la cuenta)", () => {
  it("con ambos, actualiza la fila de profiles recién creada", async () => {
    const client = makeClient();
    getServiceRoleClient.mockReturnValue(client);

    await provisionUser({ ...ARGS, birth_date: "1990-05-12", country_of_residence: "MX" });

    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.__mocks.update).toHaveBeenCalledWith({ birth_date: "1990-05-12", country_of_residence: "MX" });
    expect(client.__mocks.updateEq).toHaveBeenCalledWith("user_id", "new-user-1");
  });

  it("con solo uno de los dos, manda el otro como null en el UPDATE", async () => {
    const client = makeClient();
    getServiceRoleClient.mockReturnValue(client);

    await provisionUser({ ...ARGS, birth_date: "1990-05-12" });

    expect(client.__mocks.update).toHaveBeenCalledWith({ birth_date: "1990-05-12", country_of_residence: null });
  });

  it("sin ninguno de los dos, no llama al UPDATE de profiles en absoluto", async () => {
    const client = makeClient();
    getServiceRoleClient.mockReturnValue(client);

    await provisionUser(ARGS);

    expect(client.__mocks.update).not.toHaveBeenCalled();
  });

  it("si el UPDATE falla, el alta sigue completándose con éxito (best-effort, no bloquea)", async () => {
    const client = makeClient({ profileUpdateResult: { error: { message: "constraint violada" } } });
    getServiceRoleClient.mockReturnValue(client);

    const result = await provisionUser({ ...ARGS, birth_date: "1990-05-12", country_of_residence: "MX" });

    expect(result.user_id).toBe("new-user-1");
    expect(result.email_sent).toBe(true);
  });
});
