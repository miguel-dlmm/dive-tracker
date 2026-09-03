// A diferencia de EmailService.test.js (que mockea resendProvider.js para
// testear en aislamiento la lógica propia de EmailService: selección de
// copy por motivo, guard de actionLink, manejo de excepciones), este
// fichero NO mockea el proveedor — solo el límite real del sistema
// (fetch), igual que resendProvider.test.js. Objetivo: probar que la
// cadena completa sendActivationEmail() → resendProvider → fetch queda
// conectada de verdad con los datos correctos, y no solo que cada eslabón
// por separado "se llama con los argumentos esperados" mientras el de al
// lado está mockeado.
const ENV = { RESEND_API_KEY: "resend-key", EMAIL_FROM: "Ocean Flow <hola@example.com>" };

async function sendWithEnv(args, envOverrides = {}) {
  const previous = {};
  for (const key of Object.keys(ENV)) previous[key] = process.env[key];
  try {
    for (const key of Object.keys(ENV)) {
      const value = key in envOverrides ? envOverrides[key] : ENV[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.resetModules();
    const mod = await import("./EmailService.js");
    return mod.sendActivationEmail(args);
  } finally {
    for (const key of Object.keys(ENV)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    vi.resetModules();
  }
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("signup: llega de verdad hasta la API de Resend con el asunto, el remitente y el enlace de alta", async () => {
  fetch.mockResolvedValue({ ok: true });

  const result = await sendWithEnv({
    email: "diver@example.com",
    firstName: "Ada",
    nickname: "ada",
    actionLink: "https://app.example/activate?token=abc",
    reason: "signup",
  });

  expect(result).toEqual({ sent: true });
  expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({ Authorization: `Bearer ${ENV.RESEND_API_KEY}` }),
  }));
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.from).toBe(ENV.EMAIL_FROM);
  expect(body.to).toBe("diver@example.com");
  expect(body.subject).toBe("Tu acceso a Ocean Flow ya está listo");
  expect(body.html).toContain("https://app.example/activate?token=abc");
  expect(body.html).toContain("Ada");
});

it("reactivation: usa el asunto de reactivación real, no el de alta", async () => {
  fetch.mockResolvedValue({ ok: true });

  await sendWithEnv({ email: "ana@example.com", nickname: "ana", actionLink: "https://app.example/x", reason: "reactivation" });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.subject).toBe("Tu acceso a Ocean Flow ha sido reactivado");
});

it("password_reset: usa el asunto y el texto de restablecer contraseña reales", async () => {
  fetch.mockResolvedValue({ ok: true });

  await sendWithEnv({ email: "ana@example.com", nickname: "ana", actionLink: "https://app.example/y", reason: "password_reset" });

  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.subject).toBe("Se ha restablecido tu contraseña en Ocean Flow");
  expect(body.text).toContain("Crear nueva contraseña");
});

it("propaga sent:false sin llamar a fetch si falta configuración real de Resend (sin mock del provider)", async () => {
  const result = await sendWithEnv(
    { email: "diver@example.com", nickname: "ada", actionLink: "https://app.example/x", reason: "signup" },
    { RESEND_API_KEY: undefined }
  );

  expect(result).toEqual({ sent: false, error: "Configuración de email incompleta." });
  expect(fetch).not.toHaveBeenCalled();
});

it("propaga sent:false sin lanzar si Resend responde con error (fallo real de red simulado en el límite del sistema)", async () => {
  fetch.mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "invalid from" }) });

  const result = await sendWithEnv({ email: "diver@example.com", nickname: "ada", actionLink: "https://app.example/x", reason: "signup" });

  expect(result).toEqual({ sent: false, error: "No se pudo enviar el email." });
});
