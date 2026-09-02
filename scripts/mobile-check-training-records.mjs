// Verificación móvil dedicada del generador de Training Records (Release
// V1, Fase 5) — mismo enfoque que scripts/mobile-check.mjs (Chromium +
// emulación iPhone 14 Pro Max, ver CLAUDE.md "8. Verificación UX/UI
// (mobile-check)" para el porqué de Chromium en vez de WebKit en este
// entorno), en un script aparte porque cubre un módulo distinto
// (Configuración → Training Records) al que ya cubre mobile-check.mjs
// (Mi trabajo/Movimientos).
//
// Recorre el flujo real pedido por el encargo: elegir plantilla activa,
// añadir un alumno al roster, firmar (alumno + instructor) con eventos
// táctiles reales, generar y descargar el PDF, y "Descargar todos los
// generados". Falla (código de salida != 0) si aparece cualquier error/aviso
// de consola durante el recorrido, igual que mobile-check.mjs.
//
// Requiere `npm run dev` arrancado aparte (con VITE_DEV_AUTH_BYPASS activo)
// y el motor Chromium de Playwright instalado una vez
// (`npx playwright install chromium`).
//
// Uso:
//   npm run dev                                   # en una terminal
//   npm run mobile-check:training-records          # en otra
//   npm run mobile-check:training-records -- --headed

import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "mobile-check-output");
mkdirSync(OUT_DIR, { recursive: true });

const headed = process.argv.includes("--headed");
const BASE_URL = process.env.MOBILE_CHECK_URL || "http://localhost:5173";

const consoleIssues = [];
let shotCount = 0;
async function shot(page, label) {
  shotCount += 1;
  const file = path.join(OUT_DIR, `tr-${String(shotCount).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file });
  console.log(`  📸 ${label} -> ${path.relative(process.cwd(), file)}`);
}

// Dibuja un trazo simple dentro del canvas de firma — suficiente para que
// signature_pad lo registre como "no vacío" (endStroke dispara onChange).
// scrollIntoViewIfNeeded() es imprescindible: la hoja (`Sheet`) es más alta
// que el viewport y desplaza su contenido en un contenedor interno — sin
// desplazar antes, boundingBox() devuelve coordenadas reales pero FUERA del
// viewport visible, y page.mouse.move/down/up (a diferencia de un
// locator.click()) no valida visibilidad: el "trazo" no llega a ningún
// elemento y signature_pad nunca ve el evento, sin lanzar ningún error.
async function drawSignature(page, canvasLocator) {
  await canvasLocator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const box = await canvasLocator.boundingBox();
  const x = box.x + box.width * 0.2;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + box.width * 0.3, y - box.height * 0.2, { steps: 5 });
  await page.mouse.move(x + box.width * 0.6, y + box.height * 0.2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

async function main() {
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ ...devices["iPhone 14 Pro Max"], acceptDownloads: true });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${err.message}`));

  console.log(`\nChromium (emulación iPhone 14 Pro Max) · Training Records · ${BASE_URL}\n`);

  await page.goto(BASE_URL);
  await Promise.race([
    page.waitForSelector("text=Mi trabajo", { timeout: 15000 }),
    page.waitForSelector("text=Privacidad y condiciones de uso", { timeout: 15000 }),
  ]);

  if (await page.getByText("Privacidad y condiciones de uso").isVisible().catch(() => false)) {
    console.log("→ Reaceptación legal pendiente — aceptar y continuar");
    await page.getByRole("checkbox").tap();
    await page.getByRole("button", { name: "Continuar" }).tap();
    await page.waitForSelector("text=Mi trabajo", { timeout: 15000 });
  }

  if (await page.getByRole("dialog").isVisible().catch(() => false)) {
    console.log("→ Cerrar 'Qué hay de nuevo' (no es el foco de este recorrido)");
    const whatsNewDialog = page.getByRole("dialog");
    // Sin exact:true ni acotar al diálogo, "Siguiente" también matchea el
    // botón "Mes siguiente" del calendario de Home montado detrás — el
    // strict-mode error resultante quedaba silenciado por .catch(() => false)
    // y el bucle nunca llegaba a ejecutarse.
    let guard = 0;
    while (await whatsNewDialog.getByRole("button", { name: "Siguiente", exact: true }).isVisible().catch(() => false) && guard < 10) {
      await whatsNewDialog.getByRole("button", { name: "Siguiente", exact: true }).tap();
      await page.waitForTimeout(150);
      guard += 1;
    }
    await whatsNewDialog.getByRole("button", { name: "Empezar", exact: true }).tap();
    await page.waitForTimeout(200);
  }

  console.log("→ Abrir Configuración → Training Records");
  await page.locator('button[aria-label="Configuración"]').tap();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Training Records" }).tap();
  await page.waitForTimeout(300);
  await shot(page, "lista-plantillas");

  const noTemplates = await page.getByText("Todavía no hay ninguna plantilla lista para usar.").isVisible().catch(() => false);
  if (noTemplates) {
    consoleIssues.push("[training-records] No hay ninguna plantilla activa disponible — no se pudo verificar el flujo de generación");
  } else {
    console.log("→ Elegir la primera plantilla activa");
    const firstTemplate = page.getByRole("main").locator(".divide-y.divide-gray-100.overflow-hidden.rounded-lg").first().getByRole("button").first();
    const templateName = await firstTemplate.textContent();
    console.log(`  (plantilla: "${templateName?.trim()}")`);
    await firstTemplate.tap();
    await page.waitForTimeout(600); // descarga + parseo del PDF real desde Storage
    await shot(page, "plantilla-seleccionada");

    const stuckDownloading = await page.getByText("Descargando plantilla…").isVisible().catch(() => false);
    if (stuckDownloading) {
      await page.waitForTimeout(2000);
      await shot(page, "plantilla-tras-espera");
    }

    // Fase 5 (2026-09-02, pedido explícito del usuario): los datos de
    // instructor ya no se editan en esta pantalla — viven en el perfil, y
    // si faltan, TrainingRecordsTab bloquea con un aviso + botón "Ir a mi
    // perfil" en vez de dejar avanzar (ver InstructorMissingNotice).
    const instructorMissing = await page.getByText("Antes de generar, completa tus datos de instructor", { exact: false }).isVisible().catch(() => false);
    if (instructorMissing) {
      console.log("→ Datos de instructor incompletos en el perfil (esperado en la cuenta demo) — rellenarlos vía 'Ir a mi perfil'");
      await shot(page, "aviso-datos-instructor-incompletos");
      await page.getByRole("button", { name: "Ir a mi perfil" }).tap();
      await page.waitForTimeout(400);
      await shot(page, "mi-perfil-abierto");

      const personalDataEditar = page.getByRole("button", { name: "Editar" }).first();
      if (await personalDataEditar.isVisible().catch(() => false)) {
        await personalDataEditar.tap();
        await page.waitForTimeout(200);
        await page.getByLabel("Nombre", { exact: true }).fill("Ana");
        await page.getByLabel("Apellidos", { exact: true }).fill("Ejemplo Instructora");
        await page.getByRole("button", { name: "Guardar" }).first().tap();
        await page.waitForTimeout(400);
      }

      const instructorSection = page.locator("#instructor-section");
      await instructorSection.getByRole("button", { name: "Editar" }).tap();
      await page.waitForTimeout(200);
      await instructorSection.getByLabel("Iniciales", { exact: true }).fill("AEI");
      await instructorSection.getByLabel("Número SSI Pro", { exact: true }).fill("12345");
      await instructorSection.getByRole("button", { name: "Guardar" }).tap();
      await page.waitForTimeout(400);
      await shot(page, "datos-instructor-guardados");

      console.log("→ Volver a Configuración → Training Records con los datos ya completos");
      await page.locator('button[aria-label="Cerrar"]').tap();
      await page.waitForTimeout(300);
      await shot(page, "tras-cerrar-mi-perfil");
      await page.locator('button[aria-label="Configuración"]').tap();
      await page.waitForTimeout(250);
      await shot(page, "config-reabierta");
      await page.getByRole("button", { name: "Training Records" }).tap();
      await page.waitForTimeout(300);
      await firstTemplate.tap();
      await page.waitForTimeout(600);
      await shot(page, "plantilla-tras-completar-instructor");

      const stillMissing = await page.getByText("Antes de generar, completa tus datos de instructor", { exact: false }).isVisible().catch(() => false);
      if (stillMissing) {
        consoleIssues.push("[training-records] Tras completar los datos de instructor en el perfil, la plantilla sigue mostrando el aviso de datos incompletos");
      }
    } else {
      console.log("→ Datos de instructor ya completos en el perfil — 'Firmando como...' visible");
      const summaryVisible = await page.getByText("Firmando como", { exact: false }).isVisible().catch(() => false);
      if (!summaryVisible) consoleIssues.push("[training-records] Con datos de instructor completos, no aparece el resumen 'Firmando como...'");
    }

    console.log("→ Añadir un alumno al roster");
    await page.locator('button[aria-label="Añadir alumno"]').tap();
    await page.waitForTimeout(250);
    await shot(page, "formulario-alumno");
    // exact:true: la instrucción de instructor "Nombre completo" también sigue
    // montada detrás de la hoja (Sheet es un overlay, no desmonta el fondo) y
    // "Nombre" es substring de "Nombre completo" — sin exact, ambigüedad.
    await page.getByLabel("Nombre", { exact: true }).fill("Marta");
    await page.getByLabel("Apellidos", { exact: true }).fill("Test Apellido");
    await page.waitForTimeout(100);
    await page.getByRole("button", { name: "Guardar" }).tap();
    await page.waitForTimeout(300);
    await shot(page, "roster-con-alumno");

    const rosterEmpty = await page.getByText("Añade a los alumnos a los que vas a generar el registro.").isVisible().catch(() => false);
    if (rosterEmpty) {
      consoleIssues.push("[training-records] Tras guardar el alumno, el roster sigue mostrándose vacío");
    } else {
      console.log("→ Abrir el alumno para firmar y generar su Training Record");
      await page.getByText("Marta Test Apellido").first().tap();
      await page.waitForTimeout(300);
      await shot(page, "hoja-generar-abierta");

      const canvases = await page.locator("canvas").all();
      console.log(`  (${canvases.length} campo(s) de firma encontrados — firmando alumno e instructor)`);
      if (canvases[0]) await drawSignature(page, page.locator("canvas").nth(0));
      if (canvases[2]) await drawSignature(page, page.locator("canvas").nth(2));
      await shot(page, "firmas-capturadas");

      const studentSigLabel = canvases[0] ? await page.locator("canvas").nth(0).getAttribute("aria-label") : null;
      const instructorSigLabel = canvases[2] ? await page.locator("canvas").nth(2).getAttribute("aria-label") : null;
      if (studentSigLabel && !/^Firma del alumno: firmado/.test(studentSigLabel)) {
        consoleIssues.push(`[training-records] El trazo sobre el canvas del alumno no quedó registrado (aria-label: "${studentSigLabel}")`);
      }
      if (instructorSigLabel && !/^Firma del instructor: firmado/.test(instructorSigLabel)) {
        consoleIssues.push(`[training-records] El trazo sobre el canvas del instructor no quedó registrado (aria-label: "${instructorSigLabel}")`);
      }

      console.log("→ Generar y descargar el PDF relleno");
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
        page.getByRole("button", { name: "Generar y descargar" }).tap(),
      ]);
      await page.waitForTimeout(500);
      if (!download) {
        consoleIssues.push("[training-records] No se disparó ninguna descarga al pulsar 'Generar y descargar'");
      } else {
        const savedPath = path.join(OUT_DIR, `tr-generado-${download.suggestedFilename()}`);
        await download.saveAs(savedPath);
        console.log(`  📄 PDF descargado -> ${path.relative(process.cwd(), savedPath)}`);
      }
      await shot(page, "tras-generar");

      // La hoja se cierra sola tras generar con éxito (TrainingRecordsTab
      // hace setGenerateFor(null) en handleGenerated) — no hace falta
      // cerrarla a mano. Un intento anterior de este script cerraba "por si
      // acaso" con getByRole("button", { name: "Cerrar" }), pero sin
      // exact:true esa consulta también matchea el botón "Cerrar
      // Configuración" de la cabecera y navegaba fuera de la pantalla.
      const rosterVisibleAfterGenerate = await page.getByText("Alumnos de esta sesión", { exact: false }).isVisible().catch(() => false);
      if (!rosterVisibleAfterGenerate) {
        consoleIssues.push("[training-records] Tras generar, la hoja no volvió sola al roster");
      }

      console.log("→ 'Descargar de nuevo' debe estar disponible tras generar");
      const redownloadBtn = page.locator('button[aria-label="Descargar de nuevo"]');
      if (!(await redownloadBtn.isVisible().catch(() => false))) {
        consoleIssues.push("[training-records] Tras generar, no aparece el botón 'Descargar de nuevo' en la fila del alumno");
      } else {
        const [redownload] = await Promise.all([
          page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
          redownloadBtn.tap(),
        ]);
        if (!redownload) consoleIssues.push("[training-records] 'Descargar de nuevo' no disparó ninguna descarga");
      }

      console.log("→ 'Descargar todos los generados' debe estar visible con al menos un PDF generado");
      const downloadAllBtn = page.getByRole("button", { name: "Descargar todos los generados" });
      if (!(await downloadAllBtn.isVisible().catch(() => false))) {
        consoleIssues.push("[training-records] No aparece 'Descargar todos los generados' tras generar al menos un PDF");
      }
      await shot(page, "roster-final");
    }

    console.log("→ Volver a la lista de plantillas");
    await page.getByRole("button", { name: "Plantillas" }).tap();
    await page.waitForTimeout(200);
    await shot(page, "vuelta-a-plantillas");
  }

  await browser.close();

  console.log(`\n${shotCount} capturas en scripts/mobile-check-output/`);
  if (consoleIssues.length > 0) {
    console.log(`\n⚠ ${consoleIssues.length} aviso(s)/error(es) de consola:`);
    consoleIssues.forEach((m) => console.log("  " + m));
    process.exitCode = 1;
  } else {
    console.log("\n✓ Sin errores ni avisos en consola durante el recorrido.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
