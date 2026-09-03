import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./shared";

// Comportamiento de ToastProvider (Bloque 7, job nocturno 2026-09-03):
// antes no tenía test propio. Cubre solo lo que cambió en la revisión de
// diseño/usabilidad — cerrar antes de que expire el timer, y que la
// acción ("Deshacer") siga disparando su callback y cerrando el toast —
// no la lógica de negocio de las pantallas que ya usan useToast() (esas
// se prueban en su propio archivo).
function Trigger({ onUndo }) {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Guardado")}>success</button>
      <button onClick={() => toast.success("Con acción", { action: { label: "Deshacer", onClick: onUndo } })}>with-action</button>
    </>
  );
}

function renderWithToast(props = {}) {
  return render(
    <ToastProvider>
      <Trigger {...props} />
    </ToastProvider>
  );
}

describe("ToastProvider", () => {
  it("muestra el mensaje al llamar a success()", async () => {
    const user = userEvent.setup();
    renderWithToast();
    await user.click(screen.getByRole("button", { name: "success" }));
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
  });

  it("el botón Cerrar quita el toast antes de que expire su timer", async () => {
    const user = userEvent.setup();
    renderWithToast();
    await user.click(screen.getByRole("button", { name: "success" }));
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    // AnimatePresence mantiene el toast montado durante la salida animada
    // — desaparece del DOM al terminar, no en el mismo tick del clic.
    await waitFor(() => expect(screen.queryByText("Guardado")).not.toBeInTheDocument());
  });

  it("la acción del toast dispara su callback y cierra el toast", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    renderWithToast({ onUndo });
    await user.click(screen.getByRole("button", { name: "with-action" }));
    const undo = await screen.findByRole("button", { name: "Deshacer" });
    await user.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Con acción")).not.toBeInTheDocument());
  });
});
