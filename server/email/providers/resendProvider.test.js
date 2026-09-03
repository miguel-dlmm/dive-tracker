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
    const mod = await import("./resendProvider.js");
    return mod.sendViaResend(args);
  } finally {
    for (const key of Object.keys(ENV)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    vi.resetModules();
  }
}

const VALID_ARGS = {
  to: "diver@example.com",
  subject: "Asunto de prueba",
  html: "<p>hola</p>",
  text: "hola",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("devuelve sent:false si falta configuración de email en el servidor", async () => {
  const result = await sendWithEnv(VALID_ARGS, { RESEND_API_KEY: undefined });

  expect(result).toEqual({ sent: false, error: "Configuración de email incompleta." });
  expect(fetch).not.toHaveBeenCalled();
});

it("llama a la API de Resend con el remitente, destinatario, asunto y cuerpo esperados", async () => {
  fetch.mockResolvedValue({ ok: true });

  await sendWithEnv(VALID_ARGS);

  expect(fetch).toHaveBeenCalledWith(
    "https://api.resend.com/emails",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: `Bearer ${ENV.RESEND_API_KEY}` }),
    })
  );
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body).toEqual({ from: ENV.EMAIL_FROM, to: VALID_ARGS.to, subject: VALID_ARGS.subject, html: VALID_ARGS.html, text: VALID_ARGS.text });
});

it("devuelve sent:true cuando Resend responde ok", async () => {
  fetch.mockResolvedValue({ ok: true });

  const result = await sendWithEnv(VALID_ARGS);

  expect(result).toEqual({ sent: true });
});

it("devuelve sent:false sin lanzar si Resend responde con error", async () => {
  fetch.mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "invalid from" }) });

  const result = await sendWithEnv(VALID_ARGS);

  expect(result).toEqual({ sent: false, error: "No se pudo enviar el email." });
});

it("devuelve sent:false sin lanzar si fetch falla (red caída)", async () => {
  fetch.mockRejectedValue(new Error("network down"));

  const result = await sendWithEnv(VALID_ARGS);

  expect(result).toEqual({ sent: false, error: "No se pudo enviar el email." });
});
