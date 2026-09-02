// jsdom no implementa canvas 2D — se mockea signature_pad entero (límite
// del sistema, igual criterio que mockear Supabase) en vez de intentar que
// la librería real dibuje sobre un canvas que no existe de verdad aquí. Lo
// que sí se prueba es el cableado real del componente: que se instancia,
// que "Borrar" limpia el pad y notifica valor nulo, y el aria-label según
// haya firma o no.
const clear = vi.fn();
const off = vi.fn();
let lastPad = null;

vi.mock("signature_pad", () => ({
  default: vi.fn().mockImplementation(function MockSignaturePad() {
    lastPad = { clear, off, isEmpty: vi.fn().mockReturnValue(true), toDataURL: vi.fn().mockReturnValue("data:image/png;base64,AAA"), addEventListener: vi.fn() };
    return lastPad;
  }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignatureCapture from "./SignatureCapture";

beforeEach(() => {
  clear.mockClear();
  off.mockClear();
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

it("marca la firma como opcional cuando se pide", () => {
  render(<SignatureCapture label="Firma del tutor" value={null} onChange={vi.fn()} optionalHint />);
  expect(screen.getByText(/Firma del tutor/)).toHaveTextContent("(opcional)");
});
