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

const FAKE_SESSION = { user: { id: "u1" } };

function setupFromMock({ profile, profileError = null, updateError = null }) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: profileError });
  const selectEq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq: selectEq });

  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  supabase.from.mockReturnValue({ select, update });
  return { update, updateEq };
}

beforeEach(() => {
  supabase.auth.getSession.mockReset();
  supabase.auth.onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  supabase.auth.updateUser.mockReset();
  supabase.from.mockReset();
});

async function renderReadySession(profile = { user_id: "u1", password_set: false }) {
  supabase.auth.getSession.mockResolvedValue({ data: { session: FAKE_SESSION } });
  const mocks = setupFromMock({ profile });

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
