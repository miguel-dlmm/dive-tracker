// jsdom no implementa canvas 2D — se mockea signature_pad entero (límite
// del sistema, igual criterio que mockear Supabase) en vez de intentar que
// la librería real dibuje sobre un canvas que no existe de verdad aquí. Lo
// que sí se prueba es el cableado real del componente: que se instancia,
// que "Borrar" limpia el pad y notifica valor nulo, y el aria-label según
// haya firma o no.
const clear = vi.fn();
const off = vi.fn();
const fromData = vi.fn();
let lastPad = null;
let mockStrokes = [];
let mockIsEmpty = true;

vi.mock("signature_pad", () => ({
  default: vi.fn().mockImplementation(function MockSignaturePad() {
    lastPad = {
      clear, off, fromData,
      isEmpty: vi.fn(() => mockIsEmpty),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,AAA"),
      // Trazos de mentira, no puntos reales de signature_pad — el
      // componente solo necesita un array con longitud (para saber si
      // queda algo tras el pop()) y pasarlo tal cual a fromData().
      toData: vi.fn(() => mockStrokes),
      addEventListener: vi.fn(),
    };
    return lastPad;
  }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignatureCapture from "./SignatureCapture";

beforeEach(() => {
  clear.mockClear();
  off.mockClear();
  fromData.mockClear();
  mockStrokes = [];
  mockIsEmpty = true;
});

it("muestra el aria-label de 'sin firmar' cuando no hay valor todavía", () => {
  render(<SignatureCapture label="Firma del alumno" value={null} onChange={vi.fn()} />);
  expect(screen.getByRole("img", { name: "Firma del alumno: sin firmar" })).toBeInTheDocument();
});

it("muestra el aria-label de 'firmado' cuando ya hay una firma capturada", () => {
  render(<SignatureCapture label="Firma del alumno" value="data:image/png;base64,AAA" onChange={vi.fn()} />);
  expect(screen.getByRole("img", { name: "Firma del alumno: firmado" })).toBeInTheDocument();
});

it("Borrar limpia el pad y notifica valor nulo", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SignatureCapture label="Firma del alumno" value="data:image/png;base64,AAA" onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: /Borrar/ }));

  expect(clear).toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledWith(null);
});

// Pedido explícito 2026-09-09: "añade un deshacer a los campos firma,
// deshará el último trazo dibujado" — patrón estándar de signature_pad
// (toData()/fromData(): quitar el último elemento del array de trazos y
// recargar el resto), no borra la firma entera como "Borrar".
it("Deshacer quita solo el último trazo (fromData con un trazo menos), no toda la firma", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  mockStrokes = [{ points: [1] }, { points: [2] }];
  mockIsEmpty = false;
  render(<SignatureCapture label="Firma del alumno" value="data:image/png;base64,AAA" onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: /Deshacer/ }));

  expect(fromData).toHaveBeenCalledWith([{ points: [1] }]);
  expect(clear).not.toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledWith("data:image/png;base64,AAA");
});

it("Deshacer el único trazo que queda notifica valor nulo (firma vacía)", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  mockStrokes = [{ points: [1] }];
  mockIsEmpty = true; // tras el pop(), fromData([]) deja el pad vacío
  render(<SignatureCapture label="Firma del alumno" value="data:image/png;base64,AAA" onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: /Deshacer/ }));

  expect(fromData).toHaveBeenCalledWith([]);
  expect(onChange).toHaveBeenCalledWith(null);
});

it("Deshacer sin ningún trazo (firma ya vacía) no hace nada", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  mockStrokes = [];
  render(<SignatureCapture label="Firma del alumno" value={null} onChange={onChange} />);

  await user.click(screen.getByRole("button", { name: /Deshacer/ }));

  expect(fromData).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});

it("marca la firma como opcional cuando se pide", () => {
  render(<SignatureCapture label="Firma del tutor" value={null} onChange={vi.fn()} optionalHint />);
  expect(screen.getByText(/Firma del tutor/)).toHaveTextContent("(opcional)");
});
