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
import esInstallApp from "./locales/es/installApp.json";

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
import enInstallApp from "./locales/en/installApp.json";

import frCommon from "./locales/fr/common.json";
import frAuth from "./locales/fr/auth.json";
import frApp from "./locales/fr/app.json";
import frHome from "./locales/fr/home.json";
import frTrabajo from "./locales/fr/trabajo.json";
import frSummary from "./locales/fr/summary.json";
import frConfig from "./locales/fr/config.json";
import frProfile from "./locales/fr/profile.json";
import frHelp from "./locales/fr/help.json";
import frNotices from "./locales/fr/notices.json";
import frRates from "./locales/fr/rates.json";
import frTrainingRecords from "./locales/fr/trainingRecords.json";
import frInstallApp from "./locales/fr/installApp.json";

import itCommon from "./locales/it/common.json";
import itAuth from "./locales/it/auth.json";
import itApp from "./locales/it/app.json";
import itHome from "./locales/it/home.json";
import itTrabajo from "./locales/it/trabajo.json";
import itSummary from "./locales/it/summary.json";
import itConfig from "./locales/it/config.json";
import itProfile from "./locales/it/profile.json";
import itHelp from "./locales/it/help.json";
import itNotices from "./locales/it/notices.json";
import itRates from "./locales/it/rates.json";
import itTrainingRecords from "./locales/it/trainingRecords.json";
import itInstallApp from "./locales/it/installApp.json";

import deCommon from "./locales/de/common.json";
import deAuth from "./locales/de/auth.json";
import deApp from "./locales/de/app.json";
import deHome from "./locales/de/home.json";
import deTrabajo from "./locales/de/trabajo.json";
import deSummary from "./locales/de/summary.json";
import deConfig from "./locales/de/config.json";
import deProfile from "./locales/de/profile.json";
import deHelp from "./locales/de/help.json";
import deNotices from "./locales/de/notices.json";
import deRates from "./locales/de/rates.json";
import deTrainingRecords from "./locales/de/trainingRecords.json";
import deInstallApp from "./locales/de/installApp.json";

import caCommon from "./locales/ca/common.json";
import caAuth from "./locales/ca/auth.json";
import caApp from "./locales/ca/app.json";
import caHome from "./locales/ca/home.json";
import caTrabajo from "./locales/ca/trabajo.json";
import caSummary from "./locales/ca/summary.json";
import caConfig from "./locales/ca/config.json";
import caProfile from "./locales/ca/profile.json";
import caHelp from "./locales/ca/help.json";
import caNotices from "./locales/ca/notices.json";
import caRates from "./locales/ca/rates.json";
import caTrainingRecords from "./locales/ca/trainingRecords.json";
import caInstallApp from "./locales/ca/installApp.json";

import euCommon from "./locales/eu/common.json";
import euAuth from "./locales/eu/auth.json";
import euApp from "./locales/eu/app.json";
import euHome from "./locales/eu/home.json";
import euTrabajo from "./locales/eu/trabajo.json";
import euSummary from "./locales/eu/summary.json";
import euConfig from "./locales/eu/config.json";
import euProfile from "./locales/eu/profile.json";
import euHelp from "./locales/eu/help.json";
import euNotices from "./locales/eu/notices.json";
import euRates from "./locales/eu/rates.json";
import euTrainingRecords from "./locales/eu/trainingRecords.json";
import euInstallApp from "./locales/eu/installApp.json";

// Idioma preferido — Release V1 Fase 2. Fuente de verdad real: la columna
// profiles.language (se sincroniza tras cargar sesión, ver useSession.js/
// App.jsx). Esta clave de localStorage es solo el valor de arranque para
// pantallas SIN sesión todavía (Login, Registro, recuperar contraseña...)
// — mismo criterio ya establecido por ADR-0007 para preferencias
// personales que no son dato de negocio. 'es' si nunca se ha elegido nada,
// tal como pide el documento maestro ("por defecto aparecerá español").
export const LANGUAGE_STORAGE_KEY = "oceanpulse:language";
export const SUPPORTED_LANGUAGES = ["es", "en", "fr", "it", "de", "ca", "eu"];

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
    es: { common: esCommon, auth: esAuth, app: esApp, home: esHome, trabajo: esTrabajo, summary: esSummary, config: esConfig, profile: esProfile, help: esHelp, notices: esNotices, rates: esRates, trainingRecords: esTrainingRecords, installApp: esInstallApp },
    en: { common: enCommon, auth: enAuth, app: enApp, home: enHome, trabajo: enTrabajo, summary: enSummary, config: enConfig, profile: enProfile, help: enHelp, notices: enNotices, rates: enRates, trainingRecords: enTrainingRecords, installApp: enInstallApp },
    fr: { common: frCommon, auth: frAuth, app: frApp, home: frHome, trabajo: frTrabajo, summary: frSummary, config: frConfig, profile: frProfile, help: frHelp, notices: frNotices, rates: frRates, trainingRecords: frTrainingRecords, installApp: frInstallApp },
    it: { common: itCommon, auth: itAuth, app: itApp, home: itHome, trabajo: itTrabajo, summary: itSummary, config: itConfig, profile: itProfile, help: itHelp, notices: itNotices, rates: itRates, trainingRecords: itTrainingRecords, installApp: itInstallApp },
    de: { common: deCommon, auth: deAuth, app: deApp, home: deHome, trabajo: deTrabajo, summary: deSummary, config: deConfig, profile: deProfile, help: deHelp, notices: deNotices, rates: deRates, trainingRecords: deTrainingRecords, installApp: deInstallApp },
    ca: { common: caCommon, auth: caAuth, app: caApp, home: caHome, trabajo: caTrabajo, summary: caSummary, config: caConfig, profile: caProfile, help: caHelp, notices: caNotices, rates: caRates, trainingRecords: caTrainingRecords, installApp: caInstallApp },
    eu: { common: euCommon, auth: euAuth, app: euApp, home: euHome, trabajo: euTrabajo, summary: euSummary, config: euConfig, profile: euProfile, help: euHelp, notices: euNotices, rates: euRates, trainingRecords: euTrainingRecords, installApp: euInstallApp },
  },
  lng: getStoredLanguage(),
  fallbackLng: "es",
  ns: ["common", "auth", "app", "home", "trabajo", "summary", "config", "profile", "help", "notices", "rates", "trainingRecords", "installApp"],
  defaultNS: "common",
  interpolation: { escapeValue: false }, // React ya escapa — evita doble escape de acentos/símbolos
  returnNull: false,
});

export default i18n;
