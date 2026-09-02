import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./shared";
import RegisterScreen from "./RegisterScreen";
import i18n from "./i18n";

function renderWithToast(ui) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ email_sent: true }) });
});

// i18n es un singleton global — el test de cambio de idioma deja i18next en
// "en" si no se revierte, rompiendo cualquier test posterior de este mismo
// archivo (o de otros, según orden de ejecución) que espere texto en
// español.
afterEach(() => {
  i18n.changeLanguage("es");
});

it("pulsar 'Volver a entrar' antes de enviar llama a onBack sin llamar a fetch", async () => {
  const onBack = vi.fn();
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={onBack} />);

  await user.click(screen.getByRole("button", { name: /Volver a entrar/ }));

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
});

it("enviar el formulario llama a /api/external-register con los datos y muestra la confirmación", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nombre"), "Ada");
  await user.type(screen.getByLabelText("Apellidos"), "Lovelace");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/external-register", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ email: "diver@example.com", first_name: "Ada", last_name: "Lovelace", nickname: "ada", language: "es" }),
  })));
  expect(await screen.findByText(/Te hemos enviado un email para confirmar tu cuenta/)).toBeInTheDocument();
});

// Release V1, 2026-09-02 (enlace de invitación): cuando AuthGate detecta
// ?invite=... en la URL, pasa ese token a RegisterScreen — se manda tal
// cual en el body para que el servidor pueda saltarse
// allow_external_registration si es válido (ver externalRegister.js).
it("con inviteToken, lo incluye en el body como invite_token", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} inviteToken="abc-123" />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/external-register", expect.objectContaining({
    body: JSON.stringify({ email: "diver@example.com", first_name: "", last_name: "", nickname: "ada", language: "es", invite_token: "abc-123" }),
  })));
});

it("sin inviteToken, no incluye invite_token en el body (comportamiento normal)", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body.invite_token).toBeUndefined();
});

// Release V1, Fase 2 (multidioma): el idioma se elige en el propio
// formulario de registro y se envía junto al resto de datos del alta.
it("cambiar el idioma en el selector se envía en el registro", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "Idioma" }));
  await user.click(screen.getByRole("option", { name: "English" }));

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Sign up" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/external-register", expect.objectContaining({
    body: expect.stringContaining('"language":"en"'),
  })));
});

it("si el servidor responde con error (p. ej. registro externo desactivado), lo muestra y no pasa a la confirmación", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "El registro externo no está habilitado." }) });
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  expect(await screen.findByText("El registro externo no está habilitado.")).toBeInTheDocument();
  expect(screen.queryByText(/Te hemos enviado un email/)).not.toBeInTheDocument();
});

it("un nickname con '@' muestra el aviso, deshabilita el envío y no llama a fetch", async () => {
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "diver@example.com");

  expect(screen.getByText('El nickname no puede contener "@".')).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrarme" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Registrarme" }));
  expect(global.fetch).not.toHaveBeenCalled();
});

it("si el email no se pudo enviar (email_sent:false), avisa por toast y no pasa a la confirmación", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ email_sent: false }) });
  const user = userEvent.setup();
  renderWithToast(<RegisterScreen onBack={vi.fn()} />);

  await user.type(screen.getByLabelText("Email"), "diver@example.com");
  await user.type(screen.getByLabelText("Nickname"), "ada");
  await user.click(screen.getByRole("button", { name: "Registrarme" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.queryByText(/Te hemos enviado un email/)).not.toBeInTheDocument();
});
