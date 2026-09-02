// Verificación móvil dedicada del generador de Training Records (Release
// V1, Fase 5) — mismo enfoque que scripts/mobile-check.mjs (Chromium +
// emulación iPhone 14 Pro Max, ver CLAUDE.md "8. Verificación UX/UI
// (mobile-check)" para el porqué de Chromium en vez de WebKit en este
// entorno), en un script aparte porque cubre un módulo distinto (Mi perfil
// → Datos de instructor, y Configuración → Training Records).
//
// Reescrito de arriba a abajo (2026-09-02, lote "pestaña única de
// creación") para el rediseño pedido por el usuario: firma del instructor
// en el perfil, alumno+plantilla+configuración en una sola hoja, fechas
// por día con selector "Hoy", validación de campos obligatorios, roster
// con iconos Editar/PDF/JPG + fecha de generación, y persistencia en
// sessionStorage entre recargas. Recorre el camino feliz completo: rellena
// el perfil del instructor (incluida la firma), genera un Training Record
// real (OWD) con firma del alumno y fechas de hoy, descarga PDF y JPG, y
// comprueba que sobrevive a una recarga de página.
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
// abrir el DatePicker de ese día primero (cada uno tiene su propio
// aria-label, "Día 1"/"Día 2"/"Fecha del curso"...) antes de poder
// tocarlo.
async function pickToday(page, dayLabel) {
  await page.getByRole("button", { name: dayLabel, exact: true }).tap();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Hoy" }).tap();
  await page.waitForTimeout(200);
}

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

  console.log("→ Configuración → Training Records");
  await page.locator('button[aria-label="Cerrar"]').tap();
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Configuración"]').tap();
  await page.waitForTimeout(250);
  const trMenuBtn = page.getByRole("button", { name: "Training Records" });
  if (await trMenuBtn.isVisible().catch(() => false)) { await trMenuBtn.tap(); await page.waitForTimeout(300); }
  await shot(page, "training-records-vacio");

  if (await page.getByText(/completa tus datos de instructor/i).isVisible().catch(() => false)) {
    issues.push("[training-records] Sigue pidiendo datos de instructor pese a haberlos rellenado en el perfil");
  }

  console.log("→ Añadir alumno: nombre, apellidos, plantilla OWD");
  await page.getByRole("button", { name: "Añadir alumno" }).tap();
  await page.waitForTimeout(300);
  await page.getByLabel("Nombre", { exact: true }).fill("Marta");
  await page.getByLabel("Apellidos", { exact: true }).fill("Test Apellido");
  await page.getByText("Open Water Diver", { exact: true }).tap();
  await page.waitForTimeout(300);
  await shot(page, "plantilla-elegida");

  console.log("→ Fechas Día 1 y Día 2 (botón 'Hoy' del selector de fecha)");
  await pickToday(page, "Día 1");
  await pickToday(page, "Día 2");

  console.log("→ Confirmación de examen + firma del alumno");
  await page.getByRole("checkbox", { name: "Confirmación de Examen Final" }).tap();
  await drawSignature(page, page.locator('canvas[aria-label*="Firma del alumno"]'));
  await shot(page, "formulario-completo");

  console.log("→ Generar y descargar el PDF relleno");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: "Generar y descargar" }).tap(),
  ]);
  if (!download) {
    issues.push("[training-records] No se disparó ninguna descarga al pulsar 'Generar y descargar'");
  } else {
    const savedPath = path.join(OUT_DIR, `tr-generado-${download.suggestedFilename()}`);
    await download.saveAs(savedPath);
    console.log(`  📄 PDF descargado -> ${path.relative(process.cwd(), savedPath)}`);
  }
  await page.waitForTimeout(500);
  await shot(page, "tras-generar");

  console.log("→ Fila del roster: iconos Editar/PDF/JPG + fecha de generación");
  const editIcon = page.getByRole("button", { name: "Editar" });
  const pdfIcon = page.getByRole("button", { name: "Descargar PDF" });
  const jpgIcon = page.getByRole("button", { name: "Descargar imagen (JPG)" });
  for (const [name, loc] of [["Editar", editIcon], ["Descargar PDF", pdfIcon], ["Descargar imagen (JPG)", jpgIcon]]) {
    if (!(await loc.isVisible().catch(() => false))) issues.push(`[training-records] Falta el icono "${name}" en la fila tras generar`);
  }
  if (!(await page.getByText(/Generado el/).isVisible().catch(() => false))) {
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
    await page.locator('button[aria-label="Configuración"]').tap();
    await page.waitForTimeout(250);
    const trMenuBtn2 = page.getByRole("button", { name: "Training Records" });
    if (await trMenuBtn2.isVisible().catch(() => false)) { await trMenuBtn2.tap(); await page.waitForTimeout(300); }
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
