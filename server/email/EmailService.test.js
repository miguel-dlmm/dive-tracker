vi.mock("./providers/resendProvider.js", () => ({ sendViaResend: vi.fn() }));

import { sendActivationEmail } from "./EmailService.js";
import { sendViaResend } from "./providers/resendProvider.js";
import { ACTIVATION_EMAIL_COPY } from "./templates/activationEmailTemplate.js";

const VALID_ARGS = {
  email: "diver@example.com",
  firstName: "Ada",
  nickname: "ada",
  actionLink: "https://example.supabase.co/verify?token=abc",
};

beforeEach(() => {
  sendViaResend.mockReset();
  sendViaResend.mockResolvedValue({ sent: true });
});

it("nunca lanza y devuelve sent:false si falta el enlace de acceso", async () => {
  const result = await sendActivationEmail({ ...VALID_ARGS, actionLink: undefined });

  expect(result).toEqual({ sent: false, error: "Falta el enlace de acceso." });
  expect(sendViaResend).not.toHaveBeenCalled();
});

it("delega en el proveedor con el asunto/copy de 'signup' por defecto", async () => {
  await sendActivationEmail(VALID_ARGS);

  expect(sendViaResend).toHaveBeenCalledTimes(1);
  const call = sendViaResend.mock.calls[0][0];
  expect(call.to).toBe(VALID_ARGS.email);
  expect(call.subject).toBe(ACTIVATION_EMAIL_COPY.signup.subject);
  expect(call.html).toContain(VALID_ARGS.actionLink);
  expect(call.html).toContain(VALID_ARGS.firstName);
  expect(call.text).toContain(VALID_ARGS.actionLink);
});

it("usa el copy de 'reactivation' cuando se indica ese motivo", async () => {
  await sendActivationEmail({ ...VALID_ARGS, reason: "reactivation" });

  const call = sendViaResend.mock.calls[0][0];
  expect(call.subject).toBe(ACTIVATION_EMAIL_COPY.reactivation.subject);
});

it("usa el copy de 'password_reset' cuando se indica ese motivo", async () => {
  await sendActivationEmail({ ...VALID_ARGS, reason: "password_reset" });

  const call = sendViaResend.mock.calls[0][0];
  expect(call.subject).toBe(ACTIVATION_EMAIL_COPY.password_reset.subject);
});

it("usa el nickname como nombre de pila si no hay firstName", async () => {
  await sendActivationEmail({ ...VALID_ARGS, firstName: null });

  const call = sendViaResend.mock.calls[0][0];
  expect(call.html).toContain(VALID_ARGS.nickname);
});

it("propaga sent/error tal cual los devuelve el proveedor", async () => {
  sendViaResend.mockResolvedValue({ sent: false, error: "Configuración de email incompleta." });

  const result = await sendActivationEmail(VALID_ARGS);

  expect(result).toEqual({ sent: false, error: "Configuración de email incompleta." });
});

it("devuelve sent:false sin lanzar si el proveedor lanza una excepción inesperada", async () => {
  sendViaResend.mockRejectedValue(new Error("boom"));

  const result = await sendActivationEmail(VALID_ARGS);

  expect(result).toEqual({ sent: false, error: "No se pudo enviar el email." });
});
