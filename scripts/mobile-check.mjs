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

  console.log("→ 'Qué hay de nuevo': recorrer las diapositivas y cerrar con 'Empezar'");
  if (await page.getByRole("dialog").isVisible().catch(() => false)) {
    await shot(page, "whats-new-primera-diapositiva");
    let guard = 0;
    while (await page.getByRole("button", { name: "Siguiente" }).isVisible().catch(() => false) && guard < 10) {
      await page.getByRole("button", { name: "Siguiente" }).tap();
      await page.waitForTimeout(250);
      guard += 1;
    }
    await shot(page, "whats-new-ultima-diapositiva");
    await page.getByRole("button", { name: "Empezar" }).tap();
    await page.waitForTimeout(200);
  } else {
    console.log("  (no apareció — ya se había marcado como vista para esta cuenta)");
  }

  await shot(page, "home");

  console.log("→ Home: 'Añadir movimiento' (integrado en la tarjeta Pendiente de cobrar) abre el formulario SIN salir de Home");
  await page.getByRole("button", { name: "Añadir movimiento", exact: true }).tap();
  await page.waitForTimeout(250);
  await shot(page, "home-anadir-movimiento");
  const activeTabWithSheetOpen = await page.locator('nav button[aria-current="page"]').textContent();
  if (activeTabWithSheetOpen?.trim() !== "Home") {
    consoleIssues.push(`[nav] Al abrir 'Añadir movimiento' desde Home, la pestaña activa pasó a ser "${activeTabWithSheetOpen?.trim()}" — debe seguir en Home mientras se rellena`);
  }

  console.log("→ Cerrar el formulario sin guardar: debe quedarse en Home, no navegar a Mi trabajo");
  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(200);
  const activeTabAfterCancel = await page.locator('nav button[aria-current="page"]').textContent();
  if (activeTabAfterCancel?.trim() !== "Home") {
    consoleIssues.push(`[nav] Tras cerrar 'Añadir movimiento' sin guardar, la pestaña activa es "${activeTabAfterCancel?.trim()}", no "Home"`);
  }
  await shot(page, "home-tras-cerrar-sin-guardar");

  console.log("→ Guardar desde el acceso rápido de Home: debe navegar a Mi trabajo solo tras el guardado, y el movimiento debe verse allí");
  await page.getByRole("button", { name: "Añadir movimiento", exact: true }).tap();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Guardar", exact: false }).tap();
  await page.waitForTimeout(600);
  const activeTabAfterSave = await page.locator('nav button[aria-current="page"]').textContent();
  if (activeTabAfterSave?.trim() !== "Mi trabajo") {
    consoleIssues.push(`[nav] Tras guardar desde el acceso rápido de Home, la pestaña activa es "${activeTabAfterSave?.trim()}", no "Mi trabajo"`);
  }
  await shot(page, "mi-trabajo-tras-guardar-desde-home");
  const pendientesTabAfterHomeSave = page.getByRole("button", { name: "Pendientes", exact: false });
  if (!(await pendientesTabAfterHomeSave.isVisible().catch(() => false))) {
    consoleIssues.push("[home->mi-trabajo] Tras guardar desde Home, no se encuentra la pestaña 'Pendientes' en Mi trabajo para localizar el movimiento recién creado");
  }

  // Volver a Home antes del siguiente paso, que también parte de Home.
  await page.locator("text=Home").first().tap();
  await page.waitForTimeout(300);

  console.log("→ Home: tocar un día vacío del calendario abre 'Nuevo curso impartido' con esa fecha, sin salir de Home");
  const creatableDay = page.locator('button[aria-label^="Añadir movimiento el"]').first();
  const dayLabel = await creatableDay.getAttribute("aria-label");
  console.log(`  (día tocado: "${dayLabel}" — comprobar que la fecha del formulario coincide, no la de hoy)`);
  await creatableDay.tap();
  await page.waitForTimeout(250);
  await shot(page, "home-dia-vacio-abre-formulario");
  const activeTabWithDaySheetOpen = await page.locator('nav button[aria-current="page"]').textContent();
  if (activeTabWithDaySheetOpen?.trim() !== "Home") {
    consoleIssues.push(`[nav] Al abrir el formulario desde un día del calendario de Home, la pestaña activa pasó a ser "${activeTabWithDaySheetOpen?.trim()}" — debe seguir en Home mientras se rellena`);
  }
  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(200);
  // El día tocado navega a Mi trabajo (mismo flujo que el FAB) — volver a
  // Home antes de continuar, para que el resto del recorrido no dependa
  // de en qué pestaña te deja este paso concreto.
  await page.locator("text=Home").first().tap();
  await page.waitForTimeout(300);

  console.log("→ Mi trabajo");
  await page.locator("text=Mi trabajo").first().tap();
  await page.waitForTimeout(400);
  await shot(page, "mi-trabajo-lista");

  console.log("→ Recargar en Mi trabajo: debe seguir en Mi trabajo, no volver a Home");
  await page.reload();
  await page.waitForSelector("text=Mi trabajo", { timeout: 15000 });
  await page.waitForTimeout(300);
  const activeTabAfterReload = await page.locator('nav button[aria-current="page"]').textContent();
  if (activeTabAfterReload?.trim() !== "Mi trabajo") {
    consoleIssues.push(`[nav] Tras recargar en Mi trabajo, la pestaña activa es "${activeTabAfterReload?.trim()}", no "Mi trabajo"`);
  }
  await shot(page, "mi-trabajo-tras-recargar");

  console.log("→ Mi trabajo -> Ayuda -> Cerrar: debe volver a Mi trabajo, no a Home");
  await page.locator('button[aria-label="Ayuda"]').tap();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(300);
  const activeTabAfterAyuda = await page.locator('nav button[aria-current="page"]').textContent();
  if (activeTabAfterAyuda?.trim() !== "Mi trabajo") {
    consoleIssues.push(`[nav] Tras cerrar Ayuda (entrada desde Mi trabajo), la pestaña activa es "${activeTabAfterAyuda?.trim()}", no "Mi trabajo"`);
  }
  await shot(page, "mi-trabajo-tras-cerrar-ayuda");

  console.log("→ Crear Curso -> nace Pendiente -> alternar Cobrado/Pendiente en ambos sentidos");
  await page.locator('button[aria-label="Añadir"]').tap();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Guardar", exact: false }).tap();
  // El toast de "Curso añadido" dura 3000ms (sin acción) — esperar a que
  // desaparezca del todo antes de seguir, para no confundirlo con el toast
  // del siguiente paso (con "Deshacer", dura 5000ms) al leer su texto.
  await page.waitForTimeout(3300);
  await shot(page, "curso-creado-en-pendientes");
  const toggleBtn = page.locator('button:has-text("Confirmar cobro")').first();
  const hasNewPending = await toggleBtn.count() > 0;
  if (!hasNewPending) {
    consoleIssues.push("[payment-status] El Curso recién creado no aparece en Pendientes con la acción \"Confirmar cobro\" — revisar payment_statuses.");
  } else {
    await toggleBtn.tap();
    await page.waitForTimeout(200);
    const toastAfterCobrar = await page.locator('[role="status"]').last().textContent().catch(() => "");
    console.log(`  (toast al cobrar: "${toastAfterCobrar?.trim()}")`);
    if (!/cobrado/i.test(toastAfterCobrar || "")) {
      consoleIssues.push(`[payment-status] Al confirmar cobro, el toast dice "${toastAfterCobrar?.trim()}" — se esperaba que mencionara "cobrado".`);
    }
    await page.waitForTimeout(5200); // deja expirar el toast (con "Deshacer", 5000ms) antes de seguir
    await page.getByRole("button", { name: "Cobrados", exact: true }).tap();
    await page.waitForTimeout(300);
    await shot(page, "curso-tras-cobrar");
    const pendingAgainBtn = page.locator('button:has-text("Marcar pendiente")').first();
    if (await pendingAgainBtn.count() > 0) {
      await pendingAgainBtn.tap();
      await page.waitForTimeout(200);
      const toastAfterPendiente = await page.locator('[role="status"]').last().textContent().catch(() => "");
      console.log(`  (toast al marcar pendiente: "${toastAfterPendiente?.trim()}")`);
      if (!/pendiente/i.test(toastAfterPendiente || "")) {
        consoleIssues.push(`[payment-status] Al marcar pendiente, el toast dice "${toastAfterPendiente?.trim()}" — se esperaba que mencionara "pendiente".`);
      }
      await page.waitForTimeout(5200);
      await page.getByRole("button", { name: /^Pendientes/ }).tap();
      await page.waitForTimeout(300);
      await shot(page, "curso-tras-marcar-pendiente-de-nuevo");
      // Limpieza: no dejar el movimiento de prueba en la cuenta.
      const rowMenu = page.locator('button[aria-label="Más acciones"]').first();
      if (await rowMenu.count() > 0) {
        await rowMenu.tap();
        await page.waitForTimeout(150);
        await page.getByRole("menuitem", { name: /Eliminar/ }).tap();
        await page.waitForTimeout(100);
        await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).tap();
        await page.waitForTimeout(500);
      }
    } else {
      consoleIssues.push('[payment-status] Tras cobrar, no se encontró el botón "Marcar pendiente" en Cobrados.');
    }
  }

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

  console.log("→ Resumen: vistazo rápido (tarjeta principal + Por escuela abierta), y profundidad bajo demanda");
  await page.locator("text=Resumen").first().tap();
  await page.waitForTimeout(300);
  await shot(page, "resumen-vistazo-rapido");

  console.log("→ Resumen: expandir Calendario y Comisiones (tarjetas plegables)");
  await page.getByRole("button", { name: "Calendario", exact: false }).tap();
  await page.waitForTimeout(350);
  await shot(page, "resumen-calendario-expandido");
  await page.getByRole("button", { name: "Comisiones", exact: false }).tap();
  await page.waitForTimeout(350);
  await shot(page, "resumen-comisiones-expandida");

  console.log("→ Resumen: tocar una escuela en 'Por escuela' expande su desglose por curso en el sitio");
  const porEscuelaCard = page.getByRole("button", { name: "Por escuela", exact: false }).locator("xpath=..");
  const schoolToggle = porEscuelaCard.locator("ul li button").first();
  if (await schoolToggle.count() > 0) {
    await schoolToggle.tap();
    await page.waitForTimeout(350);
    await shot(page, "resumen-escuela-expandida");
  } else {
    console.log("  (sin escuelas con datos en el periodo actual — omitido)");
  }

  console.log("→ Resumen: cabecera sticky con sombra al hacer scroll");
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(250);
  await shot(page, "resumen-scroll-cabecera-sticky");
  await page.mouse.wheel(0, -600);

  console.log("→ Ayuda/Configuración: acceso secundario con 'X Cerrar' en cabecera (vuelve a la pestaña de origen, ver App.jsx returnTab)");
  await page.locator('button[aria-label="Ayuda"]').tap();
  await page.waitForTimeout(300);
  await shot(page, "ayuda-menu-agrupado");

  console.log("→ Ayuda: entrar en una categoría de 'Quiero...', abrir un artículo y volver");
  await page.locator("text=Registrar un movimiento").first().tap();
  await page.waitForTimeout(200);
  await shot(page, "ayuda-lista-articulos");
  await page.locator("text=Crear un movimiento").first().tap();
  await page.waitForTimeout(200);
  await shot(page, "ayuda-articulo");
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(250);
  await shot(page, "ayuda-scroll-cabecera");
  await page.mouse.wheel(0, -500);
  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Configuración"]').tap();
  await page.waitForTimeout(300);
  await shot(page, "configuracion-menu");

  console.log("→ Configuración: entrar en Escuelas, crear vía FAB+hoja, y volver al menú con '‹ Configuración'");
  await page.locator("text=Escuelas").first().tap();
  await page.waitForTimeout(200);
  await shot(page, "configuracion-escuelas");
  await page.getByRole("button", { name: "Nueva escuela", exact: true }).tap();
  await page.waitForTimeout(200);
  await shot(page, "configuracion-escuelas-nueva-hoja");
  // Dos botones "Cerrar" en pantalla a la vez aquí: el "✕ Cerrar" de la
  // cabecera exterior (sale de Configuración entera) y el de la propia
  // hoja de alta (solo la cierra a ella) — se escoge el de <main>, que es
  // el de la hoja, no el de <header>.
  await page.getByRole("main").getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(200);
  // "Configuración" también es el texto de la cabecera exterior (que
  // cierra la pantalla entera) — el "‹ Configuración" de vuelta al menú
  // vive dentro de <main>, hay que acotar a esa región para no pulsar la
  // cabecera por error.
  await page.getByRole("main").getByRole("button", { name: "Configuración" }).tap();
  await page.waitForTimeout(200);
  const backAtMenu = await page.getByText("Cursos", { exact: true }).isVisible().catch(() => false);
  if (!backAtMenu) {
    consoleIssues.push("[configuracion] Tras pulsar '‹ Configuración' desde Escuelas, no se ve de vuelta el menú agrupado.");
  }

  console.log("→ Configuración: Tarifas — fila con RowMenu '⋯' (coherencia con Mi trabajo)");
  await page.locator("text=Tarifas").first().tap();
  await page.waitForTimeout(300);
  await shot(page, "configuracion-tarifas");
  const rateMenuBtn = page.getByRole("button", { name: "Más acciones" }).first();
  if (await rateMenuBtn.isVisible().catch(() => false)) {
    await rateMenuBtn.tap();
    await page.waitForTimeout(200);
    await shot(page, "configuracion-tarifas-menu-abierto");
    const hasEditar = await page.getByRole("menuitem", { name: "Editar" }).isVisible().catch(() => false);
    const hasEliminar = await page.getByRole("menuitem", { name: /Eliminar/ }).isVisible().catch(() => false);
    if (!hasEditar || !hasEliminar) {
      consoleIssues.push("[tarifas] El menú '⋯' de una tarifa no muestra Editar y Eliminar.");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  } else {
    console.log("  (sin tarifas existentes para probar el RowMenu — omitido)");
  }
  await page.getByRole("main").getByRole("button", { name: "Configuración" }).tap();
  await page.waitForTimeout(200);

  const hasAdminGroup = await page.getByText("Administración", { exact: true }).isVisible().catch(() => false);
  if (hasAdminGroup) {
    console.log("→ Configuración: grupo Administración visible (cuenta con rol admin/superadmin) — entrar en Usuarios");
    await page.locator("text=Usuarios").first().tap();
    // El directorio depende de una llamada real a Supabase (admin_list_profiles)
    // más /api/list-user-status — un timeout fijo corto capturaba la
    // captura en pleno "Cargando usuarios...". Se espera a que ese texto
    // desaparezca en vez de adivinar cuánto tarda la red.
    await page.getByText("Cargando usuarios…").waitFor({ state: "detached", timeout: 8000 }).catch(() => {
      consoleIssues.push("[usuarios] El directorio siguió en 'Cargando usuarios…' más de 8s.");
    });
    await page.waitForTimeout(200);
    await shot(page, "configuracion-usuarios");
    await page.getByRole("main").getByRole("button", { name: "Configuración" }).tap();
    await page.waitForTimeout(200);
  } else {
    console.log("  (grupo Administración no visible — cuenta sin rol admin/superadmin, esperado si no se usó dev-bypass con esos permisos)");
  }

  await page.getByRole("button", { name: "Cerrar", exact: true }).tap();
  await page.waitForTimeout(300);

  console.log("→ Cerrar sesión (bypass, tras la recarga de antes): debe volver al login normal, no volver a autenticarse sola");
  await page.locator('button[aria-label="Cerrar sesión"]').tap();
  try {
    await page.getByLabel("Email o nickname").waitFor({ timeout: 8000 });
    console.log("  (pantalla de login normal visible tras cerrar sesión — correcto)");
  } catch {
    consoleIssues.push("[dev-bypass] Tras cerrar sesión, no apareció la pantalla de login normal en 8s (¿se quedó cargando?).");
  }
  await shot(page, "login-tras-logout");

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
