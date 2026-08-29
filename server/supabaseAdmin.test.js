vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.hoisted(() => {
  process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
});

import { createClient } from "@supabase/supabase-js";
import { getServiceRoleClient, verifyCaller, isSuperadmin } from "./supabaseAdmin.js";

const ENV = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};
const ENV_KEYS = Object.keys(ENV);

async function hasServerConfigWithEnv(overrides) {
  const previous = {};
  for (const key of ENV_KEYS) previous[key] = process.env[key];
  try {
    for (const key of ENV_KEYS) {
      const value = key in overrides ? overrides[key] : ENV[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.resetModules();
    const mod = await import("./supabaseAdmin.js");
    return mod.hasServerConfig();
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    vi.resetModules();
  }
}

beforeEach(() => {
  createClient.mockReset();
});

describe("hasServerConfig", () => {
  it("es true cuando las tres variables de entorno están presentes", async () => {
    expect(await hasServerConfigWithEnv({})).toBe(true);
  });

  it("es false si falta SUPABASE_SERVICE_ROLE_KEY", async () => {
    expect(await hasServerConfigWithEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined })).toBe(false);
  });

  it("es false si falta VITE_SUPABASE_URL", async () => {
    expect(await hasServerConfigWithEnv({ VITE_SUPABASE_URL: undefined })).toBe(false);
  });

  it("es false si falta VITE_SUPABASE_ANON_KEY", async () => {
    expect(await hasServerConfigWithEnv({ VITE_SUPABASE_ANON_KEY: undefined })).toBe(false);
  });
});

describe("getServiceRoleClient", () => {
  it("crea el cliente con la service role key, nunca con la anon key", () => {
    const fakeClient = {};
    createClient.mockReturnValue(fakeClient);

    const client = getServiceRoleClient();

    expect(createClient).toHaveBeenCalledWith(ENV.VITE_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY);
    expect(client).toBe(fakeClient);
  });
});

describe("verifyCaller", () => {
  it("devuelve el usuario real cuando el token es válido", async () => {
    const fakeUser = { id: "user-1" };
    const getUser = vi.fn().mockResolvedValue({ data: { user: fakeUser }, error: null });
    createClient.mockReturnValue({ auth: { getUser } });

    const result = await verifyCaller("token-abc");

    expect(result).toBe(fakeUser);
    expect(createClient).toHaveBeenCalledWith(ENV.VITE_SUPABASE_URL, ENV.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: "Bearer token-abc" } },
    });
  });

  it("devuelve null si Supabase Auth devuelve error", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: null, error: { message: "invalid token" } });
    createClient.mockReturnValue({ auth: { getUser } });

    expect(await verifyCaller("bad-token")).toBeNull();
  });

  it("devuelve null si no hay usuario en la respuesta", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
    createClient.mockReturnValue({ auth: { getUser } });

    expect(await verifyCaller("token")).toBeNull();
  });
});

describe("isSuperadmin", () => {
  // getServiceRoleClient() memoiza el cliente dentro del módulo, y ese
  // singleton ya quedó fijado por el describe anterior — se recarga el
  // módulo para partir de un cliente limpio en cada caso.
  async function isSuperadminWithProfile(result) {
    const single = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    createClient.mockReturnValue({ from });

    vi.resetModules();
    const mod = await import("./supabaseAdmin.js");
    return mod.isSuperadmin("user-1");
  }

  afterEach(() => {
    vi.resetModules();
  });

  it("es true si el perfil tiene is_superadmin = true", async () => {
    expect(await isSuperadminWithProfile({ data: { is_superadmin: true }, error: null })).toBe(true);
  });

  it("es false si el perfil tiene is_superadmin = false", async () => {
    expect(await isSuperadminWithProfile({ data: { is_superadmin: false }, error: null })).toBe(false);
  });

  it("es false (fail-closed) si Supabase devuelve error", async () => {
    expect(await isSuperadminWithProfile({ data: null, error: { message: "not found" } })).toBe(false);
  });
});

describe("isAdmin", () => {
  async function isAdminWithProfile(result) {
    const single = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    createClient.mockReturnValue({ from });

    vi.resetModules();
    const mod = await import("./supabaseAdmin.js");
    return mod.isAdmin("user-1");
  }

  afterEach(() => {
    vi.resetModules();
  });

  it("es true si el perfil tiene is_admin = true", async () => {
    expect(await isAdminWithProfile({ data: { is_admin: true, is_superadmin: false }, error: null })).toBe(true);
  });

  it("es true si el perfil tiene is_superadmin = true (un superadmin también es admin)", async () => {
    expect(await isAdminWithProfile({ data: { is_admin: false, is_superadmin: true }, error: null })).toBe(true);
  });

  it("es false si el perfil no tiene ningún rol de admin", async () => {
    expect(await isAdminWithProfile({ data: { is_admin: false, is_superadmin: false }, error: null })).toBe(false);
  });

  it("es false (fail-closed) si Supabase devuelve error", async () => {
    expect(await isAdminWithProfile({ data: null, error: { message: "not found" } })).toBe(false);
  });
});
