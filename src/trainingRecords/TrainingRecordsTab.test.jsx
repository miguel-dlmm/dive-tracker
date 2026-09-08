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
// Con "Menor de edad" sin marcar (caso por defecto de estos tests) solo se
// monta el SignatureCapture del alumno — el del tutor queda oculto del
// todo (2026-09-04, pedido explícito: antes era un campo "opcional"
// siempre visible; ahora el checkbox "Menor de edad" decide si existe
// siquiera). El handler del alumno es, por tanto, el ÚLTIMO empujado en
// esta apertura.
function signStudentInOpenSheet() {
  endStrokeHandlers[endStrokeHandlers.length - 1]?.();
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
  localStorage.clear();
  endStrokeHandlers = [];
  templatesQuery.order.mockResolvedValue({ data: [TEMPLATE_ROW], error: null });
  adventuresQuery.order.mockResolvedValue({ data: ADVENTURE_ROWS, error: null });
  storageDownload.mockResolvedValue({ data: { arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer }, error: null });
  fillTrainingRecordPdf.mockClear();
  renderPdfToJpgBytes.mockClear();
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  globalThis.URL.revokeObjectURL = vi.fn();
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
  // "Fecha de examen" (2026-09-04): ya no es una casilla + fecha, es
  // directamente un campo de fecha obligatorio — ver ProgressRowToggle/
  // examConfirmation en TrainingRecordsTab.jsx.
  await pickToday(user, "Fecha de examen");
}

// Abre la hoja de alta de alumno — el control cambia según si el listado
// ya tiene algún alumno (2026-09-04, quitado el FAB flotante): con el
// listado vacío es el enlace "Añade tu primer alumno" del estado vacío;
// con al menos un alumno ya añadido, es la fila "+ Añadir alumno" al
// final del propio listado.
async function openAddStudentSheet(user) {
  const inlineRow = screen.queryByRole("button", { name: "Añadir alumno" });
  await user.click(inlineRow || screen.getByRole("button", { name: "Añade tu primer alumno" }));
}

// Añade un alumno con nombre/apellidos/firma.
async function addStudent(user, { firstName, lastName }) {
  await openAddStudentSheet(user);
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), firstName);
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), lastName);
  signStudentInOpenSheet();
  await user.click(screen.getByRole("button", { name: "Guardar alumno" }));
  await screen.findByText(`${firstName} ${lastName}`);
}

// Feedback explícito del usuario (2026-09-07): "el generar todos de TR
// sigue en verde, no cumple con el libro de estilos nuevo" — el botón
// tenía el TEAL genérico hardcodeado en vez del accentColor real de la
// sección ("trabajo", navy #00335A vía nav_sections), a pesar de que el
// componente ya recibía accentColor como prop. TEAL solo debe quedar
// como respaldo si accentColor no llega (accentColor || TEAL).
it("el botón 'Generar para todos los alumnos' usa accentColor, no el TEAL genérico", async () => {
  const user = userEvent.setup();
  renderTab({ accentColor: "#00335A" });
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });

  const button = screen.getByRole("button", { name: "Generar para todos los alumnos" });
  expect(button.style.backgroundColor).toBe("rgb(0, 51, 90)");
}, 15000);

// Barrido completo del archivo (2026-09-07, feedback real: "los campos
// versión del examen, certificación... se ven del tono verde anterior al
// rediseño") — la corrección anterior solo tocó el botón "Generar para
// todos"; el resto de controles (RadioChoice de "versión de examen"/
// "certificación", checkboxes de progreso, avisos...) seguían con el
// TEAL genérico, algunos sin ni siquiera recibir accentColor como prop.
it("'Versión de examen' (RadioChoice) usa accentColor en la opción marcada, no el TEAL genérico", async () => {
  const user = userEvent.setup();
  renderTab({ accentColor: "#00335A" });
  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));

  // "Online" viene premarcado por defecto (buildDefaultConfig) — no hace
  // falta pulsarlo, solo comprobar el estilo con el que ya se pinta.
  const onlineButton = screen.getByRole("button", { name: "Online" });
  expect(onlineButton.style.color).toBe("rgb(0, 51, 90)");
  expect(onlineButton.style.borderColor).toBe("rgb(0, 51, 90)");
});

it("el checkbox de una fila de progreso obligatoria usa accentColor, no el TEAL genérico", async () => {
  const user = userEvent.setup();
  renderTab({ accentColor: "#00335A" });
  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));
  await screen.findByText("Sesiones Académicas");
  const checkbox = document.querySelector('input[type="checkbox"][disabled]');
  expect(checkbox).toBeTruthy();
  expect(checkbox.style.accentColor).toBe("rgb(0, 51, 90)");
});

// Feedback real del usuario (2026-09-07): "en TR de Advance no se ve de
// primeras que las aventuras sean obligatorias" — validateRecordConfig ya
// las trataba como tal desde el "ALL AOWD fields obligatory" del
// 2026-09-04, pero AdventureRow (a diferencia de ProgressRowToggle) no
// mostraba ningún indicio visual de serlo.
it("las 'Aventuras' de AOWD muestran la etiqueta 'Obligatorio', igual que las filas fijas", async () => {
  const user = userEvent.setup();
  templatesQuery.order.mockResolvedValue({
    data: [{ code: "AOWD", name: "Advanced Open Water Diver", storage_path: "AOWD/AOWD_Spanish_Record.pdf" }],
    error: null,
  });
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Advanced Open Water Diver" }));

  const adventureLabel = await screen.findByText("Aventura 1");
  expect(adventureLabel.closest("p")).toHaveTextContent("Aventura 1Obligatorio");
});

it("el aviso de 'completa tu perfil' usa accentColor en su botón, no el TEAL genérico", async () => {
  renderTab({ accentColor: "#00335A", profile: { ...COMPLETE_PROFILE, instructor_signature: null } });
  const button = await screen.findByRole("button", { name: "Ir a mi perfil" });
  expect(button.style.backgroundColor).toBe("rgb(0, 51, 90)");
});

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

// Pedido explícito del usuario (2026-09-07): "debería de descargar un
// fichero comprimido con todos los archivos" — antes eran 2 descargas
// sueltas (una por alumno). Ahora debe ser UNA sola descarga, de un
// Blob application/zip, con los 2 documentos dentro (no se
// descomprime el ZIP aquí para comprobar el contenido byte a byte —
// eso ya lo cubre fflate, una librería de terceros; solo interesa que
// la pantalla arme y descargue exactamente un ZIP).
it("'Descargar todo en PDF' genera un único ZIP, no una descarga por alumno", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  await addStudent(user, { firstName: "Luis", lastName: "Perez" });
  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(2));

  await user.click(screen.getByRole("button", { name: "Descargar todo en PDF" }));

  await waitFor(() => expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1));
  const [blob] = globalThis.URL.createObjectURL.mock.calls[0];
  expect(blob.type).toBe("application/zip");
  expect(await screen.findByText("Comprimido descargado con todos los archivos.")).toBeInTheDocument();
}, 15000);

it("no genera si falta la configuración compartida o los datos de algún alumno, y lo dice en un solo aviso", async () => {
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Open Water Diver" }));
  // Sin fechas ni alumnos.
  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));

  expect(fillTrainingRecordPdf).not.toHaveBeenCalled();
  expect(screen.getAllByText("Falta la fecha de esta fila.").length).toBe(6);
}, 15000);

it("marca con un aviso al alumno al que le falta la firma, y bloquea Generar sin borrar a los demás", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);

  // Alumno sin firmar — guardarlo debe fallar con su propio aviso.
  await openAddStudentSheet(user);
  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("button", { name: "Guardar alumno" }));

  expect(screen.getByText("Falta la firma del alumno.")).toBeInTheDocument();
  expect(fillTrainingRecordPdf).not.toHaveBeenCalled();
}, 15000);

// 2026-09-04, pedido explícito (OW): "Menor de edad" revela nombre/firma
// del tutor, normalmente ocultos — y los exige en cuanto se marca. Firma
// los pads por índice explícito (no con el helper compartido, que asume
// un único SignatureCapture montado) porque marcar la casilla monta un
// SEGUNDO SignatureCapture (el del tutor) sobre el mismo alumno.
it("'Menor de edad' revela el nombre/firma del tutor y los exige antes de guardar", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);

  await openAddStudentSheet(user);
  expect(screen.queryByRole("textbox", { name: "Nombre del padre/madre/tutor" })).not.toBeInTheDocument();
  const studentHandlerIndex = endStrokeHandlers.length - 1; // solo el del alumno, todavía sin tutor

  await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Ana");
  await user.type(screen.getByRole("textbox", { name: "Apellidos" }), "Garcia");
  await user.click(screen.getByRole("checkbox", { name: "Menor de edad" }));
  expect(screen.getByRole("textbox", { name: "Nombre del padre/madre/tutor" })).toBeInTheDocument();
  const guardianHandlerIndex = endStrokeHandlers.length - 1; // el del tutor, montado justo ahora

  await user.click(screen.getByRole("button", { name: "Guardar alumno" }));
  expect(screen.getByText("Falta la firma del alumno.")).toBeInTheDocument();
  expect(screen.getByText("Falta el nombre del padre, madre o tutor.")).toBeInTheDocument();
  expect(screen.getByText("Falta la firma del padre, madre o tutor.")).toBeInTheDocument();

  await user.type(screen.getByRole("textbox", { name: "Nombre del padre/madre/tutor" }), "Juana Perez");
  endStrokeHandlers[studentHandlerIndex]();
  endStrokeHandlers[guardianHandlerIndex]();
  await user.click(screen.getByRole("button", { name: "Guardar alumno" }));
  await screen.findByText("Ana Garcia");
}, 15000);

// Contador decorativo de la tarjeta de Home (2026-09-08) — ver
// generatedCounter.js. Se suma en el mismo punto que ya prueba el test de
// arriba (generación con éxito de "Generar para todos los alumnos"), solo
// que aquí se comprueba el efecto secundario en localStorage en vez del
// PDF en sí. Clave con sufijo `:u1` (COMPLETE_PROFILE.user_id) — el
// contador es por CUENTA, no por dispositivo (bug real corregido
// 2026-09-08: una cuenta demo en el mismo navegador heredaba el contador
// de la cuenta admin usada antes).
it("generar con éxito suma al contador de Training Records generados de ESTA cuenta (localStorage)", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  expect(localStorage.getItem("oceanpulse:trainingRecordsGeneratedCount:u1")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(1));

  expect(localStorage.getItem("oceanpulse:trainingRecordsGeneratedCount:u1")).toBe("1");
}, 15000);

// Bug real reportado 2026-09-08: "para contar los generados tienes q tener
// en cuenta cada vez q se llame a la app de generar, la puedo llamar
// individualmente para cada alumno o en el generar todos" — "Regenerar TR"
// (un alumno a la vez, sin repetir el resto del listado) no sumaba nada al
// contador, solo "Generar para todos los alumnos" lo hacía.
it("regenerar UN alumno (sin pasar por 'Generar para todos') también suma al contador", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  expect(localStorage.getItem("oceanpulse:trainingRecordsGeneratedCount:u1")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Regenerar TR" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(1));

  expect(localStorage.getItem("oceanpulse:trainingRecordsGeneratedCount:u1")).toBe("1");
}, 15000);

// Bug real reportado 2026-09-08: "al cerrar el training records resetea
// completamente el formulario a añadir plantilla y borra los alumnos
// también". Causa real: persistSession guardaba pdfBytes de cada alumno
// ya generado (varios cientos de KB en base64 cada uno) — con un roster
// de unos pocos alumnos generados, el conjunto superaba fácilmente la
// cuota de sessionStorage (5-10MB según navegador); sessionStorage.setItem
// lanza QuotaExceededError al superarla, capturado en silencio, así que
// ESE guardado entero se descartaba — la próxima vez que se abría esta
// pantalla, loadStoredSession() encontraba el último valor que sí había
// cabido (a veces ninguno: plantilla y roster vacíos). Arreglado dejando
// de persistir pdfBytes/generatedAt (mismo criterio que ya usaban
// selectTemplate/requestTemplateChange al cambiar de plantilla: un PDF
// ya generado es barato de rehacer, perder el roster entero no) — el
// trade-off real es que un documento ya generado SÍ deja de estar listo
// para descargar tras un remontaje (hay que pulsar "Regenerar TR" de
// nuevo), a cambio de que el roster y la plantilla elegida nunca se
// pierdan por superar la cuota.
it("el listado y la plantilla elegida sobreviven a un remontaje (recarga de página) — un PDF ya generado no, hay que regenerarlo", async () => {
  const user = userEvent.setup();
  const { unmount } = renderTab();
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeInTheDocument();
  unmount();

  renderTab();
  expect(await screen.findByText("Ana Garcia")).toBeInTheDocument();
  // La plantilla ya elegida se muestra como texto fijo, no vuelve a la lista de elección.
  expect(screen.getByText("Open Water Diver", { selector: "p" })).toBeInTheDocument();
  // El PDF ya generado no sobrevive (a propósito, ver nota de arriba) —
  // "Descargar PDF" no aparece hasta regenerarlo.
  expect(screen.queryByRole("button", { name: "Descargar PDF" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Regenerar TR" })).toBeInTheDocument();
}, 15000);

it("nunca persiste pdfBytes en sessionStorage (evita superar su cuota con varios PDF generados)", async () => {
  const user = userEvent.setup();
  renderTab();
  await selectTemplateAndFillSharedConfig(user);
  await addStudent(user, { firstName: "Ana", lastName: "Garcia" });
  await user.click(screen.getByRole("button", { name: "Generar para todos los alumnos" }));
  await waitFor(() => expect(fillTrainingRecordPdf).toHaveBeenCalledTimes(1));

  const stored = JSON.parse(sessionStorage.getItem("oceanpulse:trainingRecordsSession"));
  expect(stored.students).toHaveLength(1);
  expect(stored.students[0].pdfBytes).toBeNull();
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
}, 15000);
