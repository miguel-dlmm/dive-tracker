// Envoltorio visual compartido por todos los emails transaccionales de
// Ocean Flow (Bloque 7, 2026-09-01) — antes activationEmailTemplate.js y
// deploymentNoticeEmailTemplate.js duplicaban la misma tabla exterior
// (fondo, tarjeta centrada de 480px, esquinas redondeadas, footer) cada
// uno por su cuenta; esto es la única fuente de verdad de ese envoltorio,
// para que un cambio de marca (color, icono) no tenga que hacerse dos
// veces ni pueda desincronizarse entre plantillas.
//
// Cabecera con icono real de la app (Waves, mismo que LoginScreen.jsx),
// no solo el nombre en texto — coherencia visual real con el login, no
// solo de paleta de color. SVG inline en vez de una imagen (<img>): los
// principales clientes de email bloquean imágenes remotas por defecto en
// el primer vistazo (aparecería un hueco en blanco), un SVG inline con
// los mismos paths que lucide-react's "Waves" siempre se ve.
//
// html lang="es": accesibilidad — lectores de pantalla necesitan saber el
// idioma del contenido para elegir la voz/pronunciación correctas.
//
// BRAND_NAVY: mismo valor que src/colors.js (paleta del rediseño v2,
// docs/DESIGN-SYSTEM.md §3.1) — no se importa desde ahí porque
// server/email/ es un árbol de código deliberadamente independiente de
// src/ (sin acoplarlo a Vite/React para poder desplegarse como función
// serverless), así que el valor se duplica aquí a propósito, igual que
// ya hacía con la paleta antigua. Corrige un hueco real: hasta ahora
// estas constantes se llamaban NAVY/TEAL y llevaban los valores previos
// al rebrand (#0F172A/#0F766E, los mismos que las constantes legado del
// mismo nombre en src/colors.js) — los emails seguían con la marca
// antigua aunque el resto de la app visible ya se hubiera migrado
// (reportado por el usuario: "los emails no están adaptados al
// rediseño"). Un solo color de marca (antes NAVY+TEAL) porque en el
// resto de la app BRAND_SKY solo se usa como tinte suave sobre fondos
// claros, nunca como color sólido de botón/CTA — el mismo BRAND_NAVY
// que ya usan todos los botones sólidos de la app (ConfigTab,
// CreatePasswordScreen, DeploymentNotice...) cubre aquí tanto el botón
// como el acento del icono de cabecera, sin introducir un uso de
// BRAND_SKY que no existe en ningún otro sitio.
export const BRAND_NAVY = "#063256";
export const BG = "#F7F8F8";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Paths exactos de lucide-react "Waves" (waves-horizontal.mjs) — mismo
// icono que muestran LoginScreen.jsx/ResetPasswordScreen.jsx.
function wavesIconSvg(color, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Ocean Flow"><path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/></svg>`;
}

function renderHeaderRow() {
  return `<tr>
    <td style="padding:32px 28px 12px 28px;text-align:center;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:9999px;background-color:${BRAND_NAVY}1A;">
        ${wavesIconSvg(BRAND_NAVY)}
      </span>
      <div style="margin-top:8px;font-size:15px;font-weight:700;color:${BRAND_NAVY};">Ocean Flow</div>
    </td>
  </tr>`;
}

// bodyRows: HTML de las filas <tr> propias de cada plantilla (entre la
// cabecera y el footer). preheader: texto oculto que muchos clientes de
// email muestran como resumen junto al asunto — siempre en texto plano,
// escapado aquí, nunca responsabilidad de quien llama.
export function renderEmailShell({ preheader, bodyRows, footerText = "Ocean Flow" }) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:${BG};font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            ${renderHeaderRow()}
            ${bodyRows}
          </table>
          <p style="margin:20px 0 0 0;font-size:11px;color:#9CA3AF;text-align:center;">${escapeHtml(footerText)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
