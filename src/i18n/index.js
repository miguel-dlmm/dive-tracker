import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esApp from "./locales/es/app.json";
import esHome from "./locales/es/home.json";
import esTrabajo from "./locales/es/trabajo.json";
import esSummary from "./locales/es/summary.json";
import esConfig from "./locales/es/config.json";
import esProfile from "./locales/es/profile.json";
import esHelp from "./locales/es/help.json";
import esNotices from "./locales/es/notices.json";
import esRates from "./locales/es/rates.json";
import esTrainingRecords from "./locales/es/trainingRecords.json";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enApp from "./locales/en/app.json";
import enHome from "./locales/en/home.json";
import enTrabajo from "./locales/en/trabajo.json";
import enSummary from "./locales/en/summary.json";
import enConfig from "./locales/en/config.json";
import enProfile from "./locales/en/profile.json";
import enHelp from "./locales/en/help.json";
import enNotices from "./locales/en/notices.json";
import enRates from "./locales/en/rates.json";
import enTrainingRecords from "./locales/en/trainingRecords.json";

// Idioma preferido — Release V1 Fase 2. Fuente de verdad real: la columna
// profiles.language (se sincroniza tras cargar sesión, ver useSession.js/
// App.jsx). Esta clave de localStorage es solo el valor de arranque para
// pantallas SIN sesión todavía (Login, Registro, recuperar contraseña...)
// — mismo criterio ya establecido por ADR-0007 para preferencias
// personales que no son dato de negocio. 'es' si nunca se ha elegido nada,
// tal como pide el documento maestro ("por defecto aparecerá español").
export const LANGUAGE_STORAGE_KEY = "oceanpulse:language";
export const SUPPORTED_LANGUAGES = ["es", "en"];

export function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : "es";
  } catch {
    return "es";
  }
}

export function setStoredLanguage(lang) {
  try {
    if (SUPPORTED_LANGUAGES.includes(lang)) localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch { /* no-op */ }
}

// Un namespace por pantalla (mismo criterio "un archivo por pantalla" que
// ya sigue el resto del proyecto, ver CLAUDE.md — evita un único JSON
// gigante y dos pantallas nunca comparten claves por accidente) + "common"
// para lo verdaderamente compartido (shared.jsx: botones, vacíos, diálogos
// genéricos). Todo bundleado en build time (import estático, no fetch en
// runtime): la app es pequeña, un backend de carga diferida sería
// complejidad sin beneficio real todavía.
i18n.use(initReactI18next).init({
  resources: {
    es: { common: esCommon, auth: esAuth, app: esApp, home: esHome, trabajo: esTrabajo, summary: esSummary, config: esConfig, profile: esProfile, help: esHelp, notices: esNotices, rates: esRates, trainingRecords: esTrainingRecords },
    en: { common: enCommon, auth: enAuth, app: enApp, home: enHome, trabajo: enTrabajo, summary: enSummary, config: enConfig, profile: enProfile, help: enHelp, notices: enNotices, rates: enRates, trainingRecords: enTrainingRecords },
  },
  lng: getStoredLanguage(),
  fallbackLng: "es",
  ns: ["common", "auth", "app", "home", "trabajo", "summary", "config", "profile", "help", "notices", "rates", "trainingRecords"],
  defaultNS: "common",
  interpolation: { escapeValue: false }, // React ya escapa — evita doble escape de acentos/símbolos
  returnNull: false,
});

export default i18n;
