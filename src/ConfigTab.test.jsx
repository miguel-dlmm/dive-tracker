import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigTab from "./ConfigTab";

// Rediseño 2026-08-29 (ver docs/ADR/0008-rediseno-configuracion.md): menú
// agrupado con drill-down en vez de pestañas horizontales, y creación en
// CrudTable vía FAB + hoja inferior en vez de un formulario fijo. Estas
// pruebas cubren el contrato nuevo, no cada catálogo uno a uno — el mismo
// CrudTable sirve a Escuelas/Cursos/Tipos de pago/Estados de pago/Monedas,
// así que basta con probarlo una vez (aquí, vía Escuelas).
const rowsHook = (rows) => ({
  rows, loaded: true,
  insertRow: vi.fn().mockResolvedValue(rows[0]),
  updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn(),
});
const emptyHook = rowsHook([]);

function baseProps(overrides = {}) {
  return {
    schools: rowsHook([{ id: "s1", name: "PADI Cozumel" }]),
    activities: emptyHook,
    currencies: rowsHook([{ code: "EUR", symbol: "€", name: "Euro", is_default: true }]),
    paymentTypes: emptyHook,
    paymentStatuses: emptyHook,
    rates: emptyHook,
    commissionRates: emptyHook,
    worklog: emptyHook,
    comisiones: emptyHook,
    navSections: rowsHook([]),
    appConfig: rowsHook([{ logo_icon: "Waves" }]),
    profile: { user_id: "u1", is_admin: false, is_superadmin: false },
    ...overrides,
  };
}

describe("ConfigTab — menú agrupado", () => {
  it("muestra el grupo de negocio para cualquier usuario, sin el grupo de administración", () => {
    render(<ConfigTab {...baseProps()} />);

    expect(screen.getByText("Escuelas")).toBeInTheDocument();
    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.getByText("Tarifas")).toBeInTheDocument();
    expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("muestra también el grupo de administración a un admin", () => {
    render(<ConfigTab {...baseProps({ profile: { user_id: "u1", is_admin: true, is_superadmin: false } })} />);

    expect(screen.getByText("Administración")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Monedas")).toBeInTheDocument();
  });

  it("entrar en una sección muestra 'Configuración' para volver, y volver restaura el menú", async () => {
    const user = userEvent.setup();
    render(<ConfigTab {...baseProps()} />);

    await user.click(screen.getByText("Escuelas"));
    expect(screen.getByRole("heading", { name: "Escuelas" })).toBeInTheDocument();
    expect(screen.queryByText("Cursos")).not.toBeInTheDocument();

    await user.click(screen.getByText("Configuración"));
    expect(screen.getByText("Cursos")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Escuelas" })).not.toBeInTheDocument();
  });
});

describe("ConfigTab — CrudTable crea vía FAB + hoja (ver Escuelas)", () => {
  it("el formulario de alta no es visible hasta pulsar el FAB, y crear cierra la hoja", async () => {
    const user = userEvent.setup();
    const schools = rowsHook([{ id: "s1", name: "PADI Cozumel" }]);
    render(<ConfigTab {...baseProps({ schools })} />);
    await user.click(screen.getByText("Escuelas"));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva escuela" }));
    expect(screen.getByRole("heading", { name: "Nueva escuela" })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Nombre"), "Ihasia");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(schools.insertRow).toHaveBeenCalledWith(expect.objectContaining({ name: "Ihasia" }));
    expect(screen.queryByRole("heading", { name: "Nueva escuela" })).not.toBeInTheDocument();
  });
});
