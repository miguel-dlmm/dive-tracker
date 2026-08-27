vi.mock("./supabaseClient", () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn(() => ({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigTab from "./ConfigTab";

// "Configuración → Experimental → Preview de diseños" debe verse solo para
// superadmin (más restrictivo que el resto de secciones de admin, que ya
// se ven con is_admin). Ver ExperimentalLab / SUPERADMIN_SECTIONS en
// ConfigTab.jsx — el laboratorio en sí (src/lab/) tiene su propia
// cobertura en DesignLabShell.test.jsx.

const emptyHook = { rows: [], loaded: true, insertRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn() };

function renderConfigTab(profile) {
  return render(
    <ConfigTab
      schools={emptyHook} activities={emptyHook} currencies={emptyHook} paymentTypes={emptyHook} paymentStatuses={emptyHook}
      rates={emptyHook} commissionRates={emptyHook} worklog={emptyHook} comisiones={emptyHook}
      navSections={emptyHook} appConfig={emptyHook} profile={profile}
    />
  );
}

describe("ConfigTab — sección Experimental", () => {
  it("un admin normal (no superadmin) no ve la sección Experimental", () => {
    renderConfigTab({ user_id: "u1", is_admin: true, is_superadmin: false });
    expect(screen.queryByRole("button", { name: "Experimental" })).not.toBeInTheDocument();
  });

  it("un superadmin ve Experimental y puede abrir y cerrar el laboratorio visual", async () => {
    const user = userEvent.setup();
    renderConfigTab({ user_id: "u1", is_admin: true, is_superadmin: true });

    await user.click(screen.getByRole("button", { name: "Experimental" }));
    expect(screen.getByText("Preview de diseños")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir laboratorio visual" }));
    expect(screen.getByRole("dialog", { name: "Laboratorio visual de diseño" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar laboratorio" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
