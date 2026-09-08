import es from "../i18n/locales/es/help.json";
import en from "../i18n/locales/en/help.json";

// Regla permanente (CLAUDE.md, "Reglas permanentes — Release V1", punto 1):
// la Ayuda nunca documenta funcionalidades de admin ni de superadmin, ni
// siquiera de pasada — no basta con ocultarlas a quien no tiene el rol,
// no deben existir en el texto en absoluto. Se encontró un incumplimiento
// real en la auditoría 2026-09-04 ("configurar-app" mencionaba de refilón
// el bloque "Administración" — tipos/estados de pago, monedas, colores,
// usuarios — solo para decir que existía si el usuario era admin), ya
// corregido en este mismo rediseño. Esta prueba es la guarda de
// regresión: escanea TODO el texto de Ayuda (ambos idiomas) en busca de
// vocabulario que solo tiene sentido si se está describiendo una
// funcionalidad de admin/superadmin — no basta con probar el artículo que
// tenía el problema, cualquier artículo futuro podría reintroducirlo.
//
// Palabras elegidas a partir de ADMIN_SECTIONS/SUPERADMIN_SECTIONS en
// ConfigTab.jsx (estados de pago, monedas EN TANTO CATÁLOGO DE ADMIN,
// colores de sección, usuarios, datasets) — no de BUSINESS_SECTIONS
// (escuelas, cursos, tarifas), que sí puede y debe documentarse.
const FORBIDDEN_PATTERNS = [
  /\badmin(istrad|istrac|istrat)/i, // administrador/a, administración, administrator
  /superadmin/i,
  /\bdataset/i,
  /\bestados? de pago\b/i,
  /\bpayment (type|status)(es)?\b/i,
];

function flattenText(node, out = []) {
  if (typeof node === "string") {
    out.push(node);
  } else if (Array.isArray(node)) {
    node.forEach((n) => flattenText(n, out));
  } else if (node && typeof node === "object") {
    Object.values(node).forEach((n) => flattenText(n, out));
  }
  return out;
}

describe("Ayuda — nunca documenta admin/superadmin (CLAUDE.md, Release V1, regla 1)", () => {
  it.each([
    ["es", es],
    ["en", en],
  ])("help.json (%s) no contiene vocabulario de admin/superadmin", (_locale, dict) => {
    const strings = flattenText(dict);
    for (const pattern of FORBIDDEN_PATTERNS) {
      const hit = strings.find((s) => pattern.test(s));
      expect(hit, `texto sospechoso de contenido admin: "${hit}"`).toBeUndefined();
    }
  });
});
