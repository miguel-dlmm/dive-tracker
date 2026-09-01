// Metadatos de versionado de la Política de Privacidad — el contenido real
// (título + secciones) vive en i18n/locales/*/auth.json →
// legal.privacyPolicy (Release V1, Fase 2: el texto legal también se
// traduce, así que ya no puede ser una constante fija en un único idioma
// como antes). Este archivo solo conserva lo que useSession.js necesita
// para el versionado del consentimiento, que es independiente del idioma
// en que la persona lo leyó.
//
// VERSION sube cada vez que cambia el contenido de forma relevante (en
// CUALQUIER idioma); eso es lo único que hace falta tocar para forzar que
// todos los usuarios vuelvan a aceptar (ver pendingLegalConsents en
// useSession.js). Borrador MVP, con [PENDIENTE]/[PENDING] donde faltan
// datos reales del responsable del tratamiento — revisar con criterio
// legal antes de considerarlo definitivo, en los dos idiomas.
export const DOCUMENT_TYPE = "privacy_policy";
// v2 (2026-08-30): renombrado de producto (antes "Ocean Pulse", una app
// "de Ocean Flow") a un único nombre, "Ocean Flow" — cambio de contenido
// real, sube VERSION para forzar la reaceptación (ver nota de VERSION
// más abajo).
export const VERSION = "v2";
