// Envoltorio visual compartido por todos los emails transaccionales de
// Ocean Flow (Bloque 7, 2026-09-01) — antes activationEmailTemplate.js y
// deploymentNoticeEmailTemplate.js duplicaban la misma tabla exterior
// (fondo, tarjeta centrada de 480px, esquinas redondeadas, footer) cada
// uno por su cuenta; esto es la única fuente de verdad de ese envoltorio,
// para que un cambio de marca (color, icono) no tenga que hacerse dos
// veces ni pueda desincronizarse entre plantillas.
//
// Cabecera con el logo real de la marca (mismo símbolo que
// public/brand/logo-mark-navy.svg — el icono de carga, el favicon y el
// carnet de instructor, ver docs/REDISENO-V2-PROGRESS.md Bloque 2), no
// el icono `Waves` de lucide-react que usaba antes esta plantilla. El
// rediseño v2 (2026-09-06) ya había sustituido `Waves` por el logo real
// en TODA la app visible (login, loading, carnet...) — este envoltorio
// de email se escribió con el criterio antiguo y quedó fuera de esa
// migración, reportado por el usuario: "en los emails sigue llegando el
// logo antiguo de waves". SVG inline en vez de una imagen (<img>): los
// principales clientes de email bloquean imágenes remotas por defecto en
// el primer vistazo (aparecería un hueco en blanco), un SVG inline con
// los mismos paths del logo real siempre se ve.
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

// Paths exactos de public/brand/logo-mark-navy.svg (viewBox 345 152 256
// 238) — mismo vectorial que usa el resto de la app. `fill` se pasa como
// parámetro (el SVG original lo trae fijo a BRAND_NAVY) para poder
// reusar esta misma función si algún día hiciera falta una variante
// clara sobre fondo oscuro, igual que ya existe logo-mark-white.svg.
function logoMarkSvg(color, size = 22) {
  return `<svg width="${size}" height="${size * (238 / 256)}" viewBox="345 152 256 238" fill="${color}" role="img" aria-label="Ocean Flow"><path d="M405.01,195.95c-16.9,18.12-23.56,43.04-21,67.21-.06,7.5,2.3,14.95,4.74,21.99,3.82,11.04,10.37,20.78,18.15,29.89,2.05,2.4,4.21,3.84,6.14,5.69,6.33,6.08,13.79,10.65,21.72,14.47,16.72,8.07,35.61,10.42,54.02,7.15,23.56-4.19,46.4-17.81,59.16-39.8-16.98,14.26-33.92,23.41-54.31,26.26-16.04.97-31.98-1.71-45.52-10.58-5.28-3.46-10.4-7.89-14.23-12.88-5.79-7.56-9.21-16.02-11.26-25.14-1.24-9.7-.4-19.35,3.83-28.46,8.6-18.51,24.19-8.2,37.05-14.59,6.82-3.39,10.78-10.62,7.95-17.88-2.36-6.08-9.47-8.26-15.27-5.8-9.9,4.2-14.51,10.82-22.71,7.12-2.55-3.11-3.42-6.81-1.17-10.78l1.08-1.91c1.76-3.1,3.95-5.96,6.65-8.3,9.22-8,21.1-9.21,32.35-6.36l16.43,7.52c3.77,1.73,8.6,1.1,12.13-1.36,2.57-1.78,5.06-5.27,5.7-9.43,1.24-8.13-3.26-15.21-9.67-19.23-18.77-11.77-54.26-3.39-74.28,9.3,0,0-6.53,3.94-17.69,15.9ZM384.1,250.85s0,0,0,0c0,0,0,.01,0,.02v-.02Z"/><path d="M591.24,247.76c-2.63-23.11-12.63-44.87-27.66-62.57l-8.69-9.2-.78.76,7.93,9.32c14.96,21.04,22.45,46.12,20.84,71.95-2.05,13.39-4.38,26.85-10.55,39.11-4.45,8.85-9.61,17.61-16.26,25.04-8.13,9.07-17.75,17.06-28.24,23.15-23.85,13.87-51.88,18.08-78.84,12.6-2.41-1.4-5.4-1.84-8.07-2.36-24.72-7.73-46.27-23.51-60.63-45.36-9.26-14.09-15.31-30.54-16.98-47.39-1.7-17.15-.29-35.02,5.95-50.96,2.24-5.72,5-11.16,7.93-16.42,2.8-5.03,6.5-9.23,10.14-15.05-5.28,2.68-7.93,8.16-11.41,12.53-4.67,5.87-8.25,12.58-11.54,19.37-6.03,12.46-9.65,26.16-10.8,40.55-.51,6.4-1.73,12.6.15,18.3-.31,9.25,2.14,18.66,4.83,27.35,14.46,46.74,56.67,79.7,105.43,83.32,14.3,1.06,28.88-.53,42.82-4.73,7.98-2.4,15.77-5.62,23.03-9.54,16.91-9.15,31.13-22.13,41.9-37.84,5.64-8.22,9.43-16.85,13.1-26.1,6.95-17.5,8.54-36.91,6.39-55.85ZM468.34,381.42c.1-.03.21-.05.3-.09.02.04.04.06.07.1-.13,0-.24,0-.37,0ZM583.24,247.8c-.02.08-.05.14-.07.23-.03-.08-.05-.16-.09-.25.06,0,.1.01.16.01Z"/></svg>`;
}

function renderHeaderRow() {
  return `<tr>
    <td style="padding:32px 28px 12px 28px;text-align:center;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:9999px;background-color:${BRAND_NAVY}1A;">
        ${logoMarkSvg(BRAND_NAVY)}
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
