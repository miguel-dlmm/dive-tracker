vi.mock("./supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    auth: { updateUser: vi.fn(), getSession: vi.fn(), signInWithPassword: vi.fn() },
  },
}));

// signature_pad necesita un canvas 2D real que jsdom no implementa — mismo
// límite del sistema ya documentado donde se usa SignatureCapture en
// Training Records (ver TrainingRecordsTab.test.jsx).
vi.mock("signature_pad", () => ({
  default: vi.fn().mockImplementation(function MockSignaturePad() {
    return { clear: vi.fn(), off: vi.fn(), isEmpty: vi.fn().mockReturnValue(true), toDataURL: vi.fn(), addEventListener: vi.fn() };
  }),
}));

import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileTab from "./ProfileTab";
import { ToastProvider } from "./shared";
import { supabase } from "./supabaseClient";
import i18n from "./i18n";

const PROFILE = { user_id: "u1", first_name: "Ada", last_name: "Lovelace", nickname: "ada", avatar_icon: "Fish", avatar_color: "#0F766E" };
const CURRENCIES = { rows: [{ code: "EUR", name: "Euro", symbol: "€", is_default: true }, { code: "USD", name: "Dólar", symbol: "$" }], loaded: true };

function mockUpdate(result = { error: null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ update });
  return { update, eq };
}

function renderProfile(overrides = {}) {
  const onProfileUpdated = vi.fn();
  const onAccountDeleted = vi.fn();
  render(
    <ToastProvider>
      <ProfileTab profile={PROFILE} currencies={CURRENCIES} onProfileUpdated={onProfileUpdated} onAccountDeleted={onAccountDeleted} {...overrides} />
    </ToastProvider>
  );
  return { onProfileUpdated, onAccountDeleted };
}

beforeEach(() => {
  supabase.from.mockReset();
  supabase.auth.updateUser.mockReset();
  supabase.auth.getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "tok-1" } } });
  supabase.auth.signInWithPassword.mockReset();
  global.fetch = vi.fn();
  try { localStorage.clear(); } catch { /* noop */ }
});

it("nada si no hay perfil todavía", () => {
  render(<ToastProvider><ProfileTab profile={null} currencies={CURRENCIES} /></ToastProvider>);
  expect(screen.queryByText("Datos personales")).not.toBeInTheDocument();
});

describe("avatar", () => {
  it("elegir un icono no guarda nada hasta pulsar Guardar", async () => {
    const user = userEvent.setup();
    const { update } = mockUpdate();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Cambiar avatar" }));
    await user.click(screen.getByRole("button", { name: "Icono Anchor" }));

    expect(update).not.toHaveBeenCalled();
  });

  it("permite probar varios iconos/colores y solo guarda la selección final al pulsar Guardar", async () => {
    const user = userEvent.setup();
    const { update, eq } = mockUpdate();
    const { onProfileUpdated } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Cambiar avatar" }));
    await user.click(screen.getByRole("button", { name: "Icono Anchor" }));
    await user.click(screen.getByRole("button", { name: "Icono Turtle" }));
    await user.click(screen.getByRole("button", { name: "Color teal" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ avatar_icon: "Turtle", avatar_color: "#0F766E" });
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(onProfileUpdated).toHaveBeenCalledWith({ avatar_icon: "Turtle", avatar_color: "#0F766E" });
  });

  it("Cancelar descarta la selección probada y no guarda nada", async () => {
    const user = userEvent.setup();
    const { update } = mockUpdate();
    const { onProfileUpdated } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Cambiar avatar" }));
    await user.click(screen.getByRole("button", { name: "Icono Anchor" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(update).not.toHaveBeenCalled();
    expect(onProfileUpdated).not.toHaveBeenCalled();
  });

  it("tras cancelar, reabrir el selector parte del avatar guardado, no del borrador descartado", async () => {
    const user = userEvent.setup();
    mockUpdate();
    renderProfile();

    await user.click(screen.getByRole("button", { name: "Cambiar avatar" }));
    await user.click(screen.getByRole("button", { name: "Icono Anchor" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await user.click(screen.getByRole("button", { name: "Cambiar avatar" }));
    expect(screen.getByRole("button", { name: "Icono Fish" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Icono Anchor" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("datos personales", () => {
  // Acotado con within(): InstructorSection (Fase 5, Training Records)
  // también usa botones "Editar"/"Guardar" en su propia SectionCard, así
  // que screen.getByRole sin acotar ya no es único.
  const personalDataSection = () => screen.getByText("Datos personales").closest("div");

  it("edita nombre/apellidos/nickname y guarda, autogenerando las iniciales de instructor porque el perfil no tenía ninguna", async () => {
    const user = userEvent.setup();
    const { update, eq } = mockUpdate();
    const { onProfileUpdated } = renderProfile();

    await user.click(within(personalDataSection()).getByRole("button", { name: "Editar" }));
    const nickname = screen.getByDisplayValue("ada");
    await user.clear(nickname);
    await user.type(nickname, "adalovelace");
    await user.click(within(personalDataSection()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ first_name: "Ada", last_name: "Lovelace", nickname: "adalovelace", instructor_initials: "AL" }));
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(onProfileUpdated).toHaveBeenCalled();
  });

  it("no autogenera las iniciales de instructor si el perfil ya tenía unas guardadas a mano", async () => {
    const user = userEvent.setup();
    const { update } = mockUpdate();
    renderProfile({ profile: { ...PROFILE, instructor_initials: "XX" } });

    await user.click(within(personalDataSection()).getByRole("button", { name: "Editar" }));
    const nickname = screen.getByDisplayValue("ada");
    await user.clear(nickname);
    await user.type(nickname, "adalovelace");
    await user.click(within(personalDataSection()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ first_name: "Ada", last_name: "Lovelace", nickname: "adalovelace" }));
  });

  it("no deja guardar un nickname con \"@\"", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(within(personalDataSection()).getByRole("button", { name: "Editar" }));
    const nickname = screen.getByDisplayValue("ada");
    await user.clear(nickname);
    await user.type(nickname, "ada@x.com");

    expect(screen.getByText('No puede contener "@".')).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("muestra un mensaje legible si el nickname ya está en uso", async () => {
    const user = userEvent.setup();
    mockUpdate({ error: { code: "23505", message: "duplicate key value violates unique constraint \"profiles_nickname_lower_key\"" } });
    renderProfile();

    await user.click(within(personalDataSection()).getByRole("button", { name: "Editar" }));
    await user.click(within(personalDataSection()).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ese nickname ya está en uso.")).toBeInTheDocument();
  });
});

describe("datos de instructor", () => {
  const instructorSection = () => document.getElementById("instructor-section");

  it("muestra — por defecto cuando el perfil no tiene datos de instructor", () => {
    renderProfile();
    const section = within(instructorSection());
    expect(section.getByText("Iniciales:")).toBeInTheDocument();
    // Iniciales, número SSI Pro y firma — las 3 vacías por defecto.
    expect(section.getAllByText("—")).toHaveLength(3);
  });

  it("edita iniciales y número SSI Pro y guarda", async () => {
    const user = userEvent.setup();
    const { update, eq } = mockUpdate();
    const { onProfileUpdated } = renderProfile();

    await user.click(within(instructorSection()).getByRole("button", { name: "Editar" }));
    await user.type(within(instructorSection()).getByRole("textbox", { name: "Iniciales" }), "al");
    await user.type(within(instructorSection()).getByRole("textbox", { name: "Número SSI Pro" }), "98765");
    await user.click(within(instructorSection()).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ instructor_initials: "AL", ssi_pro_number: "98765", instructor_signature: null }));
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(onProfileUpdated).toHaveBeenCalled();
  });
});

describe("moneda favorita", () => {
  it("un usuario que nunca ha elegido moneda ve inicializada la favorita global (currencies.is_default), no un placeholder en blanco", async () => {
    renderProfile();

    expect(await screen.findByText("EUR — Euro (€)")).toBeInTheDocument();
    expect(localStorage.getItem("oceanpulse:favoriteCurrency:u1")).toBe("EUR");
  });

  it("si ninguna moneda tiene is_default, inicializa con la primera del catálogo", async () => {
    const noDefault = { rows: [{ code: "USD", name: "Dólar", symbol: "$" }, { code: "GBP", name: "Libra", symbol: "£" }], loaded: true };
    renderProfile({ currencies: noDefault });

    expect(await screen.findByText("USD — Dólar ($)")).toBeInTheDocument();
    expect(localStorage.getItem("oceanpulse:favoriteCurrency:u1")).toBe("USD");
  });

  it("no pisa una moneda favorita ya elegida por el usuario", async () => {
    localStorage.setItem("oceanpulse:favoriteCurrency:u1", "USD");
    renderProfile();

    expect(await screen.findByText("USD — Dólar ($)")).toBeInTheDocument();
    expect(localStorage.getItem("oceanpulse:favoriteCurrency:u1")).toBe("USD");
  });

  it("elegir otra moneda la guarda en localStorage con la clave por usuario", async () => {
    const user = userEvent.setup();
    renderProfile();
    await screen.findByText("EUR — Euro (€)");

    await user.click(screen.getByRole("button", { name: "Sin elegir — usa la moneda por defecto de la app" }));
    await user.click(screen.getByText("USD — Dólar ($)"));

    expect(localStorage.getItem("oceanpulse:favoriteCurrency:u1")).toBe("USD");
  });
});

describe("contraseña", () => {
  it("el botón sigue deshabilitado hasta que hay contraseña actual, la nueva tiene 8+ caracteres y coincide con la confirmación", async () => {
    const user = userEvent.setup();
    renderProfile();
    const current = screen.getByLabelText("Contraseña actual");
    const password = screen.getByLabelText("Nueva contraseña");
    const confirm = screen.getByLabelText("Confirmar contraseña");

    await user.type(password, "corta");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeDisabled();

    await user.type(confirm, "corta");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeDisabled();

    await user.clear(password);
    await user.clear(confirm);
    await user.type(password, "contraseñaLarga1");
    await user.type(confirm, "contraseñaLarga1");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeDisabled();

    await user.type(current, "laActual1");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).not.toBeDisabled();
  });

  it("verifica la contraseña actual con signInWithPassword antes de guardar la nueva", async () => {
    const user = userEvent.setup();
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { email: "ada@example.com" } } } });
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    renderProfile();

    await user.type(screen.getByLabelText("Contraseña actual"), "laActual1");
    await user.type(screen.getByLabelText("Nueva contraseña"), "contraseñaLarga1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contraseñaLarga1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "ada@example.com", password: "laActual1" }));
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "contraseñaLarga1" });
  });

  it("si la contraseña actual es incorrecta, no cambia la contraseña y muestra el error junto al campo", async () => {
    const user = userEvent.setup();
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { email: "ada@example.com" } } } });
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    supabase.auth.updateUser.mockResolvedValue({ error: null });
    renderProfile();

    await user.type(screen.getByLabelText("Contraseña actual"), "incorrecta");
    await user.type(screen.getByLabelText("Nueva contraseña"), "contraseñaLarga1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "contraseñaLarga1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Contraseña actual incorrecta.")).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("privacidad — eliminar cuenta", () => {
  it("pide confirmación antes de llamar al endpoint", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Release V1, Fase 1 (encargo explícito): tras confirmar, un segundo
  // paso exige escribir la palabra CANCELAR antes de poder borrar de
  // verdad — nunca basta con un único toque de confirmación.
  it("tras confirmar, pide escribir CANCELAR y el botón de borrar sigue deshabilitado hasta que coincide exactamente", async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByText("Continuar"));

    const deleteButton = screen.getByRole("button", { name: /^Eliminar cuenta$/ });
    expect(deleteButton).toBeDisabled();

    const input = screen.getByLabelText(/Escribe CANCELAR/i);
    await user.type(input, "cancelar");
    expect(deleteButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, "CANCELAR");
    expect(deleteButton).not.toBeDisabled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("al escribir CANCELAR y confirmar, llama a /api/delete-own-account con el token de sesión y avisa al padre", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ deleted: true }) });
    const { onAccountDeleted } = renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByText("Continuar"));
    await user.type(screen.getByLabelText(/Escribe CANCELAR/i), "CANCELAR");
    await user.click(screen.getByRole("button", { name: /^Eliminar cuenta$/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/delete-own-account", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer tok-1" }),
    })));
    expect(onAccountDeleted).toHaveBeenCalled();
  });

  it("si el servidor rechaza el borrado (p.ej. cuenta superadmin), muestra el error y no cierra sesión", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: "Una cuenta superadmin no puede eliminarse a sí misma desde aquí." }) });
    const { onAccountDeleted } = renderProfile();

    await user.click(screen.getByRole("button", { name: /Eliminar mi cuenta/ }));
    await user.click(within(screen.getByRole("alertdialog")).getByText("Continuar"));
    await user.type(screen.getByLabelText(/Escribe CANCELAR/i), "CANCELAR");
    await user.click(screen.getByRole("button", { name: /^Eliminar cuenta$/ }));

    expect(await screen.findByText("Una cuenta superadmin no puede eliminarse a sí misma desde aquí.")).toBeInTheDocument();
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });
});

// Release V1, Fase 2 (multidioma): selector de idioma en Mi perfil —
// única sección que cambia el idioma de toda la app al elegir una opción,
// no solo guarda un dato. afterEach fuerza 'es' de vuelta: i18n es un
// singleton de módulo, así que un test que deja el idioma en "en" filtra
// a los siguientes tests de este mismo archivo si no se resetea (mismo
// cuidado que ya tomó el fork de auth.json en RegisterScreen.test.jsx).
describe("idioma", () => {
  afterEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("muestra Español como opción actual cuando profile.language es 'es'", () => {
    renderProfile({ profile: { ...PROFILE, language: "es" } });
    expect(screen.getByRole("button", { name: "Selecciona un idioma" })).toHaveTextContent("Español");
  });

  it("elegir English actualiza profiles.language, notifica al padre y cambia el idioma de la app", async () => {
    const user = userEvent.setup();
    const { update, eq } = mockUpdate({ error: null });
    const { onProfileUpdated } = renderProfile({ profile: { ...PROFILE, language: "es" } });

    await user.click(screen.getByRole("button", { name: "Selecciona un idioma" }));
    await user.click(screen.getByRole("option", { name: "English" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ language: "en" }));
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
    expect(onProfileUpdated).toHaveBeenCalledWith({ language: "en" });
    await waitFor(() => expect(i18n.language).toBe("en"));
  });
});

// Fase 4, Release V1: "Cerrar sesión" se movió de la cabecera (App.jsx) a
// Mi perfil — ver el test equivalente en App.test.jsx para la cobertura de
// extremo a extremo (icono ya no en la cabecera + sí en Mi perfil). Aquí
// solo se prueba el componente en aislamiento.
describe("cerrar sesión", () => {
  it("sin onSignOut, no muestra el botón (uso fuera de App.jsx, p. ej. en otros tests)", () => {
    renderProfile();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
  });

  it("con onSignOut, el botón lo llama al pulsarlo", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    renderProfile({ onSignOut });

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
