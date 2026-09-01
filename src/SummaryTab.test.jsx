import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SummaryTab from "./SummaryTab";

// Rediseño 2026-08-29 (ver docs/ADR/0009-rediseno-resumen.md): la tarjeta
// principal (HeroTotal, con comparación al periodo anterior) y las
// tarjetas plegables (Por escuela con drill-down inline, Por curso,
// Comisiones, Ajustes de curso, Calendario) son el contrato nuevo de
// esta pantalla — estas pruebas cubren ese contrato de comportamiento, no
// cada combinación de granularidad/fuente. "Ajustes de curso" (antes
// "Pagos de compañeros") renombrado 2026-08-30 para hablar el mismo
// vocabulario que el resto de la app (Mi trabajo, MovementSheet).
const rowsHook = (rows) => ({ rows, loaded: true, insertRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn(), bulkUpdateWhere: vi.fn(), setDefault: vi.fn() });

const NOW = new Date();
const THIS_MONTH = new Date(NOW.getFullYear(), NOW.getMonth(), 10).toISOString().slice(0, 10);
const LAST_MONTH = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 10).toISOString().slice(0, 10);

const CURRENCIES = rowsHook([{ code: "EUR", symbol: "€", is_default: true }]);
const RATES = [{ school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 50, currency: "EUR" }];

function renderSummary({ worklog = [], comisiones = [], colleaguePayments = [], rates = RATES, schools } = {}) {
  render(
    <SummaryTab
      worklog={rowsHook(worklog)}
      comisiones={rowsHook(comisiones)}
      commissionRates={rowsHook(RATES)}
      rates={rowsHook(rates)}
      activities={rowsHook([{ name: "Open Water" }])}
      schools={schools || rowsHook([{ name: "PADI Cozumel" }, { name: "Ihasia" }])}
      currencies={CURRENCIES}
      colleaguePayments={rowsHook(colleaguePayments)}
    />
  );
}

describe("SummaryTab — tarjeta principal", () => {
  it("muestra el total del periodo y la comparación con el periodo anterior", () => {
    renderSummary({
      worklog: [
        { id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }, // 100€ este mes
        { id: "w2", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }, // 50€ mes anterior
      ],
    });

    const hero = within(screen.getByText(/Total combinado/).closest("div").parentElement);
    expect(hero.getByText(/100,00\s*€/)).toBeInTheDocument();
    expect(hero.getByText(/vs periodo anterior/)).toBeInTheDocument();
  });

  it("sin datos en el periodo anterior, no fuerza una comparación (delta indefinido, división por 0 evitada)", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });
    // Sin periodo anterior con datos, previousTotal es {} (0 monedas) — no
    // es comparable (singleCurrencyAmount devuelve null), así que no debe
    // haber línea de comparación.
    expect(screen.queryByText(/vs periodo anterior/)).not.toBeInTheDocument();
  });
});

// Franja de tendencia — rediseño 2026-08-30 (feedback explícito): antes el
// periodo elegido era siempre la última barra (a la derecha); ahora nace
// centrada en el periodo actual y se recentra en cualquier periodo que se
// elija, hacia atrás o hacia delante, sin límite. 7 barras = 3 a cada lado
// del elegido + el elegido.
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function monthsAwayLabel(base, n) {
  const d = new Date(base.getFullYear(), base.getMonth() + n, 1);
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}
// Cada barra solo muestra su etiqueta CORTA como texto visible ("Ago"); el
// nombre completo del periodo ("Agosto 2026") vive en su aria-label — de
// ahí que estas pruebas naveguen/comprueben por aria-label (getByRole),
// no por getByText, para no depender de un texto que ni siquiera está en
// el DOM como nodo de texto propio.
function trendBar(label) {
  return screen.getByRole("button", { name: new RegExp(`^Ir a ${label}`) });
}

describe("SummaryTab — franja de tendencia", () => {
  it("nace centrada en el periodo actual (3 barras a cada lado)", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    const bars = screen.getAllByRole("button", { name: /^Ir a / });
    expect(bars).toHaveLength(7);

    // El periodo actual es el elegido de entrada: su barra no es pulsable.
    expect(trendBar(monthsAwayLabel(NOW, 0))).toBeDisabled();
    // 3 meses antes y 3 meses después también son visibles.
    expect(trendBar(monthsAwayLabel(NOW, -3))).toBeInTheDocument();
    expect(trendBar(monthsAwayLabel(NOW, 3))).toBeInTheDocument();
  });

  it("tocar una barra la centra y permite seguir navegando hacia atrás o hacia delante desde ahí", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    // Tocar la barra más antigua visible (3 meses atrás) la convierte en la elegida.
    await user.click(trendBar(monthsAwayLabel(NOW, -3)));

    expect(trendBar(monthsAwayLabel(NOW, -3))).toBeDisabled();
    // La franja se recentra: ahora se ve hasta 3 meses más atrás desde el nuevo centro...
    expect(trendBar(monthsAwayLabel(NOW, -6))).toBeInTheDocument();
    // ...y también hacia delante, incluyendo de vuelta el mes que era el actual.
    expect(trendBar(monthsAwayLabel(NOW, 0))).toBeInTheDocument();
  });

  it("marca el periodo real de hoy aunque se navegue a otro distinto", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    await user.click(screen.getByRole("button", { name: new RegExp(`^Ir a ${monthsAwayLabel(NOW, -1)}`) }));

    // La barra del mes real de hoy sigue anunciando que es "el periodo actual", aunque ya no sea la elegida.
    expect(screen.getByRole("button", { name: new RegExp(`^Ir a ${monthsAwayLabel(NOW, 0)} \\(periodo actual\\)$`) })).toBeInTheDocument();
  });

  it("no aparece con granularidad 'Rango' (sin secuencia natural de periodos)", async () => {
    const user = userEvent.setup();
    renderSummary({});

    await user.click(screen.getByRole("button", { name: "Granularidad del periodo" }));
    await user.click(screen.getByRole("option", { name: "Rango" }));

    expect(screen.queryByText(/Tendencia — toca un periodo/)).not.toBeInTheDocument();
  });

  it("sin flechas ‹ › de periodo — la franja de tendencia es el único mecanismo de navegación (feedback 2026-08-30)", () => {
    renderSummary({});
    expect(screen.queryByRole("button", { name: "Periodo anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Periodo siguiente" })).not.toBeInTheDocument();
  });
});

describe("SummaryTab — jerarquía de secciones (revisión 2026-08-30)", () => {
  it("Comisiones y Ajustes de curso preceden a Calendario en el documento", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });
    const [comisiones, ajustes, calendario] = ["Comisiones", "Ajustes de curso", "Calendario"].map((name) =>
      screen.getByRole("button", { name: new RegExp(name) })
    );
    expect(comisiones.compareDocumentPosition(ajustes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ajustes.compareDocumentPosition(calendario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("SummaryTab — tarjetas plegables", () => {
  it("Por escuela empieza abierta; Comisiones/Ajustes de curso/Calendario empiezan cerradas", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    // "Por escuela" abierta de entrada: la fila "PADI Cozumel" ya es visible.
    expect(screen.getByText("PADI Cozumel")).toBeInTheDocument();

    // El resto empieza colapsado: su botón de cabecera existe (aria-expanded=false).
    expect(screen.getByRole("button", { name: /Comisiones/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Calendario/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Ajustes de curso/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("tocar una escuela en 'Por escuela' expande su desglose por curso en el sitio", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    expect(screen.queryByText("Sin cursos en este periodo.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /PADI Cozumel/ }));

    // Al expandir PADI Cozumel aparece su desglose por curso — "Open Water"
    // pasa a aparecer dos veces: como fila de "Por curso" (tarjeta aparte,
    // sigue colapsada) no debería estar, pero si estuviera abierta contaría
    // igual — aquí solo comprobamos que el desglose expandido aporta el
    // texto esperado dentro de la lista de escuelas.
    expect(screen.getAllByText("Open Water").length).toBeGreaterThan(0);
  });

  it("tocar 'Comisiones' la despliega y muestra su desglose", async () => {
    const user = userEvent.setup();
    renderSummary({
      comisiones: [{ id: "c1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    const comisionesBtn = screen.getByRole("button", { name: /Comisiones/ });
    await user.click(comisionesBtn);

    expect(comisionesBtn).toHaveAttribute("aria-expanded", "true");
    expect(within(comisionesBtn.closest("div").parentElement).getAllByText("PADI Cozumel").length).toBeGreaterThan(0);
  });
});

// "Por escuela" — evolución vs. el periodo anterior. Rediseño 2026-08-30
// (feedback explícito: el toggle "Importe/Crecimiento" anterior no se
// entendía sin explicación). Ahora es solo información añadida junto al
// nombre, en la misma lista de siempre, ordenada siempre por importe.
const SCHOOL_RATES = [
  { school: "PADI Cozumel", activity: "Open Water", payment_type: "Per Person", rate: 50, currency: "EUR" },
  { school: "Ihasia", activity: "Open Water", payment_type: "Per Person", rate: 50, currency: "EUR" },
];

describe("SummaryTab — 'Por escuela': evolución vs. el periodo anterior", () => {
  it("muestra el % de evolución junto al nombre sin necesitar ningún toggle, y el orden sigue siendo por importe", () => {
    renderSummary({
      rates: SCHOOL_RATES,
      worklog: [
        // Ihasia: 150€ este mes, sin ningún dato el mes anterior -> mayor importe, sin evolución que mostrar.
        { id: "w1", date: THIS_MONTH, school: "Ihasia", activity: "Open Water", people: 3, status: "Paid" },
        // PADI Cozumel: 100€ este mes (menor importe) vs. 50€ el mes anterior -> +100%.
        { id: "w2", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" },
        { id: "w3", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
      ],
    });

    // Sin toggle: no hay ningún control de ordenación que aprender.
    expect(screen.queryByRole("button", { name: "Importe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crecimiento" })).not.toBeInTheDocument();

    // Orden por importe de siempre: Ihasia (150€) antes que PADI Cozumel (100€).
    const rows = screen.getAllByText(/^(Ihasia|PADI Cozumel)$/);
    expect(rows.map((el) => el.textContent)).toEqual(["Ihasia", "PADI Cozumel"]);

    // La evolución se ve siempre, sin tocar nada: +100% junto a PADI Cozumel.
    expect(screen.getByText("+100%")).toBeInTheDocument();
    // Ihasia no tiene mes anterior con el que comparar -> silencio, no una etiqueta que explicar.
    expect(screen.queryByText(/sin datos/i)).not.toBeInTheDocument();
  });

  it("una escuela sin ningún dato el periodo anterior no muestra ninguna evolución (silencio, no una suposición)", () => {
    renderSummary({
      rates: SCHOOL_RATES,
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    expect(screen.getByText("PADI Cozumel")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("no muestra ninguna evolución con granularidad 'Rango' (sin periodo anterior natural)", async () => {
    const user = userEvent.setup();
    renderSummary({
      rates: SCHOOL_RATES,
      worklog: [
        { id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" },
        { id: "w2", date: LAST_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" },
      ],
    });
    expect(screen.getByText("+100%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Granularidad del periodo" }));
    await user.click(screen.getByRole("option", { name: "Rango" }));

    expect(screen.queryByText("+100%")).not.toBeInTheDocument();
  });
});

// Reducción de complejidad (2026-08-30): con una sola escuela configurada,
// "Por escuela" no aporta nada (agruparía todo en un único grupo) — se
// oculta hasta que exista una segunda escuela, igual que en Mi trabajo y
// Tarifas. "Por curso" hereda el defaultOpen que perdería "Por escuela".
describe("SummaryTab — 'Por escuela' solo con más de una escuela", () => {
  it("con una sola escuela: oculta la tarjeta 'Por escuela', el desglose 'Por escuela' de Comisiones y la leyenda del calendario; 'Por curso' empieza abierta", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", school: "PADI Cozumel", activity: "Open Water", date: "2026-08-05", rate: 20, people: 1 }],
      comisiones: [{ id: "c1", school: "PADI Cozumel", activity: "Advanced", date: "2026-08-06", amount: 15 }],
      schools: rowsHook([{ name: "PADI Cozumel" }]),
    });

    expect(screen.queryByRole("button", { name: "Por escuela" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Por curso" })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Comisiones" }));
    expect(screen.queryByText("Por escuela")).not.toBeInTheDocument();
    // "Por curso" también es el título de la tarjeta de arriba: dentro de
    // Comisiones debe haber ahora un único "Por curso" (el subtítulo del
    // desglose), no dos.
    expect(screen.getAllByText("Por curso")).toHaveLength(2);
  });

  it("con una segunda escuela: 'Por escuela' reaparece y 'Por curso' vuelve a empezar cerrada", () => {
    renderSummary({
      worklog: [{ id: "w1", school: "PADI Cozumel", activity: "Open Water", date: "2026-08-05", rate: 20, people: 1 }],
      schools: rowsHook([{ name: "PADI Cozumel" }, { name: "Ihasia" }]),
    });

    expect(screen.getByRole("button", { name: "Por escuela" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Por curso" })).toHaveAttribute("aria-expanded", "false");
  });
});

// Los Ajustes de curso (colleague_payments) no tienen concepto de persona
// — el modelo no lo representa, así que mostrar "0p"/"0 personas" para
// ellos no es un dato real, es un artefacto de mezclar su forma con la de
// Curso/Comisión (que sí llevan personas) en las mismas listas agregadas.
// Un grupo mixto (curso + ajuste en la misma escuela/actividad/día) sigue
// mostrando el recuento real de personas del curso — solo se oculta
// cuando el grupo es 100% Ajustes de curso.
describe("SummaryTab — Ajustes de curso no muestran un recuento de personas (revisión 2026-08-30)", () => {
  it("'Por escuela': la escuela cuya única actividad del periodo es un Ajuste de curso no muestra 'Xp'", () => {
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
      colleaguePayments: [{ id: "p1", date: THIS_MONTH, school: "Ihasia", activity: "Advanced", colleague_name: "Ana", amount: 30, currency: "EUR", status: "Paid" }],
    });

    const padiRow = screen.getByText("PADI Cozumel").closest("button");
    expect(within(padiRow).getByText("2p")).toBeInTheDocument();

    const ihasiaRow = screen.getByText("Ihasia").closest("button");
    expect(within(ihasiaRow).queryByText(/^\d+p$/)).not.toBeInTheDocument();
  });

  it("Calendario, vista 'Total combinado': el grupo 'Ajuste' del día no muestra personas, el grupo 'Curso' sigue mostrando las suyas", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 2, status: "Paid" }],
      colleaguePayments: [{ id: "p1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: 30, currency: "EUR", status: "Paid" }],
    });

    await user.click(screen.getByRole("button", { name: "Calendario" }));
    const calendarCard = screen.getByRole("button", { name: "Calendario" }).closest("div.overflow-hidden");
    const day = Number(THIS_MONTH.slice(-2));
    await user.click(within(calendarCard).getByText(String(day)).closest("button"));

    expect(within(calendarCard).getByText("Curso")).toBeInTheDocument();
    expect(within(calendarCard).getByText("Ajuste")).toBeInTheDocument();
    expect(within(calendarCard).getByText("2p")).toBeInTheDocument();
    expect(within(calendarCard).queryByText("0p")).not.toBeInTheDocument();
  });

  it("Calendario filtrado a 'Ajuste': el desglose del día no muestra 'Xp' para el ajuste", async () => {
    const user = userEvent.setup();
    renderSummary({
      colleaguePayments: [{ id: "p1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", colleague_name: "Ana", amount: 30, currency: "EUR", status: "Paid" }],
    });

    await user.click(screen.getByRole("button", { name: "Ajuste" }));
    await user.click(screen.getByRole("button", { name: "Calendario" }));
    const calendarCard = screen.getByRole("button", { name: "Calendario" }).closest("div.overflow-hidden");
    const day = Number(THIS_MONTH.slice(-2));
    await user.click(within(calendarCard).getByText(String(day)).closest("button"));

    expect(within(calendarCard).queryByText(/^\d+p$/)).not.toBeInTheDocument();
  });
});

// Feedback explícito 2026-08-30: "Por curso" gana el mismo drill-down
// progresivo que ya tenía "Por escuela" — al tocar un curso, se despliega
// su desglose por tipo de movimiento (Curso/Comisión/Ajuste), sin salir de
// la tarjeta ni abrir una pantalla nueva.
describe("SummaryTab — 'Por curso': desglose por tipo de movimiento al tocar un curso", () => {
  it("tocar 'Open Water' despliega su desglose por Curso/Comisión en el sitio", async () => {
    const user = userEvent.setup();
    renderSummary({
      worklog: [{ id: "w1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
      comisiones: [{ id: "c1", date: THIS_MONTH, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    await user.click(screen.getByRole("button", { name: "Por curso" }));
    const card = screen.getByRole("button", { name: "Por curso" }).closest("div.overflow-hidden");
    await user.click(within(card).getByRole("button", { name: /Open Water/ }));

    expect(within(card).getByText("Curso")).toBeInTheDocument();
    expect(within(card).getByText("Comisión")).toBeInTheDocument();
  });
});

// Bug real de límites de periodo, corregido 2026-08-30 (ver nota extensa
// junto a withinRange en SummaryTab.jsx): comparar new Date("YYYY-MM-DD")
// (medianoche UTC) contra new Date(year, month, day) (medianoche LOCAL)
// hacía que un movimiento del primer o último día de un periodo pudiera
// desaparecer de la suma según el huso horario. Esta prueba usa el
// ÚLTIMO día del mes actual con los componentes de fecha LOCALES del
// propio entorno de test (nunca toISOString, que ya arrastraba el mismo
// bug) — en un huso con offset positivo (este entorno corre en
// Asia/Bangkok, UTC+7) el bug afectaba exactamente a esta fecha límite.
describe("SummaryTab — suma correcta en los límites del periodo (bug real de zona horaria)", () => {
  it("un movimiento fechado el último día del mes actual cuenta en el total del mes", () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

    renderSummary({
      worklog: [{ id: "w1", date: lastDayStr, school: "PADI Cozumel", activity: "Open Water", people: 1, status: "Paid" }],
    });

    // HeroTotal (y "Por curso", si está abierta) muestran el total del
    // periodo — 50€ (1 persona × tarifa 50). Si el bug estuviera presente,
    // el movimiento quedaría fuera del periodo y "50,00" no aparecería en
    // ningún sitio de la pantalla.
    expect(screen.getAllByText("50,00", { exact: false }).length).toBeGreaterThan(0);
  });
});
