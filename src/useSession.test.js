vi.mock("./supabaseClient.js", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { useSession, ACCOUNT_DEACTIVATED_MESSAGE } from "./useSession";
import { supabase } from "./supabaseClient";
import { DOCUMENT_TYPE as PRIVACY_TYPE, VERSION as PRIVACY_VERSION } from "./legal/privacyPolicy";
import { DOCUMENT_TYPE as TERMS_TYPE, VERSION as TERMS_VERSION } from "./legal/termsOfUse";

const FAKE_SESSION = { user: { id: "u1", email: "diver@example.com" } };

// update(...).eq(...).is(...) — la cadena real que usa markAccountActivated.
// completePasswordChange ya no toca profiles en absoluto, así que "update"
// solo se ejercita desde markAccountActivated en estos tests.
function setupFromMock({ profile, profileError = null, updateError = null, consents = [], consentsError = null, insertError = null }) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: profileError });
  const selectEq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq: selectEq });

  const updateIs = vi.fn().mockResolvedValue({ error: updateError });
  const updateEq = vi.fn().mockReturnValue({ is: updateIs });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const consentsSelectEq = vi.fn().mockResolvedValue({ data: consents, error: consentsError });
  const consentsSelect = vi.fn().mockReturnValue({ eq: consentsSelectEq });
  const consentsInsert = vi.fn().mockResolvedValue({ error: insertError });

  supabase.from.mockImplementation((table) => {
    if (table === "legal_consents") return { select: consentsSelect, insert: consentsInsert };
    return { select, update };
  });

  return { update, updateEq, updateIs, consentsSelect, consentsSelectEq, consentsInsert };
}

beforeEach(() => {
  supabase.auth.getSession.mockReset();
  // No baneado por defecto en todos los tests existentes — solo los tests
  // de "cuenta desactivada" de más abajo lo sobrescriben explícitamente.
  supabase.auth.getUser.mockReset().mockResolvedValue({ data: { user: {} }, error: null });
  supabase.auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  supabase.auth.signInWithPassword.mockReset();
  supabase.auth.signOut.mockReset().mockResolvedValue({ error: null });
  supabase.auth.updateUser.mockReset();
  supabase.auth.verifyOtp.mockReset();
  supabase.from.mockReset();
  supabase.rpc.mockReset();
});

async function renderReadySession(profile = { user_id: "u1", activated_at: null }, extra = {}) {
  supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
  const mocks = setupFromMock({ profile, ...extra });

  const { result } = renderHook(() => useSession());
  await waitFor(() => expect(result.current.loading).toBe(false));

  return { result, ...mocks };
}

async function renderWithoutSession() {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  const { result } = renderHook(() => useSession());
  await waitFor(() => expect(result.current.loading).toBe(false));
  return { result };
}

describe("completePasswordChange", () => {
  it("fija la contraseña sin tocar profiles", async () => {
    const { result, update } = await renderReadySession();
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.completePasswordChange("nueva-contraseña-123");
    });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "nueva-contraseña-123" });
    expect(update).not.toHaveBeenCalled();
  });

  it("lanza si auth.updateUser falla", async () => {
    const { result } = await renderReadySession();
    supabase.auth.updateUser.mockResolvedValue({ error: { message: "weak password" } });

    await expect(result.current.completePasswordChange("x")).rejects.toBeTruthy();
  });

  it("trata same_password (reintento con la misma contraseña ya guardada) como éxito, no como fallo", async () => {
    const { result } = await renderReadySession();
    supabase.auth.updateUser.mockResolvedValue({
      error: { message: "New password should be different from the old password.", code: "same_password" },
    });

    await expect(result.current.completePasswordChange("nueva-123")).resolves.toBeUndefined();
  });
});

describe("markAccountActivated", () => {
  it("fija activated_at filtrando por activated_at aún null, y actualiza el profile en memoria", async () => {
    const { result, update, updateEq, updateIs } = await renderReadySession({ user_id: "u1", activated_at: null });

    await act(async () => {
      await result.current.markAccountActivated("u1");
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ activated_at: expect.any(String) }));
    expect(updateEq).toHaveBeenCalledWith("user_id", "u1");
    expect(updateIs).toHaveBeenCalledWith("activated_at", null);
    expect(result.current.profile.activated_at).toEqual(expect.any(String));
  });

  it("es idempotente: repetir la llamada no lanza y no adelanta un activated_at ya fijado", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" });

    await act(async () => {
      await result.current.markAccountActivated("u1");
    });

    expect(result.current.profile.activated_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("lanza si el update falla", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", activated_at: null },
      { updateError: { message: "network" } }
    );

    await expect(result.current.markAccountActivated("u1")).rejects.toBeTruthy();
  });
});

describe("pendingLegalConsents", () => {
  it("incluye ambos documentos si el usuario no ha aceptado nada", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" }, { consents: [] });

    expect(result.current.pendingLegalConsents).toEqual([
      { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
  });

  it("no queda ninguno pendiente si el usuario ya aceptó las versiones vigentes", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      {
        consents: [
          { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
          { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
        ],
      }
    );

    expect(result.current.pendingLegalConsents).toEqual([]);
  });

  it("sigue pendiente un documento si el usuario aceptó una versión antigua", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      { consents: [{ document_type: PRIVACY_TYPE, document_version: "v0" }] }
    );

    expect(result.current.pendingLegalConsents).toEqual([
      { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
  });
});

describe("acceptLegalConsents", () => {
  it("inserta las filas que faltan (usando el user_id de la sesión) y las refleja en pendingLegalConsents", async () => {
    const { result, consentsInsert } = await renderReadySession({ user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" }, { consents: [] });

    await act(async () => {
      await result.current.acceptLegalConsents();
    });

    expect(consentsInsert).toHaveBeenCalledWith([
      { user_id: "u1", document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { user_id: "u1", document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
    expect(result.current.pendingLegalConsents).toEqual([]);
  });

  it("acepta un userId explícito en vez de tirar del de la sesión", async () => {
    const { result, consentsInsert } = await renderReadySession({ user_id: "u1", activated_at: null }, { consents: [] });

    await act(async () => {
      await result.current.acceptLegalConsents("other-user-id");
    });

    expect(consentsInsert).toHaveBeenCalledWith([
      { user_id: "other-user-id", document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { user_id: "other-user-id", document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
  });

  it("lanza si el insert falla y no vacía los pendientes", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      { consents: [], insertError: { message: "network" } }
    );

    await expect(result.current.acceptLegalConsents()).rejects.toBeTruthy();
    expect(result.current.pendingLegalConsents).toHaveLength(2);
  });

  it("trata un 23505 (fila ya insertada en un intento anterior) como éxito, no como fallo", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" },
      { consents: [], insertError: { code: "23505", message: "duplicate key value" } }
    );

    await act(async () => {
      await result.current.acceptLegalConsents();
    });

    expect(result.current.pendingLegalConsents).toEqual([]);
  });
});

describe("activateAccount", () => {
  it("activación desde cero: sin sesión, verifyOtp la crea y se completan los tres pasos en orden", async () => {
    const { result } = await renderWithoutSession();
    const mocks = setupFromMock({ profile: { user_id: "u1", activated_at: null }, consents: [] });
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.activateAccount({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "nueva-123",
      });
    });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-1", type: "recovery" });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "nueva-123" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ activated_at: expect.any(String) }));
    expect(mocks.consentsInsert).toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", window.location.pathname);

    replaceStateSpy.mockRestore();
  });

  it("verifyOtp falla (enlace usado o caducado): lanza el mensaje de enlace inválido", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.verifyOtp.mockResolvedValue({ data: null, error: { message: "Token has expired or is invalid" } });

    await expect(
      result.current.activateAccount({ tokenHash: "hash-1", type: "recovery", expectedEmail: "diver@example.com", password: "x" })
    ).rejects.toThrow("Este enlace ya no es válido");

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("reanudación: sesión existente con el mismo email, no vuelve a llamar a verifyOtp", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: null });
    const mocks = setupFromMock({ profile: { user_id: "u1", activated_at: null }, consents: [] });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.activateAccount({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: FAKE_SESSION.user.email,
        password: "nueva-123",
      });
    });

    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "nueva-123" });
    expect(mocks.consentsInsert).toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });

  it("sesión existente con email distinto: lanza sin tocar ni verifyOtp ni updateUser", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: null });

    await expect(
      result.current.activateAccount({ tokenHash: "hash-1", type: "recovery", expectedEmail: "otra@example.com", password: "x" })
    ).rejects.toThrow("No se pudo activar esta cuenta desde la sesión actual.");

    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("reintento tras un fallo parcial (Caso A): el primer intento falla al fijar la contraseña, el segundo no vuelve a llamar a verifyOtp", async () => {
    const { result } = await renderWithoutSession();
    setupFromMock({ profile: { user_id: "u1", activated_at: null }, consents: [] });
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValueOnce({ error: { message: "network" } });

    await expect(
      result.current.activateAccount({ tokenHash: "hash-1", type: "recovery", expectedEmail: "diver@example.com", password: "nueva-123" })
    ).rejects.toThrow("No se pudo guardar la contraseña. Inténtalo de nuevo.");

    expect(supabase.auth.verifyOtp).toHaveBeenCalledTimes(1);

    // El reintento llega con una sesión ya establecida — verifyOtp ya se
    // consumió en el intento anterior, así que ahora hay que simular eso.
    supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
    supabase.auth.updateUser.mockResolvedValueOnce({ error: null });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.activateAccount({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "nueva-123",
      });
    });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledTimes(1);

    replaceStateSpy.mockRestore();
  });

  it("reintento con la misma contraseña ya guardada (la contraseña sí se fijó la vez anterior, otro paso falló después): completa la activación en vez de quedarse atascada", async () => {
    const { result } = await renderWithoutSession();
    const mocks = setupFromMock({ profile: { user_id: "u1", activated_at: null }, consents: [] });
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({
      error: { message: "New password should be different from the old password.", code: "same_password" },
    });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.activateAccount({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "nueva-123",
      });
    });

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ activated_at: expect.any(String) }));
    expect(mocks.consentsInsert).toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });
});

// Recuperación de contraseña autoservicio — encargo explícito 2026-09-01:
// separada de activateAccount() precisamente para NO repetir la aceptación
// de bases legales (ya se hizo en el alta original). El contrato clave de
// todo este describe: consentsInsert (legal_consents) NUNCA se llama desde
// resetPassword(), en ningún escenario — a diferencia de activateAccount(),
// que sí lo llama siempre (ver describe de arriba).
describe("resetPassword", () => {
  it("recuperación desde cero: fija la contraseña y activated_at, pero NUNCA toca legal_consents", async () => {
    const { result } = await renderWithoutSession();
    const mocks = setupFromMock({ profile: { user_id: "u1", activated_at: "2026-08-01T00:00:00Z" }, consents: [] });
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.resetPassword({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: "diver@example.com",
        password: "nueva-123",
      });
    });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-1", type: "recovery" });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "nueva-123" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ activated_at: expect.any(String) }));
    expect(mocks.consentsInsert).not.toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", window.location.pathname);

    replaceStateSpy.mockRestore();
  });

  it("cuenta admin-creada nunca activada (activated_at null) que recupera por este camino: sí marca activated_at, sigue sin tocar legal_consents", async () => {
    const { result } = await renderWithoutSession();
    const mocks = setupFromMock({ profile: { user_id: "u1", activated_at: null }, consents: [] });
    supabase.auth.verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.resetPassword({ tokenHash: "hash-1", type: "recovery", expectedEmail: "diver@example.com", password: "nueva-123" });
    });

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ activated_at: expect.any(String) }));
    expect(mocks.consentsInsert).not.toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });

  it("verifyOtp falla (enlace usado o caducado): lanza el mensaje de enlace inválido, sin tocar updateUser ni legal_consents", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.verifyOtp.mockResolvedValue({ data: null, error: { message: "Token has expired or is invalid" } });

    await expect(
      result.current.resetPassword({ tokenHash: "hash-1", type: "recovery", expectedEmail: "diver@example.com", password: "x" })
    ).rejects.toThrow("Este enlace ya no es válido");

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("reanudación: sesión existente con el mismo email, no vuelve a llamar a verifyOtp", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: "2026-08-01T00:00:00Z" });
    const mocks = setupFromMock({ profile: { user_id: "u1", activated_at: "2026-08-01T00:00:00Z" }, consents: [] });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    await act(async () => {
      await result.current.resetPassword({
        tokenHash: "hash-1",
        type: "recovery",
        expectedEmail: FAKE_SESSION.user.email,
        password: "nueva-123",
      });
    });

    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "nueva-123" });
    expect(mocks.consentsInsert).not.toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });

  it("sesión existente con email distinto: lanza sin tocar ni verifyOtp ni updateUser", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: "2026-08-01T00:00:00Z" });

    await expect(
      result.current.resetPassword({ tokenHash: "hash-1", type: "recovery", expectedEmail: "otra@example.com", password: "x" })
    ).rejects.toThrow("No se pudo activar esta cuenta desde la sesión actual.");

    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});

// Cuenta desactivada — los dos bugs reportados en producción (2026-08-29):
// una sesión persistida de una cuenta ya desactivada llevaba a
// CreatePasswordScreen en vez de a login con aviso, y un login nuevo contra
// una cuenta desactivada mostraba el mismo mensaje genérico que credenciales
// incorrectas. Causa raíz común, confirmada contra el proyecto real (no
// asumida): getSession() no consulta al servidor mientras el access_token
// no haya caducado, así que nunca por sí sola detecta un baneo posterior a
// la emisión del token; solo las llamadas de auth.* que sí golpean GoTrue
// (getUser, signInWithPassword, verifyOtp, updateUser) devuelven
// error.code "user_banned". Estos tests fijan el contrato: cualquiera de
// esos puntos de entrada debe converger en accountBanned=true y
// session/profile=null.
describe("cuenta desactivada — restauración de sesión (recarga)", () => {
  it("sesión persistida de una cuenta ya baneada: getUser() lo detecta, cierra la sesión y no expone el profile", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "User is banned", code: "user_banned" } });

    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.accountBanned).toBe(true);
    expect(supabase.auth.signOut).toHaveBeenCalled();
    // El profile NUNCA debe llegar a consultarse para una cuenta baneada —
    // ver resolveSessionState en useSession.js, corta antes de loadProfile.
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("sesión persistida de una cuenta NO baneada: carga el profile con normalidad, accountBanned queda en false", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: "2026-01-01T00:00:00.000Z" });

    expect(result.current.accountBanned).toBe(false);
    expect(result.current.profile).toEqual(expect.objectContaining({ user_id: "u1" }));
  });

  it("un SIGNED_OUT disparado por el propio signOut() del baneo no borra accountBanned (no se resetea a false fuera de signIn)", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: "User is banned", code: "user_banned" } });
    let authCallback;
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.accountBanned).toBe(true));

    // Simula el SIGNED_OUT que el propio supabase.auth.signOut() de arriba
    // dispara en la app real.
    await act(async () => {
      authCallback("SIGNED_OUT", null);
    });

    expect(result.current.accountBanned).toBe(true);
  });
});

describe("cuenta desactivada — login (signIn)", () => {
  it("signInWithPassword devuelve user_banned: lanza el error tal cual y marca accountBanned", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: "User is banned", code: "user_banned" } });

    await act(async () => {
      await expect(result.current.signIn("cuenta@example.com", "x")).rejects.toMatchObject({ code: "user_banned" });
    });
    expect(result.current.accountBanned).toBe(true);
  });

  it("credenciales incorrectas normales: lanza sin marcar accountBanned", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials", code: "invalid_credentials" } });

    await act(async () => {
      await expect(result.current.signIn("cuenta@example.com", "x")).rejects.toBeTruthy();
    });
    expect(result.current.accountBanned).toBe(false);
  });

  it("un intento nuevo de signIn reinicia accountBanned a false, aunque el anterior hubiera detectado un baneo", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: "User is banned", code: "user_banned" } });
    await act(async () => {
      await expect(result.current.signIn("cuenta@example.com", "x")).rejects.toMatchObject({ code: "user_banned" });
    });
    expect(result.current.accountBanned).toBe(true);

    supabase.auth.signInWithPassword.mockResolvedValueOnce({ error: null });
    await act(async () => {
      await result.current.signIn("cuenta@example.com", "correcta-ya-reactivada");
    });

    expect(result.current.accountBanned).toBe(false);
  });
});

describe("política de contraseña reforzada — login (signIn)", () => {
  it("contraseña sin mayúscula ni símbolo: marca forcedPasswordUpdate tras un login correcto", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.signIn("cuenta@example.com", "password123");
    });

    expect(result.current.forcedPasswordUpdate).toBe(true);
  });

  it("contraseña que ya cumple la política: no marca forcedPasswordUpdate", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.signIn("cuenta@example.com", "Password123!");
    });

    expect(result.current.forcedPasswordUpdate).toBe(false);
  });

  it("credenciales incorrectas: no llega a comprobar la política (sigue en false)", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials", code: "invalid_credentials" } });

    await act(async () => {
      await expect(result.current.signIn("cuenta@example.com", "password123")).rejects.toBeTruthy();
    });

    expect(result.current.forcedPasswordUpdate).toBe(false);
  });

  it("updateForcedPassword guarda la contraseña nueva y cierra el gate", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    await act(async () => {
      await result.current.signIn("cuenta@example.com", "password123");
    });
    expect(result.current.forcedPasswordUpdate).toBe(true);

    supabase.auth.updateUser.mockResolvedValue({ error: null });
    await act(async () => {
      await result.current.updateForcedPassword("Password123!");
    });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "Password123!" });
    expect(result.current.forcedPasswordUpdate).toBe(false);
  });
});

describe("cuenta desactivada — activateAccount (pantalla de activación abierta o enlace nuevo)", () => {
  it("verifyOtp falla con user_banned (enlace nuevo para una cuenta ya desactivada): mensaje unificado, no 'enlace inválido'", async () => {
    const { result } = await renderWithoutSession();
    supabase.auth.verifyOtp.mockResolvedValue({ data: null, error: { message: "User is banned", code: "user_banned" } });

    await act(async () => {
      await expect(
        result.current.activateAccount({ tokenHash: "hash-1", type: "recovery", expectedEmail: "diver@example.com", password: "x" })
      ).rejects.toThrow(ACCOUNT_DEACTIVATED_MESSAGE);
    });

    expect(result.current.accountBanned).toBe(true);
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("sesión ya abierta (pantalla de activación en curso) y la cuenta se desactiva mientras tanto: completePasswordChange falla con user_banned, cierra la sesión y prevalece el estado desactivado", async () => {
    const { result } = await renderReadySession({ user_id: "u1", activated_at: null });
    supabase.auth.updateUser.mockResolvedValue({ error: { message: "User is banned", code: "user_banned" } });

    await act(async () => {
      await expect(
        result.current.activateAccount({ tokenHash: "hash-1", type: "recovery", expectedEmail: FAKE_SESSION.user.email, password: "nueva-123" })
      ).rejects.toThrow(ACCOUNT_DEACTIVATED_MESSAGE);
    });

    expect(result.current.accountBanned).toBe(true);
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

// Regresión real (no solo teórica, ver comentario en useSession.js): un
// login normal disparaba onAuthStateChange, que antes hacía
// setSession → await → setProfile → await → setConsents, tres renders
// separados en vez de uno. En el primero, `session` ya era la nueva
// sesión pero `profile` seguía siendo el de antes (null en un login
// fresco) — AuthGate leía ese instante como "sin activar" y mostraba
// CreatePasswordScreen un instante de más, incluso para una cuenta ya
// completamente activada. Estas pruebas fijan el contrato correcto:
// session/profile/consents cambian juntos, en el mismo render.
describe("onAuthStateChange — session/profile/consents cambian en un único render", () => {
  it("no actualiza session hasta que profile y consents también están listos", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    let authCallback;
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    // loadProfile queda pendiente a propósito (promesa controlada a mano)
    // para poder inspeccionar el estado MIENTRAS sigue sin resolver — con
    // el código antiguo, setSession se ejecutaba de forma síncrona antes
    // de este punto (antes del primer await), así que session ya habría
    // cambiado aquí aunque el perfil siguiera sin llegar. Con el fix
    // (Promise.all antes de cualquier setState), session debe seguir
    // siendo null hasta que este fetch también resuelva.
    let resolveProfileFetch;
    const profileFetch = new Promise((resolve) => { resolveProfileFetch = resolve; });
    const single = vi.fn().mockReturnValue(profileFetch);
    const selectEq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq: selectEq });
    const consentsSelectEq = vi.fn().mockResolvedValue({
      data: [
        { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
        { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
      ],
      error: null,
    });
    const consentsSelect = vi.fn().mockReturnValue({ eq: consentsSelectEq });
    supabase.from.mockImplementation((table) => (
      table === "legal_consents" ? { select: consentsSelect } : { select }
    ));

    act(() => {
      authCallback("SIGNED_IN", FAKE_SESSION); // sin await: se deja "en vuelo" a propósito
    });

    // Mientras loadProfile sigue pendiente, session NO debe haber cambiado
    // todavía — es exactamente el instante que AuthGate leía mal antes del
    // fix (session ya puesta, profile del usuario anterior).
    expect(result.current.session).toBeNull();

    await act(async () => {
      resolveProfileFetch({ data: { user_id: "u1", activated_at: "2026-08-01T00:00:00Z" }, error: null });
      await profileFetch;
      await Promise.resolve(); // deja que el Promise.all y los setState encadenados se asienten
    });

    // Ahora sí: session y profile llegan juntos, en el mismo instante.
    expect(result.current.session).toEqual(FAKE_SESSION);
    expect(result.current.profile).toEqual(expect.objectContaining({ activated_at: "2026-08-01T00:00:00Z" }));
    expect(result.current.pendingLegalConsents).toEqual([]);
  });
});
