vi.mock("./useSession", () => ({ useSession: vi.fn(), ACCOUNT_DEACTIVATED_MESSAGE: "Tu cuenta ha sido desactivada. Contacta con un administrador si crees que es un error." }));
vi.mock("./useSupabaseTable", () => ({ useSupabaseTable: vi.fn() }));
// AuthGate llama a supabase.rpc("external_registration_enabled") directamente
// (no vía useSession/useSupabaseTable, ambos ya mockeados arriba) para saber
// si mostrar "Regístrate" en el login — sin este mock haría una llamada de
// red real durante los tests. Mismo patrón que ConfigTab.test.jsx.
vi.mock("./supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { useSession } from "./useSession";
import { useSupabaseTable } from "./useSupabaseTable";
import { supabase } from "./supabaseClient";

const SESSION = { user: { id: "u1", email: "diver@example.com" } };

function mockUseSession(overrides) {
  useSession.mockReturnValue({
    session: null,
    profile: null,
    loading: false,
    accountBanned: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    activateAccount: vi.fn(),
    resetPassword: vi.fn(),
    pendingLegalConsents: [],
    acceptLegalConsents: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  useSession.mockReset();
  supabase.rpc.mockReset().mockResolvedValue({ data: false, error: null });
  useSupabaseTable.mockReset().mockReturnValue({
    rows: [],
    loaded: true,
    insertRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    bulkUpdateWhere: vi.fn(),
    setDefault: vi.fn(),
  });
  window.history.pushState({}, "", "/");
});

// AuthGate (App.jsx) — integración del flujo de activación. Ver
// useSession.test.js para la lógica de activateAccount() en sí; aquí solo
// se comprueba qué pantalla muestra AuthGate en cada caso y que el envío de
// CreatePasswordScreen llega a activateAccount con los parámetros
// correctos. El Caso C ("sesión ajena") no tiene test porque no está
// implementado en esta fase — ver el comentario en AuthGate (App.jsx).
describe("AuthGate", () => {
  it("Caso A — sin sesión y con enlace de activación en la URL, muestra la pantalla de activación", () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    mockUseSession({ session: null, profile: null });

    render(<App />);

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("sin sesión y sin enlace de activación, muestra el login", () => {
    mockUseSession({ session: null, profile: null });

    render(<App />);

    expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
  });

  it("desde el login, '¿Olvidaste tu contraseña?' muestra ForgotPasswordScreen, y 'Volver a entrar' regresa al login", async () => {
    mockUseSession({ session: null, profile: null });
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByText("¿Olvidaste tu contraseña?"));

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email o nickname")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Volver a entrar/ }));

    expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
  });

  it("un enlace de activación en la URL prevalece sobre ForgotPasswordScreen", () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    mockUseSession({ session: null, profile: null });

    render(<App />);

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("registro externo desactivado (por defecto): el login no muestra 'Regístrate'", async () => {
    mockUseSession({ session: null, profile: null });

    render(<App />);

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith("external_registration_enabled"));
    expect(screen.queryByText("Regístrate")).not.toBeInTheDocument();
  });

  it("registro externo activado: el login muestra 'Regístrate', y lleva a RegisterScreen y de vuelta", async () => {
    supabase.rpc.mockResolvedValue({ data: true, error: null });
    mockUseSession({ session: null, profile: null });
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText("Regístrate");

    await user.click(screen.getByText("Regístrate"));
    expect(screen.getByLabelText("Nickname")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Volver a entrar/ }));
    expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
  });

  it("Caso B — sesión existente con activated_at sin fijar, reanuda mostrando la pantalla de activación sin pedir login", () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null } });

    render(<App />);

    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("Caso D — activated_at ya fijado y sin consentimientos pendientes, entra directo a la app sin mostrar activación", async () => {
    mockUseSession({
      session: SESSION,
      profile: { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z", nickname: "ada" },
      pendingLegalConsents: [],
    });

    render(<App />);

    expect(await screen.findByText("Ocean Flow")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    expect(screen.getByText("ada")).toBeInTheDocument();
  });

  it("activated_at fijado pero con consentimiento legal pendiente, muestra la pantalla de aceptación legal en vez de la app", () => {
    mockUseSession({
      session: SESSION,
      profile: { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      pendingLegalConsents: [{ document_type: "privacy_policy", document_version: "v1" }],
    });

    render(<App />);

    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
  });

  it("accountBanned prevalece sobre cualquier otro estado — ni un enlace de activación en la URL ni una sesión existente muestran otra pantalla", () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null }, accountBanned: true });

    render(<App />);

    expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    expect(screen.getByText(/tu cuenta ha sido desactivada/i)).toBeInTheDocument();
  });

  it("al enviar la contraseña, llama a activateAccount con token_hash, type y el email de la sesión", async () => {
    window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
    const activateAccount = vi.fn().mockResolvedValue({ userId: "u1" });
    mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null }, activateAccount });
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "password123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /crear contraseña/i }));

    await waitFor(() =>
      expect(activateAccount).toHaveBeenCalledWith({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "password123",
      })
    );
  });

  // flow=recovery — encargo explícito 2026-09-01: el enlace de "volver a
  // crear contraseña" (recuperación autoservicio, generado por
  // requestPasswordReset.js con flow: "recovery") no debe reutilizar
  // CreatePasswordScreen/activateAccount ni su exigencia de bases legales.
  // Ver resetPassword()/resolveRecoverySession() en useSession.js.
  describe("flow=recovery (recuperación de contraseña)", () => {
    it("sin sesión: muestra ResetPasswordScreen (no CreatePasswordScreen) y no pide bases legales", () => {
      window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery&flow=recovery");
      mockUseSession({ session: null, profile: null });

      render(<App />);

      expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /guardar nueva contraseña/i })).toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /crear contraseña/i })).not.toBeInTheDocument();
    });

    it("sesión existente reanudada (activated_at sin fijar) con flow=recovery: también muestra ResetPasswordScreen, sin bases legales", () => {
      window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery&flow=recovery");
      mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null } });

      render(<App />);

      expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("sin flow (o con otro valor), un enlace de activación sigue mostrando CreatePasswordScreen con bases legales — comportamiento sin cambios", () => {
      window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery");
      mockUseSession({ session: null, profile: null });

      render(<App />);

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /crear contraseña/i })).toBeInTheDocument();
    });

    it("al enviar la contraseña, llama a resetPassword (no activateAccount) con token_hash, type y el email de la sesión", async () => {
      window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery&flow=recovery");
      const resetPassword = vi.fn().mockResolvedValue({ userId: "u1" });
      const activateAccount = vi.fn();
      mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null }, resetPassword, activateAccount });
      const user = userEvent.setup();

      render(<App />);

      await user.type(screen.getByLabelText("Nueva contraseña"), "password123");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "password123");
      await user.click(screen.getByRole("button", { name: /guardar nueva contraseña/i }));

      await waitFor(() =>
        expect(resetPassword).toHaveBeenCalledWith({
          tokenHash: "hash-1",
          type: "recovery",
          expectedEmail: "diver@example.com",
          password: "password123",
        })
      );
      expect(activateAccount).not.toHaveBeenCalled();
    });

    it("accountBanned prevalece también sobre flow=recovery — muestra login, no ResetPasswordScreen", () => {
      window.history.pushState({}, "", "/?token_hash=hash-1&type=recovery&flow=recovery");
      mockUseSession({ session: SESSION, profile: { user_id: "u1", activated_at: null }, accountBanned: true });

      render(<App />);

      expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
      expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
    });
  });
});
