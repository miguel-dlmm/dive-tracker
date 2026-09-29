import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginScreen from "./LoginScreen";
import { ACCOUNT_DEACTIVATED_MESSAGE } from "./useSession";
import i18n from "./i18n";

// signIn se pasa como prop (viene de useSession en AuthGate) — aquí se
// mockea directamente, sin pasar por Supabase. Ver useSession.test.js para
// la detección de "user_banned" en sí.
async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText("Email o nickname"), "cuenta@example.com");
  await user.type(screen.getByLabelText("Contraseña"), "algo");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginScreen", () => {
  it("credenciales incorrectas: muestra el mensaje genérico", async () => {
    const signIn = vi.fn().mockRejectedValue({ message: "Invalid login credentials", code: "invalid_credentials" });
    const user = userEvent.setup();
    render(<LoginScreen signIn={signIn} />);

    await fillAndSubmit(user);

    expect(await screen.findByText("Email/nickname o contraseña incorrectos.")).toBeInTheDocument();
  });

  it("signIn lanza user_banned: NO muestra el mensaje genérico de credenciales", async () => {
    const signIn = vi.fn().mockRejectedValue({ message: "User is banned", code: "user_banned" });
    const user = userEvent.setup();
    render(<LoginScreen signIn={signIn} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(screen.queryByText("Email/nickname o contraseña incorrectos.")).not.toBeInTheDocument();
  });

  it("accountBanned=true: muestra el aviso de cuenta desactivada desde el primer render, sin necesidad de intentar iniciar sesión", () => {
    render(<LoginScreen signIn={vi.fn()} accountBanned />);

    expect(screen.getByText(ACCOUNT_DEACTIVATED_MESSAGE)).toBeInTheDocument();
  });

  it("accountBanned=false (o ausente): no muestra ningún aviso al montar", () => {
    render(<LoginScreen signIn={vi.fn()} />);

    expect(screen.queryByText(ACCOUNT_DEACTIVATED_MESSAGE)).not.toBeInTheDocument();
  });

  it("sin onForgotPassword: no muestra el enlace de recuperar contraseña", () => {
    render(<LoginScreen signIn={vi.fn()} />);

    expect(screen.queryByText("¿Olvidaste tu contraseña?")).not.toBeInTheDocument();
  });

  it("con onForgotPassword: muestra el enlace y lo llama al pulsarlo", async () => {
    const onForgotPassword = vi.fn();
    const user = userEvent.setup();
    render(<LoginScreen signIn={vi.fn()} onForgotPassword={onForgotPassword} />);

    await user.click(screen.getByText("¿Olvidaste tu contraseña?"));

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  // Selector de idioma arriba a la derecha (2026-09-29, pedido explícito) —
  // ver EntryLanguagePicker en shared.jsx. Cambiar aquí debe traducir la
  // propia pantalla al instante (mismo i18n.changeLanguage que ya usaba el
  // selector de RegisterScreen) para que, al navegar a Registro después, su
  // combo ya venga cargado en ese idioma — comportamiento cubierto por
  // compartir el mismo i18n/localStorage, no por props entre pantallas.
  it("selector de idioma: cambiarlo traduce la propia pantalla de login", async () => {
    const user = userEvent.setup();
    render(<LoginScreen signIn={vi.fn()} />);
    // getByRole("combobox"), no getByLabelText: su propio aria-label está
    // traducido ("Idioma"/"Language"), así que cambia con el idioma activo
    // — buscarlo por rol se mantiene estable durante todo el test.
    const picker = screen.getByRole("combobox");

    await user.selectOptions(picker, "en");

    expect(await screen.findByRole("button", { name: "Log in" })).toBeInTheDocument();

    // Vuelve a español para no dejar el idioma cambiado para el resto de
    // tests de este archivo (i18n es un singleton compartido en todo el
    // fichero de test).
    await user.selectOptions(picker, "es");
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
});

afterAll(() => {
  i18n.changeLanguage("es");
});
