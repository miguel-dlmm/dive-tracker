vi.mock("./useSupabaseTable", () => ({ useSupabaseTable: vi.fn() }));
vi.mock("./supabaseClient", () => ({ supabase: { from: vi.fn() } }));

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatasetsSection from "./DatasetsSection";
import { ToastProvider } from "./shared";
import { useSupabaseTable } from "./useSupabaseTable";
import { supabase } from "./supabaseClient";

const IHASIA = { id: "d1", key: "ihasia", label: "Ihasia", is_active: true, is_default: true };
const OTHER = { id: "d2", key: "otro", label: "Otro", is_active: false, is_default: false };

function datasetsHook(rows, overrides = {}) {
  return {
    rows, loaded: true,
    insertRow: vi.fn().mockResolvedValue({ id: "new-1", key: "nuevo", label: "Nuevo" }),
    updateRow: vi.fn().mockResolvedValue({}),
    deleteRow: vi.fn().mockResolvedValue(),
    bulkUpdateWhere: vi.fn(),
    setDefault: vi.fn(),
    ...overrides,
  };
}

function renderSection(rows, overrides = {}) {
  const hook = datasetsHook(rows, overrides);
  useSupabaseTable.mockReturnValue(hook);
  render(
    <ToastProvider>
      <DatasetsSection />
    </ToastProvider>
  );
  return hook;
}

beforeEach(() => {
  useSupabaseTable.mockReset();
  supabase.from.mockReset();
});

it("lista los datasets con su estado y cuenta cuántos están activos", () => {
  renderSection([IHASIA, OTHER]);

  expect(screen.getByText("Ihasia")).toBeInTheDocument();
  expect(screen.getByText("Otro")).toBeInTheDocument();
  expect(screen.getByText(/Inactivo/)).toBeInTheDocument();
  expect(screen.getByText((_, node) => node.textContent === "Configuración inicial (escuelas, cursos y tarifas) que se clona en cada cuenta nueva. 1 activo de 2.")).toBeInTheDocument();
});

it("sin datasets, muestra el estado vacío", () => {
  renderSection([]);
  expect(screen.getByText("Sin datasets todavía.")).toBeInTheDocument();
});

it("crea un dataset nuevo con la clave derivada del nombre (slug)", async () => {
  const user = userEvent.setup();
  const hook = renderSection([IHASIA]);

  await user.click(screen.getByRole("button", { name: "Nuevo dataset" }));
  await user.type(screen.getByRole("textbox"), "Nueva Escuela Ñ");
  await user.click(screen.getByRole("button", { name: "Crear" }));

  expect(hook.insertRow).toHaveBeenCalledWith({ label: "Nueva Escuela Ñ", key: "nueva-escuela-n" });
});

it("duplicar copia el contenido de las 4 tablas del dataset origen al nuevo, con is_active:false", async () => {
  const user = userEvent.setup();
  const hook = renderSection([IHASIA]);

  const contentRows = [{ dataset_id: "d1", name: "PADI Cozumel", color: "#000", is_default: true }];
  const select = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: contentRows, error: null }) }));
  const insert = vi.fn().mockResolvedValue({ error: null });
  supabase.from.mockImplementation(() => ({ select, insert }));

  await user.click(screen.getByRole("button", { name: /Duplicar "Ihasia"/ }));

  expect(hook.insertRow).toHaveBeenCalledWith(expect.objectContaining({ label: "Ihasia (copia)", is_active: false }));
  expect(insert).toHaveBeenCalled();
  const [insertedRow] = insert.mock.calls[0][0];
  expect(insertedRow).toEqual({ name: "PADI Cozumel", color: "#000", is_default: true, dataset_id: "new-1" });
});

it("activar/desactivar llama a updateRow, y desactivar el predeterminado también le quita ese marcado", async () => {
  const user = userEvent.setup();
  const hook = renderSection([IHASIA]);

  await user.click(screen.getByRole("switch", { name: 'Dataset "Ihasia" activo' }));

  expect(hook.updateRow).toHaveBeenCalledWith("d1", { is_active: false, is_default: false });
});

it("activar un dataset inactivo no toca is_default", async () => {
  const user = userEvent.setup();
  const hook = renderSection([OTHER]);

  await user.click(screen.getByRole("switch", { name: 'Dataset "Otro" activo' }));

  expect(hook.updateRow).toHaveBeenCalledWith("d2", { is_active: true });
});

it("marcar como predeterminado llama a setDefault, y solo está disponible para datasets activos", () => {
  renderSection([IHASIA, OTHER]);

  expect(screen.getByLabelText('Marcar "Ihasia" como predeterminado')).not.toBeDisabled();
  expect(screen.getByLabelText('Marcar "Otro" como predeterminado')).toBeDisabled();
});

it("no permite eliminar el dataset predeterminado", async () => {
  const user = userEvent.setup();
  const hook = renderSection([IHASIA]);

  await user.click(screen.getByLabelText("Eliminar"));
  await user.click(within(screen.getByRole("alertdialog")).getByText("Eliminar"));

  expect(hook.deleteRow).not.toHaveBeenCalled();
  expect(await screen.findByText(/predeterminado/)).toBeInTheDocument();
});

it("no permite eliminar el único dataset restante", async () => {
  const user = userEvent.setup();
  const hook = renderSection([OTHER]);

  await user.click(screen.getByLabelText("Eliminar"));
  await user.click(within(screen.getByRole("alertdialog")).getByText("Eliminar"));

  expect(hook.deleteRow).not.toHaveBeenCalled();
});

it("elimina un dataset no predeterminado cuando hay más de uno", async () => {
  const user = userEvent.setup();
  const hook = renderSection([IHASIA, OTHER]);

  const deleteButtons = screen.getAllByLabelText("Eliminar");
  await user.click(deleteButtons[1]); // Otro (no predeterminado)
  await user.click(within(screen.getByRole("alertdialog")).getByText("Eliminar"));

  expect(hook.deleteRow).toHaveBeenCalledWith("d2");
});
