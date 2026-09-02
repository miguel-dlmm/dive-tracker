// signature_pad necesita un canvas 2D real que jsdom no implementa — se
// mockea entero (límite del sistema), igual que Supabase y que el propio
// relleno de PDF (ya cubierto a fondo en pdfFill.test.js/recordConfig.test.js;
// aquí solo interesa que TrainingRecordsTab/StudentRecordSheet los invoquen
// con los datos correctos y disparen la descarga, no repetir esa cobertura).
// endStrokeHandlers guarda el callback "endStroke" de cada instancia en el
// orden en que SignatureCapture las monta (alumno primero, tutor después)
// — signStudent() más abajo lo usa para simular un trazo real sin depender
// de eventos de canvas que jsdom no soporta.
let endStrokeHandlers = [];
vi.mock("signature_pad", () => ({
  default: vi.fn().mockImplementation(function MockSignaturePad() {
    return {
      clear: vi.fn(),
      off: vi.fn(),
      isEmpty: vi.fn().mockReturnValue(false),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,SIGNATURE"),
      addEventListener: vi.fn((event, cb) => { if (event === "endStroke") endStrokeHandlers.push(cb); }),
    };
  }),
}));
function signStudent() {
  endStrokeHandlers[0]?.();
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

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../shared";
import TrainingRecordsTab from "./TrainingRecordsTab";

// Perfil con los 5 datos de instructor completos (nombre, apellidos,
// iniciales, número SSI Pro, firma) — el caso "feliz" que usan la mayoría
// de los tests. Los tests del aviso de datos incompletos parten de este
// objeto y quitan un campo cada vez.
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

// Recorrido feliz completo: abre la hoja, rellena alumno + plantilla +
// fecha de cada fila de progreso marcada + confirmación de examen (con su
// propia fecha) + firma, genera. Reutilizado por varios tests para no
// repetir el mismo bloque de interacciones una y otra vez.
// El botón "Hoy" vive DENTRO del panel flotante del calendario — hay que
// abrir el DatePicker de esa fila primero (cada fila tiene su propio
// selector, con un aria-label único derivado de la etiqueta de la fila)
// antes de poder tocarlo.
async function pickToday(user, dateFieldLabel) {
  await user.click(screen.getByRole("button", { name: dateFieldLabel, exact: true }));
  await user.click(await screen.findByRole("button", { name: "Hoy" }));
}

// Las 6 filas obligatorias de OWD (índices 0-5) vienen marcadas por
// defecto — cada una necesita su propia fecha para poder generar.
const OWD_MANDATORY_ROW_LABELS = [
  "Sesiones Académicas",
  "Sesiones en Piscina/Aguas Confinadas",
  "Inmersión de Formación en Aguas Abiertas 1",
  "Inmersión de Formación en Aguas Abiertas 2",
  "Inmersión de Formación en Aguas Abiertas 3",
  "Inmersión de Formación en Aguas Abiertas 4",
];

async function fillAndGenerate(user, { firstName = "Ana", lastName = "Garcia" } = {}) {
  await user.click(await screen.findByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), firstName);
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), lastName);
  await user.click(await screen.findByText("Open Water Diver"));

  for (const label of OWD_MANDATORY_ROW_LABELS) {
    await pickToday(user, `Fecha: ${label}`);
  }

  await user.click(screen.getByRole("checkbox", { name: "Confirmación de Examen Final" }));
  await pickToday(user, "Fecha: Confirmación de Examen Final");
  signStudent();

  await user.click(screen.getByRole("button", { name: "Generar y descargar" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalled());
}

it("bloquea el generador con un aviso mientras falte cualquier dato de instructor, incluida la firma", async () => {
  renderTab({ profile: { ...COMPLETE_PROFILE, instructor_signature: null } });
  expect(await screen.findByText(/completa tus datos de instructor/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Añadir alumno" })).not.toBeInTheDocument();
});

it.each(["instructor_initials", "ssi_pro_number", "first_name", "last_name", "instructor_signature"])(
  "bloquea el generador si al perfil le falta %s, con un botón que abre Mi perfil",
  async (missingField) => {
    const user = userEvent.setup();
    const onOpenProfile = vi.fn();
    renderTab({ profile: { ...COMPLETE_PROFILE, [missingField]: "" }, onOpenProfile });

    expect(await screen.findByRole("button", { name: "Ir a mi perfil" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ir a mi perfil" }));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  }
);

it("muestra un enlace para añadir el primer alumno cuando el roster está vacío", async () => {
  const user = userEvent.setup();
  renderTab();
  const link = await screen.findByRole("button", { name: "Añade tu primer alumno" });
  await user.click(link);
  expect(await screen.findByText("Nuevo alumno")).toBeInTheDocument();
});

// fillAndGenerate hace un tap por cada fila de progreso (7 en total para
// OWD, una por fila obligatoria + la confirmación de examen) — el timeout
// por defecto (5000ms) queda justo bajo la carga de la suite completa en
// paralelo, aunque en solitario sobra de sobra.
it("genera y descarga el registro completo de un alumno, y lo refleja en el roster", async () => {
  const user = userEvent.setup();
  renderTab();
  await fillAndGenerate(user);

  const [, , data] = fillTrainingRecordPdf.mock.calls[0];
  expect(data.firstName).toBe("Ana");
  expect(data.lastName).toBe("Garcia");
  expect(data.signatures.instructorPng).toBe("data:image/png;base64,INSTRUCTOR_SIG");
  expect(global.URL.createObjectURL).toHaveBeenCalled();

  expect(await screen.findByText("Ana Garcia")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Descargar imagen (JPG)" })).toBeInTheDocument();
}, 15000);

it("no genera si faltan campos obligatorios del documento (versión de examen, certificación, confirmación, firma o la fecha de una fila de progreso)", async () => {
  const user = userEvent.setup();
  renderTab();

  await user.click(await screen.findByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(await screen.findByText("Open Water Diver"));
  // "Online" y "Open Water Diver" (certificación) vienen premarcados por
  // defecto — pedido explícito del usuario — así que para probar de verdad
  // que se exigen, hay que desmarcarlos a mano (tocar una opción ya
  // elegida la desmarca, ver RadioChoice en StudentRecordSheet.jsx).
  await user.click(screen.getByRole("button", { name: "Online" }));
  await user.click(screen.getByRole("button", { name: "Open Water Diver" }));
  await user.click(screen.getByRole("button", { name: "Generar y descargar" }));

  expect(fillTrainingRecordPdf).not.toHaveBeenCalled();
  // Las 6 filas obligatorias de OWD están marcadas por defecto y ninguna
  // tiene fecha todavía — aparece un aviso por cada una.
  expect(screen.getAllByText("Falta la fecha de esta fila.").length).toBe(6);
  expect(screen.getByText("Elige la versión del examen.")).toBeInTheDocument();
  expect(screen.getByText("Elige la certificación.")).toBeInTheDocument();
  expect(screen.getByText("Confirma que se ha completado el examen final.")).toBeInTheDocument();
  expect(screen.getByText("Falta la firma del alumno.")).toBeInTheDocument();
});

it("exporta el registro ya generado como imagen JPG desde el icono de la fila", async () => {
  const user = userEvent.setup();
  renderTab();
  await fillAndGenerate(user);

  await user.click(await screen.findByRole("button", { name: "Descargar imagen (JPG)" }));

  await waitFor(() => expect(renderPdfToJpgBytes).toHaveBeenCalledWith(new Uint8Array([1, 2, 3])));
  expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: "image/jpeg" }));
}, 15000);

it("al editar un alumno ya generado, reabre con su nombre, plantilla y configuración ya rellenos", async () => {
  const user = userEvent.setup();
  renderTab();
  await fillAndGenerate(user);

  await user.click(await screen.findByRole("button", { name: "Editar" }));

  expect(await screen.findByDisplayValue("Ana")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Garcia")).toBeInTheDocument();
  // La plantilla ya viene elegida — "Cambiar plantilla" solo aparece con
  // un templateCode ya asignado (ver "Open Water Diver" también aparecería
  // en el radio de certificación, texto ambiguo si se busca sin acotar).
  expect(screen.getByRole("button", { name: "Cambiar plantilla" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Confirmación de Examen Final" })).toBeChecked();
}, 15000);

it("mantiene el roster y los documentos ya generados si el componente se vuelve a montar (recarga de página)", async () => {
  const user = userEvent.setup();
  const { unmount } = renderTab();
  await fillAndGenerate(user);
  expect(await screen.findByText("Ana Garcia")).toBeInTheDocument();
  unmount();

  renderTab();
  expect(await screen.findByText("Ana Garcia")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
}, 15000);
