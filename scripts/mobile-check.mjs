// Verificación automática y recurrente en un navegador con emulación
// móvil real (viewport, densidad de píxel y eventos táctiles de un
// iPhone 14 Pro Max) — no solo Chrome de escritorio redimensionado a
// mano. Ver CLAUDE.md "8. Verificación UX/UI (mobile-check)" para el
// porqué de Chromium (no WebKit) en este proyecto.
//
// Requiere `npm run dev` arrancado aparte (con VITE_DEV_AUTH_BYPASS
// activo, ver CLAUDE.md "Bypass de login en desarrollo") y el motor
// Chromium de Playwright instalado una vez:
//   npx playwright install chromium
//
// Uso:
//   npm run dev                        # en una terminal
//   npm run mobile-check                # en otra
//   npm run mobile-check -- --headed    # para ver la ventana en vivo
//
// Cada pantalla relevante del recorrido se vuelca como captura en
// scripts/mobile-check-output/ (no versionada, ver .gitignore) para
// revisión visual humana; los errores/avisos de consola del navegador se
// listan al final y el proceso termina con código de salida != 0 si hay
// alguno, para poder engancharlo a un chequeo automático.
//
// Esto sigue sin ser una prueba en un iPhone físico real — usa el motor
// de Chromium con emulación de iPhone 14 Pro Max (viewport, densidad de
// píxel y taps reales vía Playwright, no clics de ratón), no el motor
// WebKit que usa Safari de verdad. Sirve para detectar de forma
// automática y recurrente, en cada sesión de trabajo, la clase de bugs
// más frecuente (paneles flotantes mal posicionados, objetivos táctiles
// pequeños, animaciones rotas, errores de consola) antes de pedirle al
// usuario que lo pruebe en su iPhone — no para sustituir esa prueba en
// los casos que dependen del motor de render real de Safari o del
// teclado virtual de iOS (ver el ADR para el intento fallido con WebKit
// en este entorno concreto).

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
  const file = path.join(OUT_DIR, `${String(shotCount).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file });
  console.log(`  📸 ${label} -> ${path.relative(process.cwd(), file)}`);
}

async function main() {
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ ...devices["iPhone 14 Pro Max"] });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleIssues.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${err.message}`));

  console.log(`\nChromium (emulación iPhone 14 Pro Max) · ${BASE_URL}\n`);

  await page.goto(BASE_URL);
  await page.waitForSelector("text=Mi trabajo", { timeout: 15000 });
  await shot(page, "home");

  console.log("→ Mi trabajo");
  await page.locator("text=Mi trabajo").first().tap();
  await page.waitForTimeout(400);
  await shot(page, "mi-trabajo-lista");

  console.log("→ Abrir creación (FAB)");
  await page.locator('button[aria-label="Añadir"]').tap();
  await page.waitForTimeout(200);
  await shot(page, "form-curso");

  console.log("→ Select Curso (abrir/cerrar)");
  await page.getByLabel("Curso").tap();
  await page.waitForTimeout(150);
  await shot(page, "select-curso-abierto");
  await page.getByRole("option").first().tap();
  await page.waitForTimeout(150);
  await shot(page, "select-curso-cerrado");

  console.log("→ Cambiar tipo -> Ajuste de curso (Moneda)");
  await page.getByRole("tab", { name: /Ajuste de curso/ }).tap();
  await page.waitForTimeout(150);
  await page.getByLabel(/Buscar moneda/).tap();
  await page.waitForTimeout(150);
  await shot(page, "moneda-abierta");
  await page.getByLabel(/Buscar moneda/).fill("dolar");
  await page.waitForTimeout(150);
  await shot(page, "moneda-busqueda-sin-tilde");
  await page.keyboard.press("Escape");

  console.log("→ Añadir nota (textarea autoexpandible)");
  await page.getByRole("button", { name: /Añadir nota/ }).tap();
  await page.getByLabel("Notas").fill("Prueba de nota larga para comprobar que el área de texto crece con el contenido, no solo en el formulario de escritorio.");
  await page.waitForTimeout(150);
  await shot(page, "nota-autoexpandida");

  console.log("→ Cerrar hoja");
  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(200);

  console.log("→ Cobrados: menú '⋯' y borrado con animación");
  await page.locator("text=Cobrados").tap();
  await page.waitForTimeout(300);
  await shot(page, "cobrados-lista");
  const menuButtons = page.locator('button[aria-label="Más acciones"]');
  if (await menuButtons.count() > 0) {
    await menuButtons.first().tap();
    await page.waitForTimeout(150);
    await shot(page, "row-menu-abierto");
    await page.getByRole("menuitem", { name: /Eliminar/ }).tap();
    await page.waitForTimeout(100);
    await shot(page, "confirm-dialog-eliminar");
    await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).tap();
    await page.waitForTimeout(80); // a mitad de la animación de salida
    await shot(page, "fila-animando-salida");
    await page.waitForTimeout(400);
    await shot(page, "fila-eliminada");
  } else {
    console.log("  (sin filas en Cobrados para probar el borrado — omitido)");
  }

  console.log("→ Resumen: cabecera sticky con sombra al hacer scroll");
  await page.locator("text=Volver a Home").first().tap().catch(() => {}); // por si quedó en Cobrados con la hoja cerrada
  await page.locator("text=Resumen").first().tap();
  await page.waitForTimeout(300);
  await shot(page, "resumen");
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  await shot(page, "resumen-scroll-cabecera-sticky");
  await page.mouse.wheel(0, -600);

  console.log("→ Ayuda/Configuración: acceso secundario con '‹ Volver' en cabecera");
  await page.locator('button[aria-label="Ayuda"]').tap();
  await page.waitForTimeout(300);
  await shot(page, "ayuda");
  await page.locator('button[aria-label="Volver a Home"]').tap();
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Configuración"]').tap();
  await page.waitForTimeout(300);
  await shot(page, "configuracion");
  await page.locator('button[aria-label="Volver a Home"]').tap();
  await page.waitForTimeout(300);

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
