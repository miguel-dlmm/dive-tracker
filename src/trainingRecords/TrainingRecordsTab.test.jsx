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

// La conversión real a JPG necesita pdfjs-dist + un <canvas> 2D real, que
// jsdom no implementa (mismo límite del sistema que signature_pad) — aquí
// solo interesa que TrainingRecordsTab la invoque con los bytes del PDF ya
// generado y dispare la descarga, la conversión en sí ya se prueba sin
// canvas en pdfToJpg.test.js (computeConcatenatedLayout).
const renderPdfToJpgBytes = vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6]));
vi.mock("./pdfToJpg", () => ({ renderPdfToJpgBytes: (...args) => renderPdfToJpgBytes(...args) }));

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

// Perfil con los 4 datos de instructor completos (nombre, apellidos,
// iniciales, número SSI Pro) — el caso "feliz" que usan la mayoría de los
// tests. Los tests del aviso de datos incompletos parten de este objeto y
// quitan un campo cada vez.
const COMPLETE_PROFILE = { user_id: "u1", first_name: "Miguel", last_name: "Instructor", instructor_initials: "MI", ssi_pro_number: "12345" };

function renderTab(props = {}) {
  return render(
    <ToastProvider>
      <TrainingRecordsTab profile={COMPLETE_PROFILE} accentColor="#0E7C7B" {...props} />
    </ToastProvider>
  );
}

beforeEach(() => {
  templatesQuery.order.mockResolvedValue({ data: [TEMPLATE_ROW], error: null });
  storageDownload.mockResolvedValue({ data: { arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer }, error: null });
  fillTrainingRecordPdf.mockClear();
  renderPdfToJpgBytes.mockClear();
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

async function generateForAna(user) {
  await user.click(await screen.findByText("Open Water Diver"));
  await screen.findByText("Alumnos de esta sesión");
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await user.click(screen.getByText("Ana Garcia"));
  await user.click(await screen.findByText("Generar y descargar"));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalled());
}

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

it("muestra con qué instructor se va a firmar cuando el perfil está completo", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByText("Open Water Diver"));

  expect(await screen.findByText("Firmando como Miguel Instructor (MI) — SSI Pro 12345")).toBeInTheDocument();
});

it.each([
  ["instructor_initials", "sin iniciales"],
  ["ssi_pro_number", "sin número SSI Pro"],
  ["first_name", "sin nombre"],
  ["last_name", "sin apellidos"],
])("bloquea el generador con un aviso si al perfil le falta %s (%s), con un botón que abre Mi perfil", async (missingField) => {
  const user = userEvent.setup();
  const onOpenProfile = vi.fn();
  const incompleteProfile = { ...COMPLETE_PROFILE, [missingField]: "" };
  renderTab({ profile: incompleteProfile, onOpenProfile });

  await user.click(await screen.findByText("Open Water Diver"));

  const notice = await screen.findByText("Antes de generar, completa tus datos de instructor (nombre, iniciales y número SSI Pro) en tu perfil.");
  expect(notice).toBeInTheDocument();
  expect(screen.queryByText("Alumnos de esta sesión")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Ir a mi perfil" }));
  expect(onOpenProfile).toHaveBeenCalledTimes(1);
});

it("exporta el registro ya generado como imagen JPG desde el menú de la fila", async () => {
  const user = userEvent.setup();
  renderTab();
  await generateForAna(user);

  await user.click(screen.getByRole("button", { name: "Más acciones" }));
  await user.click(screen.getByRole("menuitem", { name: "Descargar imagen (JPG)" }));

  await waitFor(() => expect(renderPdfToJpgBytes).toHaveBeenCalledWith(new Uint8Array([1, 2, 3])));
  expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: "image/jpeg" }));
});

it("marca la fila con un check una vez generado el registro, sin ocultar el acceso a reabrirla", async () => {
  const user = userEvent.setup();
  renderTab();
  await generateForAna(user);

  expect(screen.getByLabelText("Registro ya generado")).toBeInTheDocument();
  // El chevron sigue ahí (no es un estado que "desaparece" al generar) — la
  // fila se puede volver a tocar para revisar/editar la configuración.
  await user.click(screen.getByText("Ana Garcia"));
  expect(await screen.findByText("Generar y descargar")).toBeInTheDocument();
});

it("abre sin reventar la hoja de una plantilla con inmersiones de especialidad (AOWD)", async () => {
  // Regresión: specialtyDives se sembraba vacío hasta que un useEffect lo
  // rellenaba DESPUÉS del primer render, pero el JSX de esta sección de
  // AOWD ya lee specialtyDives[i].specialtyName en ese primer render —
  // con el array todavía vacío, "Cannot read properties of undefined"
  // tumbaba toda la pantalla (sin error visible, pantalla en blanco,
  // encontrado con mobile-check-training-records.mjs). OWD (usado en el
  // resto de tests de este fichero) no tiene inmersiones de especialidad,
  // así que nunca ejercitaba esta ruta — de ahí este test aparte, con la
  // plantilla real (no mockeada) que sí las tiene.
  const user = userEvent.setup();
  templatesQuery.order.mockResolvedValue({ data: [{ code: "AOWD", name: "Advanced Open Water Diver", storage_path: "AOWD/AOWD_Spanish_Record.pdf" }], error: null });
  renderTab();

  await user.click(await screen.findByText("Advanced Open Water Diver"));
  await screen.findByText("Alumnos de esta sesión");
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("button", { name: "Guardar" }));

  await user.click(screen.getByText("Ana Garcia"));
  expect(await screen.findByText("Inmersiones de especialidad")).toBeInTheDocument();
  expect(screen.getAllByPlaceholderText("Nombre de la especialidad").length).toBeGreaterThan(0);
});

it("al reabrir un alumno ya generado, conserva su configuración anterior en vez de resetearla o mezclarla con la de otro alumno", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByText("Open Water Diver"));
  await screen.findByText("Alumnos de esta sesión");

  // Ana: desmarca "Sesiones Académicas" (obligatoria, empieza marcada) antes de generar.
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await user.click(screen.getByText("Ana Garcia"));
  await user.click(await screen.findByRole("checkbox", { name: "Sesiones Académicas" }));
  await user.click(screen.getByRole("button", { name: "Generar y descargar" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(1));

  // Reabrir a Ana: debe seguir desmarcada, no volver al valor por defecto.
  await user.click(screen.getByText("Ana Garcia"));
  expect(await screen.findByRole("checkbox", { name: "Sesiones Académicas" })).not.toBeChecked();
  await user.click(screen.getByRole("button", { name: "Cerrar" }));

  // Un alumno nuevo, Marta, no debe heredar el desmarcado de Ana.
  await user.click(screen.getByRole("button", { name: "Añadir alumno" }));
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Marta");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Ruiz");
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await user.click(screen.getByText("Marta Ruiz"));
  expect(await screen.findByRole("checkbox", { name: "Sesiones Académicas" })).toBeChecked();
});
