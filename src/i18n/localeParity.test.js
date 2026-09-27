import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Informe de deuda técnica 2026-09 (prioridad Alta, quick win #3): no
// existía ningún mecanismo automático que verificara que los 15 idiomas
// tienen las mismas claves — solo disciplina manual. Este test compara,
// espacio de nombres a espacio de nombres, las claves de cada idioma
// contra `es` (fallbackLng real en src/i18n/index.js), para detectar en
// CI cualquier clave que falte o que sobre antes de que llegue a
// producción como un texto en blanco o sin traducir para el usuario.

const LOCALES_DIR = dirname(fileURLToPath(import.meta.url)) + "/locales";
const REFERENCE_LOCALE = "es";

// Solo "<namespace>.json" exacto — ignora los duplicados de conflicto de
// sincronización de iCloud que a veces aparecen en disco ("common
// 2.json"), que no están versionados y no deben tratarse como un idioma
// real.
const NAMESPACE_FILE = /^[a-zA-Z]+\.json$/;

function listLocales() {
  return readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listNamespaces(locale) {
  return readdirSync(join(LOCALES_DIR, locale))
    .filter((name) => NAMESPACE_FILE.test(name))
    .map((name) => name.replace(/\.json$/, ""));
}

function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value, path);
    }
    return [path];
  });
}

function readNamespaceKeys(locale, namespace) {
  const raw = readFileSync(join(LOCALES_DIR, locale, `${namespace}.json`), "utf8");
  return new Set(flattenKeys(JSON.parse(raw)));
}

const locales = listLocales();
const namespaces = listNamespaces(REFERENCE_LOCALE);

describe(`i18n — paridad de claves entre los ${locales.length} idiomas`, () => {
  it(`${REFERENCE_LOCALE} (fallbackLng) tiene al menos un namespace y una clave`, () => {
    expect(namespaces.length).toBeGreaterThan(0);
    expect(readNamespaceKeys(REFERENCE_LOCALE, namespaces[0]).size).toBeGreaterThan(0);
  });

  for (const namespace of namespaces) {
    it(`${namespace}.json: todos los idiomas tienen exactamente las claves de "${REFERENCE_LOCALE}"`, () => {
      const referenceKeys = readNamespaceKeys(REFERENCE_LOCALE, namespace);
      const problems = [];

      for (const locale of locales) {
        if (locale === REFERENCE_LOCALE) continue;
        const localeKeys = readNamespaceKeys(locale, namespace);
        const missing = [...referenceKeys].filter((k) => !localeKeys.has(k));
        const extra = [...localeKeys].filter((k) => !referenceKeys.has(k));
        if (missing.length > 0 || extra.length > 0) {
          problems.push({ locale, missing, extra });
        }
      }

      expect(problems).toEqual([]);
    });
  }
});
