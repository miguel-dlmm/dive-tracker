// Verificación móvil dedicada del generador de Training Records (Release
// V1, Fase 5) — mismo enfoque que scripts/mobile-check.mjs (Chromium +
// emulación iPhone 14 Pro Max, ver CLAUDE.md "8. Verificación UX/UI
// (mobile-check)" para el porqué de Chromium en vez de WebKit en este
// entorno), en un script aparte porque cubre un módulo distinto (Mi perfil
// → Datos de instructor, y Configuración → Training Records).
//
// Reescrito de arriba a abajo (2026-09-03, Bloque 5 del job nocturno) para
// el rediseño pedido por el usuario: la configuración del documento
// (plantilla, progreso, fechas, examen) pasa a ser COMPARTIDA para todo un
// listado de alumnos, no por alumno — cada alumno solo aporta nombre,
// apellidos, iniciales y firma. Recorre el camino feliz completo: rellena
// el perfil del instructor (incluida la firma), configura el documento una
// vez, añade 2 alumnos, genera los 2 de golpe, descarga PDF/JPG
// individuales, y comprueba que sobrevive a una recarga de página.
//
// Requiere `npm run dev` arrancado aparte (con VITE_DEV_AUTH_BYPASS activo)
// y el motor Chromium de Playwright instalado una vez
// (`npx playwright install chromium`).
//
// Uso:
//   npm run dev                              # en una terminal
//   npm run mobile-check:training-records      # en otra
//   npm run mobile-check:training-records -- --headed
//
// Nota: este script rellena de verdad "Mi perfil" de la cuenta demo (deja
// nombre "Ana Ejemplo Instructora" + datos de instructor) — quien lo
// ejecute contra una cuenta real debe restaurarlos a mano después si
// quiere dejar la cuenta como estaba, igual que ya se documenta para otros
// scripts de verificación de esta fase.

import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = "scripts/mobile-check-output";
mkdirSync(OUT_DIR, { recursive: true });

const headed = process.argv.includes("--headed");
const BASE_URL = process.env.MOBILE_CHECK_URL || "http://localhost:5173";

const issues = [];
let shotCount = 0;
async function shot(page, label) {
  shotCount += 1;
  const file = path.join(OUT_DIR, `tr-${String(shotCount).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file });
  console.log(`  📸 ${label} -> ${path.relative(process.cwd(), file)}`);
}

// Dibuja un trazo simple dentro de un <canvas> de firma — suficiente para
// que signature_pad lo registre como "no vacío" (endStroke dispara
// onChange). scrollIntoViewIfNeeded() es imprescindible: page.mouse no
// valida visibilidad como sí hace un locator.click(), así que sin
// desplazar antes un canvas fuera del viewport, el "trazo" no llega a
// ningún elemento real.
async function drawSignature(page, canvasLocator) {
  await canvasLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await canvasLocator.boundingBox();
  const x = box.x + box.width * 0.2, y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + box.width * 0.3, y - box.height * 0.2, { steps: 5 });
  await page.mouse.move(x + box.width * 0.6, y + box.height * 0.2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

// El botón "Hoy" vive DENTRO del panel flotante del calendario — hay que
// abrir el DatePicker de esa fila primero (cada fila de progreso tiene su
// propio selector, con aria-label "Fecha: <etiqueta de la fila>") antes de
// poder tocarlo.
async function pickToday(page, dateFieldLabel) {
  await page.getByRole("button", { name: dateFieldLabel, exact: true }).tap();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Hoy" }).tap();
  await page.waitForTimeout(200);
}

// Las 6 filas obligatorias de OWD vienen marcadas por defecto — cada una
// necesita su propia fecha para poder generar (pedido explícito del
// usuario: fecha por fila, no agrupada por día).
const OWD_MANDATORY_ROW_LABELS = [
  "Sesiones Académicas",
  "Sesiones en Piscina/Aguas Confinadas",
  "Inmersión de Formación en Aguas Abiertas 1",
  "Inmersión de Formación en Aguas Abiertas 2",
  "Inmersión de Formación en Aguas Abiertas 3",
  "Inmersión de Formación en Aguas Abiertas 4",
];

async function dismissWhatsNewIfPresent(page) {
  if (!(await page.getByRole("dialog").isVisible().catch(() => false))) return;
  const dialog = page.getByRole("dialog");
  let guard = 0;
  // Acotado al diálogo, con exact:true: sin esto, "Siguiente" también
  // matchea "Mes siguiente" del calendario de Home montado detrás.
  while (await dialog.getByRole("button", { name: "Siguiente", exact: true }).isVisible().catch(() => false) && guard < 10) {
    await dialog.getByRole("button", { name: "Siguiente", exact: true }).tap();
    await page.waitForTimeout(150);
    guard += 1;
  }
  await dialog.getByRole("button", { name: "Empezar", exact: true }).tap();
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ ...devices["iPhone 14 Pro Max"], acceptDownloads: true });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) issues.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => issues.push(`[pageerror] ${err.message}`));

  console.log(`\nChromium (emulación iPhone 14 Pro Max) · Training Records · ${BASE_URL}\n`);

  await page.goto(BASE_URL);
  await page.waitForSelector("text=Mi trabajo", { timeout: 15000 });
  await dismissWhatsNewIfPresent(page);

  console.log("→ Mi perfil: nombre/apellidos + datos de instructor (iniciales, número, firma)");
  await page.locator('button:has-text("demo")').first().tap();
  await page.waitForTimeout(300);
  await shot(page, "mi-perfil");

  await page.getByRole("button", { name: "Editar" }).first().tap();
  await page.waitForTimeout(200);
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await page.getByLabel("Apellidos", { exact: true }).fill("Ejemplo Instructora");
  await page.getByRole("button", { name: "Guardar" }).first().tap();
  await page.waitForTimeout(400);

  const instructorSection = page.locator("#instructor-section");
  await instructorSection.getByRole("button", { name: "Editar" }).tap();
  await page.waitForTimeout(200);
  await instructorSection.getByLabel("Iniciales", { exact: true }).fill("AEI");
  await instructorSection.getByLabel("Número SSI Pro", { exact: true }).fill("12345");
  await drawSignature(page, instructorSection.locator("canvas"));
  await shot(page, "firma-instructor-capturada");
  await instructorSection.getByRole("button", { name: "Guardar" }).tap();
  await page.waitForTimeout(400);
  await shot(page, "instructor-guardado");

  console.log("→ Home → tarjeta Training Records (Bloque 10 — ya no vive en el menú de Configuración)");
  await page.locator('button[aria-label="Cerrar"]').tap();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Home", exact: true }).tap();
  await page.waitForTimeout(300);
  await page.getByText("Training Records", { exact: true }).tap();
  await page.waitForTimeout(300);
  await shot(page, "training-records-vacio");

  if (await page.getByText(/completa tus datos de instructor/i).isVisible().catch(() => false)) {
    issues.push("[training-records] Sigue pidiendo datos de instructor pese a haberlos rellenado en el perfil");
  }

  console.log("→ Elegir plantilla OWD (configuración COMPARTIDA para todo el listado, rediseño 2026-09-03)");
  await page.getByText("Open Water Diver", { exact: true }).tap();
  await page.waitForTimeout(300);
  await shot(page, "plantilla-elegida");

  console.log("→ Fecha de cada fila de progreso marcada (botón 'Hoy' del selector de fecha de cada fila)");
  for (const label of OWD_MANDATORY_ROW_LABELS) {
    await pickToday(page, `Fecha: ${label}`);
  }

  console.log("→ Confirmación de examen (con su propia fecha)");
  await page.getByRole("checkbox", { name: "Confirmación de Examen Final" }).tap();
  await page.waitForTimeout(200);
  await pickToday(page, "Fecha: Confirmación de Examen Final");
  await shot(page, "configuracion-compartida-completa");

  console.log("→ Añadir 2 alumnos (solo nombre, apellidos, iniciales y firma cada uno)");
  for (const [firstName, lastName] of [["Marta", "Test Apellido"], ["Diego", "Otro Alumno"]]) {
    await page.getByRole("button", { name: "Añadir alumno" }).tap();
    await page.waitForTimeout(300);
    await page.getByLabel("Nombre", { exact: true }).fill(firstName);
    await page.getByLabel("Apellidos", { exact: true }).fill(lastName);
    await drawSignature(page, page.locator('canvas[aria-label*="Firma del alumno"]'));
    await page.getByRole("button", { name: "Guardar alumno" }).tap();
    await page.waitForTimeout(300);
  }
  await shot(page, "dos-alumnos-anadidos");

  console.log("→ Generar para todos los alumnos de golpe (2 PDF reales, descarga y relleno tardan unos segundos)");
  await page.getByRole("button", { name: "Generar para todos los alumnos" }).tap();
  await page.getByRole("button", { name: "Descargar todo en PDF" }).waitFor({ timeout: 15000 }).catch(() => {
    issues.push("[training-records] No aparecen las acciones en lote (Descargar todo) tras generar");
  });
  await shot(page, "tras-generar");

  console.log("→ Descargar el PDF de un alumno concreto desde su icono de fila");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: "Descargar PDF" }).first().tap(),
  ]);
  if (!download) {
    issues.push("[training-records] No se disparó ninguna descarga al pulsar 'Descargar PDF'");
  } else {
    const savedPath = path.join(OUT_DIR, `tr-generado-${download.suggestedFilename()}`);
    await download.saveAs(savedPath);
    console.log(`  📄 PDF descargado -> ${path.relative(process.cwd(), savedPath)}`);
  }

  console.log("→ Fila del roster: iconos Editar/PDF/JPG + fecha de generación (para los 2 alumnos)");
  const editIcon = page.getByRole("button", { name: "Editar" }).first();
  const pdfIcon = page.getByRole("button", { name: "Descargar PDF" }).first();
  const jpgIcon = page.getByRole("button", { name: "Descargar imagen (JPG)" }).first();
  for (const [name, loc] of [["Editar", editIcon], ["Descargar PDF", pdfIcon], ["Descargar imagen (JPG)", jpgIcon]]) {
    if (!(await loc.isVisible().catch(() => false))) issues.push(`[training-records] Falta el icono "${name}" en la fila tras generar`);
  }
  if ((await page.getByRole("button", { name: "Descargar PDF" }).count()) !== 2) {
    issues.push("[training-records] No hay 2 iconos 'Descargar PDF' tras generar para 2 alumnos");
  }
  if (!(await page.getByText(/Generado el/).first().isVisible().catch(() => false))) {
    issues.push("[training-records] No aparece la fecha/hora de generación bajo el nombre del alumno");
  }

  console.log("→ Exportar a JPG desde el icono de la fila (pdfjs-dist + worker, carga bajo demanda)");
  const [jpgDownload] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    jpgIcon.tap(),
  ]);
  if (!jpgDownload) {
    issues.push("[training-records] El icono JPG no disparó ninguna descarga (¿falló el worker de pdfjs-dist?)");
  } else {
    const jpgPath = path.join(OUT_DIR, `tr-generado-${jpgDownload.suggestedFilename()}`);
    await jpgDownload.saveAs(jpgPath);
    console.log(`  🖼️ JPG descargado -> ${path.relative(process.cwd(), jpgPath)}`);
  }

  console.log("→ Recargar la página: el roster y los documentos generados deben seguir ahí (sessionStorage)");
  await page.reload();
  await page.waitForSelector("text=Mi trabajo", { timeout: 15000 });
  await dismissWhatsNewIfPresent(page);
  await page.waitForTimeout(300);
  // ConfigTab recuerda la última sección abierta — tras recargar puede
  // reabrir directo en Training Records, sin pasar por el menú de nuevo.
  if (!(await page.getByText("Marta Test Apellido").isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Home", exact: true }).tap();
    await page.waitForTimeout(250);
    const trCard2 = page.getByText("Training Records", { exact: true });
    if (await trCard2.isVisible().catch(() => false)) { await trCard2.tap(); await page.waitForTimeout(300); }
  }
  if (!(await page.getByText("Marta Test Apellido").isVisible().catch(() => false))) {
    issues.push("[training-records] Tras recargar, el alumno generado ya no aparece en el roster");
  }
  await shot(page, "tras-recargar");

  await browser.close();

  console.log(`\n${shotCount} capturas en scripts/mobile-check-output/`);
  if (issues.length > 0) {
    console.log(`\n⚠ ${issues.length} aviso(s)/error(es) de consola:`);
    issues.forEach((m) => console.log("  " + m));
    process.exitCode = 1;
  } else {
    console.log("\n✓ Sin errores ni avisos en consola durante el recorrido.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
