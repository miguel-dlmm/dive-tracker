// Genera las capturas reales que usa src/help/content.js (campo
// `image: { src, alt }` de un paso — ver HelpStep.jsx, que ya sabía
// pintarlas desde el rediseño de Ayuda de 2026-08-29 pero nunca llegó a
// tener ninguna: se evaluaron capturas en esa sesión y en la del
// 2026-08-30 y se descartaron porque mostraban la cuenta de desarrollo
// ("dev-bypass") en la cabecera y datos de prueba repetidos — no
// presentables para un usuario real. Pedido explícito 2026-08-30
// (segunda vuelta): "añade multimedia a la ayuda, capturas de pantalla".
//
// Recorte deliberado (`clip`) para no mostrar la cabecera (con el nombre
// de la cuenta) en ninguna captura — encaja además mejor con el uso real
// (una imagen ilustra UN paso concreto, no la pantalla entera).
//
// Requiere lo mismo que mobile-check.mjs: `npm run dev` con
// VITE_DEV_AUTH_BYPASS activo, y el motor Chromium de Playwright.
//
// Uso:
//   npm run dev                                   # en otra terminal
//   node scripts/capture-help-screenshots.mjs
//
// Las imágenes se guardan en public/help/ (versionadas — a diferencia de
// scripts/mobile-check-output/, esto SÍ son assets reales de la app, no
// resultado de una ejecución local) y se referencian desde content.js
// como "/help/<archivo>.png".

import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "help");
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = process.env.MOBILE_CHECK_URL || "http://localhost:5173";
const HEADER_HEIGHT = 92; // recorta la cabecera (marca + nombre de cuenta)

async function shot(page, name, { height } = {}) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({
    path: file,
    clip: { x: 0, y: HEADER_HEIGHT, width: 430, height: height || 740 - HEADER_HEIGHT },
  });
  console.log(`  📸 ${name} -> public/help/${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 14 Pro Max"] });
  const page = await context.newPage();

  console.log(`Capturando en ${BASE_URL}...\n`);
  await page.goto(BASE_URL);
  await Promise.race([
    page.waitForSelector("text=Mi trabajo", { timeout: 15000 }),
    page.waitForSelector("text=Privacidad y condiciones de uso", { timeout: 15000 }),
  ]);
  if (await page.getByText("Privacidad y condiciones de uso").isVisible().catch(() => false)) {
    await page.getByRole("checkbox").tap();
    await page.getByRole("button", { name: "Continuar" }).tap();
    await page.waitForSelector("text=Mi trabajo", { timeout: 15000 });
  }
  if (await page.getByRole("dialog").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  }
  await page.waitForTimeout(300);

  // ---- Home: vistazo general (Primeros pasos) ----
  await page.getByRole("button", { name: "Ir a Home" }).tap().catch(() => {});
  await page.waitForTimeout(300);
  await shot(page, "home-vistazo", { height: 500 });

  // ---- Mi trabajo: pendientes + "Confirmar cobro" ----
  await page.getByRole("button", { name: "Mi trabajo" }).tap();
  await page.waitForTimeout(300);
  await shot(page, "mi-trabajo-pendientes", { height: 420 });

  // ---- Crear un movimiento: selector de tipo integrado (FAB de Mi trabajo) ----
  await page.locator('button[aria-label="Añadir"]').tap();
  await page.waitForTimeout(300);
  await shot(page, "crear-movimiento-tipo", { height: 260 });
  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(200);

  // ---- Resumen: franja de tendencia + total ----
  await page.getByRole("button", { name: "Resumen" }).tap();
  await page.waitForTimeout(400);
  await shot(page, "resumen-tendencia", { height: 420 });

  // ---- Configuración: menú agrupado ----
  await page.locator('button[aria-label="Configuración"]').tap();
  await page.waitForTimeout(300);
  await shot(page, "configuracion-menu", { height: 420 });

  await browser.close();
  console.log("\nListo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
