vi.mock("./useSession", () => ({ useSession: vi.fn(), ACCOUNT_DEACTIVATED_MESSAGE: "Tu cuenta ha sido desactivada. Contacta con un administrador si crees que es un error." }));
vi.mock("./useSupabaseTable", () => ({ useSupabaseTable: vi.fn() }));
// AuthGate llama a supabase.rpc("external_registration_enabled") directamente
// (no vía useSession/useSupabaseTable, ambos ya mockeados arriba) para saber
// si mostrar "Regístrate" en el login — sin este mock haría una llamada de
// red real durante los tests. Mismo patrón que ConfigTab.test.jsx.
// from(): DeploymentNotice.jsx (Fase 6, Release V1) ya se monta para
// cualquier cuenta con sesión, no solo superadmin — sin este stub, sus
// consultas revientan con "supabase.from is not a function" en cualquier
// test que llegue a AppShell (rechazo no gestionado, ver vitest
// "Unhandled Errors"). Encadenable mínimo que siempre resuelve vacío: a
// estos tests de AuthGate no les importa el contenido de ese modal.
function emptyQuery() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return query;
}
vi.mock("./supabaseClient", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn(() => emptyQuery()) },
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
    forcedPasswordUpdate: false,
    updateForcedPassword: vi.fn(),
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

  // Enlace de invitación (Release V1, 2026-09-02) — ver
  // server/users/generateInvitationLink.js/externalRegister.js. A
  // diferencia de "Regístrate" de arriba, esto NO depende de
  // external_registration_enabled: el control real vive en el servidor.
  describe("enlace de invitación (?invite=)", () => {
    it("con ?invite= en la URL, muestra RegisterScreen directamente aunque el registro externo esté desactivado", async () => {
      window.history.pushState({}, "", "/?invite=abc-123");
      supabase.rpc.mockResolvedValue({ data: false, error: null });
      mockUseSession({ session: null, profile: null });

      render(<App />);

      expect(await screen.findByLabelText("Nickname")).toBeInTheDocument();
      expect(screen.queryByText("Regístrate")).not.toBeInTheDocument();
    });

    it("al volver al login, limpia el parámetro invite de la URL", async () => {
      window.history.pushState({}, "", "/?invite=abc-123");
      mockUseSession({ session: null, profile: null });
      const user = userEvent.setup();

      render(<App />);
      await screen.findByLabelText("Nickname");

      await user.click(screen.getByRole("button", { name: /Volver a entrar/ }));

      expect(screen.getByLabelText("Email o nickname")).toBeInTheDocument();
      expect(window.location.search).toBe("");
    });
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

  // Fase 4, Release V1 (rediseño de cabecera, ver docs/RELEASE-V1-PROGRESS.md):
  // "Cerrar sesión" deja de vivir como icono en la cabecera (tarea
  // infrecuente, no debe competir por espacio con Ayuda/Configuración) y
  // pasa a Mi perfil. Cubre las dos mitades del cambio: el icono ya no
  // está arriba, y sí aparece dentro de Mi perfil.
  it("Fase 4 — 'Cerrar sesión' ya no está en la cabecera; vive en Mi perfil", async () => {
    const signOut = vi.fn();
    mockUseSession({
      session: SESSION,
      profile: { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z", nickname: "ada" },
      pendingLegalConsents: [],
      signOut,
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Ocean Flow");

    expect(screen.queryByLabelText("Cerrar sesión")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Mi perfil"));

    const signOutButton = await screen.findByRole("button", { name: "Cerrar sesión" });
    await user.click(signOutButton);
    expect(signOut).toHaveBeenCalled();
  });

  // Fase 4, Release V1: "Ver qué hay de nuevo" en Ayuda reabre WhatsNew sin
  // tocar su gate de "una vez por versión" (se marca como ya visto en
  // localStorage antes de renderizar, para probar la reapertura de verdad
  // en vez de que ya estuviera abierto por no haberse visto todavía).
  it("Fase 4 — 'Ver qué hay de nuevo' en Ayuda reabre el slide de novedades ya visto", async () => {
    localStorage.setItem("oceanpulse:whatsNewSeen:u1", "0.2.0");
    mockUseSession({
      session: SESSION,
      profile: { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z", nickname: "ada" },
      pendingLegalConsents: [],
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Ocean Flow");
    expect(screen.queryByText("Training Records al instante")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Ayuda"));
    await user.click(await screen.findByText("Ver qué hay de nuevo en esta versión"));

    expect(await screen.findByText("Training Records al instante")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText("Nueva contraseña"), "Password123!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Password123!");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /crear contraseña/i }));

    await waitFor(() =>
      expect(activateAccount).toHaveBeenCalledWith({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "Password123!",
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

      await user.type(screen.getByLabelText("Nueva contraseña"), "Password123!");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "Password123!");
      await user.click(screen.getByRole("button", { name: /guardar nueva contraseña/i }));

      await waitFor(() =>
        expect(resetPassword).toHaveBeenCalledWith({
          tokenHash: "hash-1",
          type: "recovery",
          expectedEmail: "diver@example.com",
          password: "Password123!",
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

// forcedPasswordUpdate (Release V1, 2026-09-02) — cuenta ya activada, con
// sesión válida, cuya contraseña actual no cumple la política reforzada.
// Ver useSession.test.js para cuándo se marca este estado; aquí solo
// importa que AuthGate lo anteponga a la app normal y a los
// consentimientos legales pendientes.
describe("AuthGate — forcedPasswordUpdate", () => {
  const ACTIVATED_PROFILE = { user_id: "u1", activated_at: "2026-01-01T00:00:00Z", nickname: "ada" };

  it("con forcedPasswordUpdate, muestra la pantalla de actualizar contraseña en vez de la app normal", () => {
    mockUseSession({ session: SESSION, profile: ACTIVATED_PROFILE, forcedPasswordUpdate: true });

    render(<App />);

    expect(screen.getByText(/reforzado la seguridad de ocean flow/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Email o nickname")).not.toBeInTheDocument();
  });

  it("prevalece sobre los consentimientos legales pendientes", () => {
    mockUseSession({
      session: SESSION, profile: ACTIVATED_PROFILE, forcedPasswordUpdate: true,
      pendingLegalConsents: [{ document_type: "privacy_policy" }],
    });

    render(<App />);

    expect(screen.getByText(/reforzado la seguridad de ocean flow/i)).toBeInTheDocument();
  });

  it("al enviar la contraseña nueva, llama a updateForcedPassword", async () => {
    const updateForcedPassword = vi.fn().mockResolvedValue();
    mockUseSession({ session: SESSION, profile: ACTIVATED_PROFILE, forcedPasswordUpdate: true, updateForcedPassword });
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText("Nueva contraseña"), "Password123!");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "Password123!");
    await user.click(screen.getByRole("button", { name: /guardar y continuar/i }));

    await waitFor(() => expect(updateForcedPassword).toHaveBeenCalledWith("Password123!"));
  });

  it("sin forcedPasswordUpdate, una cuenta activada entra directamente en la app normal", () => {
    mockUseSession({ session: SESSION, profile: ACTIVATED_PROFILE, forcedPasswordUpdate: false });

    render(<App />);

    expect(screen.queryByText(/reforzado la seguridad de ocean flow/i)).not.toBeInTheDocument();
  });
});

// Backlog: "Sembrar payment_statuses (Pending/Paid) en el alta +
// autoservicio del instructor" — una cuenta (nueva o ya existente) sin
// ningún estado de pago los recibe solos al cargar la app, sin migración
// (INSERT normal vía el cliente, ya permitido por la RLS "own rows" que
// la tabla ya tiene).
describe("AppShell — siembra de estados de pago por defecto", () => {
  const ACTIVATED_PROFILE = { user_id: "u1", activated_at: "2026-01-01T00:00:00Z", nickname: "ada" };

  function tableHook(rows = [], overrides = {}) {
    return { rows, loaded: true, insertRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn(), ...overrides };
  }

  it("con payment_statuses vacío, inserta Pendiente (por defecto) y Cobrado", async () => {
    const insertRow = vi.fn().mockResolvedValue({});
    useSupabaseTable.mockImplementation((table) => (
      table === "payment_statuses" ? tableHook([], { insertRow }) : tableHook([])
    ));
    mockUseSession({ session: SESSION, profile: ACTIVATED_PROFILE });

    render(<App />);

    await waitFor(() => expect(insertRow).toHaveBeenCalledWith({ name: "Pendiente", is_default: true, color: "#D97706" }));
    expect(insertRow).toHaveBeenCalledWith({ name: "Cobrado", color: "#10B981" });
  });

  it("con payment_statuses ya con filas, no inserta nada", async () => {
    const insertRow = vi.fn();
    useSupabaseTable.mockImplementation((table) => (
      table === "payment_statuses" ? tableHook([{ id: "s1", name: "Pendiente", is_default: true }], { insertRow }) : tableHook([])
    ));
    mockUseSession({ session: SESSION, profile: ACTIVATED_PROFILE });

    render(<App />);

    expect(insertRow).not.toHaveBeenCalled();
  });
});
