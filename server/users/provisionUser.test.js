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

function makeClient({ createUserResult = { data: { user: { id: "new-user-1" } }, error: null }, cloneResult = { error: null }, generateLinkResult = { data: { properties: { hashed_token: "hashed-token-abc" } }, error: null } } = {}) {
  const createUser = vi.fn().mockResolvedValue(createUserResult);
  const generateLink = vi.fn().mockResolvedValue(generateLinkResult);
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue(cloneResult);
  return { auth: { admin: { createUser, generateLink, deleteUser } }, rpc };
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
    user_metadata: { first_name: "Ada", last_name: "Lovelace", nickname: "ada" },
  });
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
