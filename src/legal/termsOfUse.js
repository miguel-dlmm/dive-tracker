// Metadatos de versionado de los Términos de Uso — el contenido real
// (título + secciones) vive en i18n/locales/*/auth.json →
// legal.termsOfUse (Release V1, Fase 2: el texto legal también se
// traduce). Ver privacyPolicy.js para la nota completa sobre por qué este
// archivo solo conserva DOCUMENT_TYPE/VERSION y cómo funciona VERSION.
// Borrador MVP, con [PENDIENTE]/[PENDING] donde faltan datos reales de
// contacto — revisar con criterio legal antes de considerarlo definitivo,
// en los dos idiomas.
export const DOCUMENT_TYPE = "terms_of_use";
// v2 (2026-08-30): renombrado de producto (antes "Ocean Pulse", una app
// "de Ocean Flow") a un único nombre, "Ocean Flow" — cambio de contenido
// real, sube VERSION para forzar la reaceptación (ver nota de
// privacyPolicy.js sobre cómo funciona VERSION).
export const VERSION = "v2";
