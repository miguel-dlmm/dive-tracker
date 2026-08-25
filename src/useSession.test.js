vi.mock("./supabaseClient.js", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { useSession } from "./useSession";
import { supabase } from "./supabaseClient";
import { DOCUMENT_TYPE as PRIVACY_TYPE, VERSION as PRIVACY_VERSION } from "./legal/privacyPolicy";
import { DOCUMENT_TYPE as TERMS_TYPE, VERSION as TERMS_VERSION } from "./legal/termsOfUse";

const FAKE_SESSION = { user: { id: "u1" } };

function setupFromMock({ profile, profileError = null, updateError = null, consents = [], consentsError = null, insertError = null }) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: profileError });
  const selectEq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq: selectEq });

  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const consentsSelectEq = vi.fn().mockResolvedValue({ data: consents, error: consentsError });
  const consentsSelect = vi.fn().mockReturnValue({ eq: consentsSelectEq });
  const consentsInsert = vi.fn().mockResolvedValue({ error: insertError });

  supabase.from.mockImplementation((table) => {
    if (table === "legal_consents") return { select: consentsSelect, insert: consentsInsert };
    return { select, update };
  });

  return { update, updateEq, consentsSelect, consentsSelectEq, consentsInsert };
}

beforeEach(() => {
  supabase.auth.getSession.mockReset();
  supabase.auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  supabase.auth.updateUser.mockReset();
  supabase.from.mockReset();
});

async function renderReadySession(profile = { user_id: "u1", password_set: false }, extra = {}) {
  supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
  const mocks = setupFromMock({ profile, ...extra });

  const { result } = renderHook(() => useSession());
  await waitFor(() => expect(result.current.loading).toBe(false));

  return { result, ...mocks };
}

describe("completePasswordChange", () => {
  it("fija la contraseña, marca password_set=true en profiles y actualiza el profile en memoria", async () => {
    const { result, update, updateEq } = await renderReadySession();
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.completePasswordChange("nueva-contraseña-123");
    });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "nueva-contraseña-123" });
    expect(update).toHaveBeenCalledWith({ password_set: true });
    expect(updateEq).toHaveBeenCalledWith("user_id", "u1");
    expect(result.current.profile.password_set).toBe(true);
  });

  it("lanza y no toca profiles si auth.updateUser falla", async () => {
    const { result, update } = await renderReadySession();
    supabase.auth.updateUser.mockResolvedValue({ error: { message: "weak password" } });

    await expect(result.current.completePasswordChange("x")).rejects.toBeTruthy();
    expect(update).not.toHaveBeenCalled();
    expect(result.current.profile.password_set).toBe(false);
  });

  it("lanza si auth.updateUser tiene éxito pero falla el update de profiles", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
    setupFromMock({ profile: { user_id: "u1", password_set: false }, updateError: { message: "network" } });
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    await expect(result.current.completePasswordChange("x")).rejects.toBeTruthy();
    expect(result.current.profile.password_set).toBe(false);
  });
});

describe("pendingLegalConsents", () => {
  it("incluye ambos documentos si el usuario no ha aceptado nada", async () => {
    const { result } = await renderReadySession({ user_id: "u1", password_set: true }, { consents: [] });

    expect(result.current.pendingLegalConsents).toEqual([
      { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
  });

  it("no queda ninguno pendiente si el usuario ya aceptó las versiones vigentes", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", password_set: true },
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
      { user_id: "u1", password_set: true },
      { consents: [{ document_type: PRIVACY_TYPE, document_version: "v0" }] }
    );

    expect(result.current.pendingLegalConsents).toEqual([
      { document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
  });
});

describe("acceptLegalConsents", () => {
  it("inserta las filas que faltan y las refleja en pendingLegalConsents", async () => {
    const { result, consentsInsert } = await renderReadySession({ user_id: "u1", password_set: true }, { consents: [] });

    await act(async () => {
      await result.current.acceptLegalConsents();
    });

    expect(consentsInsert).toHaveBeenCalledWith([
      { user_id: "u1", document_type: PRIVACY_TYPE, document_version: PRIVACY_VERSION },
      { user_id: "u1", document_type: TERMS_TYPE, document_version: TERMS_VERSION },
    ]);
    expect(result.current.pendingLegalConsents).toEqual([]);
  });

  it("lanza si el insert falla y no vacía los pendientes", async () => {
    const { result } = await renderReadySession(
      { user_id: "u1", password_set: true },
      { consents: [], insertError: { message: "network" } }
    );

    await expect(result.current.acceptLegalConsents()).rejects.toBeTruthy();
    expect(result.current.pendingLegalConsents).toHaveLength(2);
  });
});
