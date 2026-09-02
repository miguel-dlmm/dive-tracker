// signature_pad necesita un canvas 2D real que jsdom no implementa — se
// mockea entero (límite del sistema), igual que Supabase y que el propio
// relleno de PDF (ya cubierto a fondo en pdfFill.test.js/recordConfig.test.js;
// aquí solo interesa que la pantalla los invoque con los datos correctos y
// dispare la descarga, no repetir esa cobertura). endStrokeHandlers guarda
// el callback "endStroke" de cada instancia en el orden en que
// SignatureCapture las monta — signStudent() más abajo lo usa para simular
// un trazo real sin depender de eventos de canvas que jsdom no soporta.
let endStrokeHandlers = [];
vi.mock("signature_pad", () => ({
  default: vi.fn().mockImplementation(function MockSignaturePad() {
    const index = endStrokeHandlers.length;
    return {
      clear: vi.fn(),
      off: vi.fn(),
      isEmpty: vi.fn().mockReturnValue(false),
      toDataURL: vi.fn().mockReturnValue(`data:image/png;base64,SIGNATURE_${index}`),
      addEventListener: vi.fn((event, cb) => { if (event === "endStroke") endStrokeHandlers.push(cb); }),
    };
  }),
}));
// Cada apertura de StudentQuickEntrySheet monta 2 SignatureCapture a la
// vez (alumno primero, tutor después) — el handler del ALUMNO es el
// penúltimo empujado en esta apertura, no el último (ese es el del tutor).
function signStudentInOpenSheet() {
  endStrokeHandlers[endStrokeHandlers.length - 2]?.();
}

const fillTrainingRecordPdf = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
vi.mock("./pdfFill", () => ({ fillTrainingRecordPdf: (...args) => fillTrainingRecordPdf(...args) }));

const renderPdfToJpgBytes = vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6]));
vi.mock("./pdfToJpg", () => ({ renderPdfToJpgBytes: (...args) => renderPdfToJpgBytes(...args) }));

const TEMPLATE_ROW = { code: "OWD", name: "Open Water Diver", storage_path: "OWD/OWD_Spanish_Record.pdf" };
const ADVENTURE_ROWS = [{ id: "adv-1", name: "Buceo nocturno" }, { id: "adv-2", name: "Corrientes" }];

const templatesQuery = { order: vi.fn() };
const templatesEq = vi.fn(() => templatesQuery);
const templatesSelect = vi.fn(() => ({ eq: templatesEq }));
const adventuresQuery = { order: vi.fn() };
const adventuresSelect = vi.fn(() => adventuresQuery);
const storageDownload = vi.fn();
const supabaseFrom = vi.fn((table) => {
  if (table === "training_record_templates") return { select: templatesSelect };
  if (table === "training_record_adventures") return { select: adventuresSelect };
  throw new Error(`tabla no mockeada: ${table}`);
});
vi.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args) => supabaseFrom(...args),
    storage: { from: () => ({ download: (...args) => storageDownload(...args) }) },
  },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../shared";
import TrainingRecordsTab from "./TrainingRecordsTab";

const COMPLETE_PROFILE = {
  user_id: "u1", first_name: "Miguel", last_name: "Instructor",
  instructor_initials: "MI", ssi_pro_number: "12345", instructor_signature: "data:image/png;base64,INSTRUCTOR_SIG",
};

function renderTab(props = {}) {
  return render(
    <ToastProvider>
      <TrainingRecordsTab profile={COMPLETE_PROFILE} accentColor="#0E7C7B" {...props} />
    </ToastProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  endStrokeHandlers = [];
  templatesQuery.order.mockResolvedValue({ data: [TEMPLATE_ROW], error: null });
  adventuresQuery.order.mockResolvedValue({ data: ADVENTURE_ROWS, error: null });
  storageDownload.mockResolvedValue({ data: { arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer }, error: null });
  fillTrainingRecordPdf.mockClear();
  renderPdfToJpgBytes.mockClear();
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

it("bloquea el generador con un aviso mientras falte cualquier dato de instructor, incluida la firma", async () => {
  renderTab({ profile: { ...COMPLETE_PROFILE, instructor_signature: null } });
  expect(await screen.findByText(/completa tus datos de instructor/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open Water Diver" })).not.toBeInTheDocument();
});

// Las 6 filas obligatorias de OWD (índices 0-5) vienen marcadas por
// defecto — cada una necesita su propia fecha, compartida para todo el
// listado de alumnos.
const OWD_MANDATORY_ROW_LABELS = [
  "Sesiones Académicas",
  "Sesiones en Piscina/Aguas Confinadas",
  "Inmersión de Formación en Aguas Abiertas 1",
  "Inmersión de Formación en Aguas Abiertas 2",
  "Inmersión de Formación en Aguas Abiertas 3",
  "Inmersión de Formación en Aguas Abiertas 4",
];

async function pickToday(user, dateFieldLabel) {
  await user.click(screen.getByRole("button", { name: dateFieldLabel, exact: true }));
  await user.click(await screen.findByRole("button", { name: "Hoy" }));
}

// Rellena la configuración COMPARTIDA (plantilla OWD + fechas de las 6
// filas obligatorias + confirmación de examen con su fecha) — se hace UNA
// vez para todo el listado, pedido explícito del usuario (rediseño
// 2026-09-03: "no es una configuración por alumno, es una configuración
// para un listado de alumnos").
async function selectTemplateAndFillSharedConfig(user) {
  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));
  for (const label of OWD_MANDATORY_ROW_LABELS) await pickToday(user, `Fecha: ${label}`);
  await user.click(screen.getByRole("checkbox", { name: "Confirmación de Examen Final" }));
  await pickToday(user, "Fecha: Confirmación de Examen Final");
}

// Añade un alumno con nombre/apellidos/firma vía el FAB "Añadir alumno".
async function addStudent(user, { firstName, lastName }) {
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), firstName);
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), lastName);
  signStudentInOpenSheet();
  await user.click(screen.getByRole("button", { name: "Guardar alumno" }));
  await screen.findByText(`${firstName} ${lastName}`);
}

it("configura una vez para todo el listado, añade 2 alumnos y genera los 2 documentos de golpe", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);

  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  await addStudent(user, { firstName: "Luis", lastName: "Perez" });

  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(2));

  const [, , dataAna] = fillTrainingRecordPdf.mock.calls[0];
  expect(dataAna.firstName).toBe("Ana");
  const [, , dataLuis] = fillTrainingRecordPdf.mock.calls[1];
  expect(dataLuis.firstName).toBe("Luis");
  // La configuración compartida (fecha de la primera fila) es la MISMA
  // para los dos alumnos — no se pide una por alumno.
  expect(dataAna.sessionRows[0].date).toBe(dataLuis.sessionRows[0].date);

  expect(await screen.findAllByRole("button", { name: "Descargar PDF" })).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Descargar todo en PDF" })).toBeInTheDocument();
}, 15000);

it("no genera si falta la configuración compartida o los datos de algún alumno, y lo dice en un solo aviso", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));
  // Sin fechas ni alumnos.
  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));

  expect(fillTrainingRecordPdf).not.toHaveBeenCalled();
  expect(screen.getAllByText("Falta la fecha de esta fila.").length).toBe(6);
});

it("marca con un aviso al alumno al que le falta la firma, y bloquea Generar sin borrar a los demás", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);

  // Alumno sin firmar — guardarlo debe fallar con su propio aviso.
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("button", { name: "Guardar alumno" }));

  expect(screen.getByText("Falta la firma del alumno.")).toBeInTheDocument();
  expect(fillTrainingRecordPdf).not.toHaveBeenCalled();
}, 15000);

it("el listado y los documentos ya generados sobreviven a un remontaje (recarga de página)", async () => {
  const user = userEvent.setup();
  const { unmount } = renderTab();
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(1));
  unmount();

  renderTab();
  expect(await screen.findByText("Ana Garcia")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  // La plantilla ya elegida se muestra como texto fijo, no vuelve a la lista de elección.
  expect(screen.getByText("Open Water Diver", { selector: "p" })).toBeInTheDocument();
}, 15000);

it("pide confirmación antes de cambiar de plantilla solo si ya hay progreso rellenado que se perdería", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));

  await user.click(screen.getByRole("button", { name: "Cambiar plantilla" }));
  expect(screen.queryByText("¿Cambiar de plantilla?")).not.toBeInTheDocument();

  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));
  await pickToday(user, "Fecha: Sesiones Académicas");

  await user.click(screen.getByRole("button", { name: "Cambiar plantilla" }));
  expect(await screen.findByText("¿Cambiar de plantilla?")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.getByRole("button", { name: "Cambiar plantilla" })).toBeInTheDocument();
});
