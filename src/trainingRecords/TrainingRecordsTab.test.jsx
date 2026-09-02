// signature_pad necesita un canvas 2D real que jsdom no implementa — se
// mockea entero (límite del sistema), igual que Supabase y que el propio
// relleno de PDF (ya cubierto a fondo en pdfFill.test.js; aquí solo
// interesa que TrainingRecordsTab lo invoque con los datos correctos y
// dispare la descarga, no repetir esa cobertura).
vi.mock("signature_pad", () => ({
  default: vi.fn().mockImplementation(function MockSignaturePad() {
    return { clear: vi.fn(), off: vi.fn(), isEmpty: vi.fn().mockReturnValue(true), toDataURL: vi.fn(), addEventListener: vi.fn() };
  }),
}));

const fillTrainingRecordPdf = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
vi.mock("./pdfFill", () => ({ fillTrainingRecordPdf: (...args) => fillTrainingRecordPdf(...args) }));

const templatesQuery = { order: vi.fn() };
const templatesEq = vi.fn(() => templatesQuery);
const templatesSelect = vi.fn(() => ({ eq: templatesEq }));
const storageDownload = vi.fn();
const supabaseFrom = vi.fn(() => ({ select: templatesSelect }));
vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args) => supabaseFrom(...args),
    storage: { from: () => ({ download: (...args) => storageDownload(...args) }) },
  },
}));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../shared";
import TrainingRecordsTab from "./TrainingRecordsTab";

const TEMPLATE_ROW = { code: "OWD", name: "Open Water Diver", storage_path: "OWD/OWD_Spanish_Record.pdf" };

function renderTab(props = {}) {
  return render(
    <ToastProvider>
      <TrainingRecordsTab userId="u1" accentColor="#0E7C7B" {...props} />
    </ToastProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  templatesQuery.order.mockResolvedValue({ data: [TEMPLATE_ROW], error: null });
  storageDownload.mockResolvedValue({ data: { arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer }, error: null });
  fillTrainingRecordPdf.mockClear();
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

it("lista las plantillas activas y descarga la elegida al seleccionarla", async () => {
  const user = userEvent.setup();
  renderTab();

  expect(await screen.findByText("Open Water Diver")).toBeInTheDocument();
  await user.click(screen.getByText("Open Water Diver"));

  await waitFor(() => expect(storageDownload).toHaveBeenCalledWith("OWD/OWD_Spanish_Record.pdf"));
  expect(await screen.findByText("Alumnos de esta sesión")).toBeInTheDocument();
});

it("añade un alumno al roster con las iniciales autocalculadas", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByText("Open Water Diver"));
  await screen.findByText("Alumnos de esta sesión");

  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Miguel");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "de la Marta");
  await user.click(screen.getByRole("button", { name: "Guardar" }));

  expect(screen.getByText("Miguel de la Marta")).toBeInTheDocument();
  expect(screen.getByText("MDLM")).toBeInTheDocument();
});

it("genera y descarga el registro de un alumno del roster", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByText("Open Water Diver"));
  await screen.findByText("Alumnos de esta sesión");
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("button", { name: "Guardar" }));

  await user.click(screen.getByText("Ana Garcia"));
  const sheet = await screen.findByText("Generar y descargar");
  await user.click(sheet);

  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalled());
  const [, , data] = fillTrainingRecordPdf.mock.calls[0];
  expect(data.firstName).toBe("Ana");
  expect(data.lastName).toBe("Garcia");
  // Sesiones académicas (fila obligatoria) viene marcada por defecto —
  // recibe las iniciales del alumno del roster.
  expect(data.sessionRows[0]).toEqual(expect.objectContaining({ studentInitials: "AG" }));
  expect(global.URL.createObjectURL).toHaveBeenCalled();
});

it("recuerda los datos del instructor entre aperturas (localStorage, no Supabase)", async () => {
  const user = userEvent.setup();
  const { unmount } = renderTab();
  await user.click(await screen.findByText("Open Water Diver"));
  await user.type(screen.getByRole("textbox", { name: "Nombre completo" }), "Miguel Instructor");
  unmount();

  renderTab();
  await user.click(await screen.findByText("Open Water Diver"));
  expect(await screen.findByDisplayValue("Miguel Instructor")).toBeInTheDocument();
});
