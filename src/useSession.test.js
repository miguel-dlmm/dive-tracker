vi.mock("./supabaseClient.js", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { useSession } from "./useSession";
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
  supabase.auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  supabase.auth.updateUser.mockReset();
  supabase.auth.verifyOtp.mockReset();
  supabase.from.mockReset();
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
