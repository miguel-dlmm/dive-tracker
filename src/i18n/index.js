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
import esDiveGuide from "./locales/es/diveGuide.json";

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
import enDiveGuide from "./locales/en/diveGuide.json";

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
import frDiveGuide from "./locales/fr/diveGuide.json";

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
import itDiveGuide from "./locales/it/diveGuide.json";

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
import deDiveGuide from "./locales/de/diveGuide.json";

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
import caDiveGuide from "./locales/ca/diveGuide.json";

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
import euDiveGuide from "./locales/eu/diveGuide.json";

import nlCommon from "./locales/nl/common.json";
import nlAuth from "./locales/nl/auth.json";
import nlApp from "./locales/nl/app.json";
import nlHome from "./locales/nl/home.json";
import nlTrabajo from "./locales/nl/trabajo.json";
import nlSummary from "./locales/nl/summary.json";
import nlConfig from "./locales/nl/config.json";
import nlProfile from "./locales/nl/profile.json";
import nlHelp from "./locales/nl/help.json";
import nlNotices from "./locales/nl/notices.json";
import nlRates from "./locales/nl/rates.json";
import nlTrainingRecords from "./locales/nl/trainingRecords.json";
import nlInstallApp from "./locales/nl/installApp.json";
import nlDiveGuide from "./locales/nl/diveGuide.json";

import thCommon from "./locales/th/common.json";
import thAuth from "./locales/th/auth.json";
import thApp from "./locales/th/app.json";
import thHome from "./locales/th/home.json";
import thTrabajo from "./locales/th/trabajo.json";
import thSummary from "./locales/th/summary.json";
import thConfig from "./locales/th/config.json";
import thProfile from "./locales/th/profile.json";
import thHelp from "./locales/th/help.json";
import thNotices from "./locales/th/notices.json";
import thRates from "./locales/th/rates.json";
import thTrainingRecords from "./locales/th/trainingRecords.json";
import thInstallApp from "./locales/th/installApp.json";
import thDiveGuide from "./locales/th/diveGuide.json";

import idCommon from "./locales/id/common.json";
import idAuth from "./locales/id/auth.json";
import idApp from "./locales/id/app.json";
import idHome from "./locales/id/home.json";
import idTrabajo from "./locales/id/trabajo.json";
import idSummary from "./locales/id/summary.json";
import idConfig from "./locales/id/config.json";
import idProfile from "./locales/id/profile.json";
import idHelp from "./locales/id/help.json";
import idNotices from "./locales/id/notices.json";
import idRates from "./locales/id/rates.json";
import idTrainingRecords from "./locales/id/trainingRecords.json";
import idInstallApp from "./locales/id/installApp.json";
import idDiveGuide from "./locales/id/diveGuide.json";

import viCommon from "./locales/vi/common.json";
import viAuth from "./locales/vi/auth.json";
import viApp from "./locales/vi/app.json";
import viHome from "./locales/vi/home.json";
import viTrabajo from "./locales/vi/trabajo.json";
import viSummary from "./locales/vi/summary.json";
import viConfig from "./locales/vi/config.json";
import viProfile from "./locales/vi/profile.json";
import viHelp from "./locales/vi/help.json";
import viNotices from "./locales/vi/notices.json";
import viRates from "./locales/vi/rates.json";
import viTrainingRecords from "./locales/vi/trainingRecords.json";
import viInstallApp from "./locales/vi/installApp.json";
import viDiveGuide from "./locales/vi/diveGuide.json";

import myCommon from "./locales/my/common.json";
import myAuth from "./locales/my/auth.json";
import myApp from "./locales/my/app.json";
import myHome from "./locales/my/home.json";
import myTrabajo from "./locales/my/trabajo.json";
import mySummary from "./locales/my/summary.json";
import myConfig from "./locales/my/config.json";
import myProfile from "./locales/my/profile.json";
import myHelp from "./locales/my/help.json";
import myNotices from "./locales/my/notices.json";
import myRates from "./locales/my/rates.json";
import myTrainingRecords from "./locales/my/trainingRecords.json";
import myInstallApp from "./locales/my/installApp.json";
import myDiveGuide from "./locales/my/diveGuide.json";

import msCommon from "./locales/ms/common.json";
import msAuth from "./locales/ms/auth.json";
import msApp from "./locales/ms/app.json";
import msHome from "./locales/ms/home.json";
import msTrabajo from "./locales/ms/trabajo.json";
import msSummary from "./locales/ms/summary.json";
import msConfig from "./locales/ms/config.json";
import msProfile from "./locales/ms/profile.json";
import msHelp from "./locales/ms/help.json";
import msNotices from "./locales/ms/notices.json";
import msRates from "./locales/ms/rates.json";
import msTrainingRecords from "./locales/ms/trainingRecords.json";
import msInstallApp from "./locales/ms/installApp.json";
import msDiveGuide from "./locales/ms/diveGuide.json";

import ruCommon from "./locales/ru/common.json";
import ruAuth from "./locales/ru/auth.json";
import ruApp from "./locales/ru/app.json";
import ruHome from "./locales/ru/home.json";
import ruTrabajo from "./locales/ru/trabajo.json";
import ruSummary from "./locales/ru/summary.json";
import ruConfig from "./locales/ru/config.json";
import ruProfile from "./locales/ru/profile.json";
import ruHelp from "./locales/ru/help.json";
import ruNotices from "./locales/ru/notices.json";
import ruRates from "./locales/ru/rates.json";
import ruTrainingRecords from "./locales/ru/trainingRecords.json";
import ruInstallApp from "./locales/ru/installApp.json";
import ruDiveGuide from "./locales/ru/diveGuide.json";

import ptCommon from "./locales/pt/common.json";
import ptAuth from "./locales/pt/auth.json";
import ptApp from "./locales/pt/app.json";
import ptHome from "./locales/pt/home.json";
import ptTrabajo from "./locales/pt/trabajo.json";
import ptSummary from "./locales/pt/summary.json";
import ptConfig from "./locales/pt/config.json";
import ptProfile from "./locales/pt/profile.json";
import ptHelp from "./locales/pt/help.json";
import ptNotices from "./locales/pt/notices.json";
import ptRates from "./locales/pt/rates.json";
import ptTrainingRecords from "./locales/pt/trainingRecords.json";
import ptInstallApp from "./locales/pt/installApp.json";
import ptDiveGuide from "./locales/pt/diveGuide.json";

// Idioma preferido — Release V1 Fase 2. Fuente de verdad real: la columna
// profiles.language (se sincroniza tras cargar sesión, ver useSession.js/
// App.jsx). Esta clave de localStorage es solo el valor de arranque para
// pantallas SIN sesión todavía (Login, Registro, recuperar contraseña...)
// — mismo criterio ya establecido por ADR-0007 para preferencias
// personales que no son dato de negocio. 'es' si nunca se ha elegido nada,
// tal como pide el documento maestro ("por defecto aparecerá español").
export const LANGUAGE_STORAGE_KEY = "oceanpulse:language";
export const SUPPORTED_LANGUAGES = ["es", "en", "fr", "it", "de", "ca", "eu", "nl", "th", "id", "vi", "my", "ms", "ru", "pt"];

// Nombres de idioma en SU PROPIA lengua, no traducidos con el resto de la
// pantalla — convención estándar de cualquier selector de idioma (un
// hablante de inglés debe poder reconocer "Español" aunque la interfaz
// esté en inglés, y viceversa). Vivía solo en RegisterScreen.jsx hasta
// 2026-09-29 (pedido explícito: mismo selector en Login y en las pantallas
// de entrada por enlace directo — Reset/CreatePassword/ForcedPasswordUpdate)
// — única fuente de verdad ahora que hay varios consumidores.
export const LANGUAGE_NATIVE_NAME = {
  es: "Español", en: "English", fr: "Français", it: "Italiano", de: "Deutsch", ca: "Català", eu: "Euskara",
  nl: "Nederlands", th: "ไทย", id: "Bahasa Indonesia", vi: "Tiếng Việt", my: "မြန်မာဘာသာ", ms: "Bahasa Melayu", ru: "Русский", pt: "Português (Brasil)",
};

// Parámetro de URL ?lang=xx — pedido explícito 2026-09-29: "si al generar
// los links de lo que sea ya sabemos el idioma del usuario, pasémoslo por
// parámetro... y así cuando acceda a estas páginas sueltas su idioma venga
// ya cargado". Se resuelve UNA VEZ aquí, al arrancar i18n (antes de montar
// ninguna pantalla), en vez de repetir esta lectura en cada pantalla de
// entrada por separado — cualquier pantalla que monte después ya encuentra
// `i18n.language`/localStorage correctos sin saber nada de la URL. Gana
// sobre lo guardado en localStorage (una URL explícita es una señal más
// fuerte que la última elección de este navegador), y se persiste de
// inmediato para que la elección sobreviva a navegar entre pantallas sin
// sesión (Login -> Registro, por ejemplo) aunque el parámetro ya no esté
// en la URL de la pantalla siguiente.
function getUrlLanguage() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    return SUPPORTED_LANGUAGES.includes(fromUrl) ? fromUrl : null;
  } catch {
    return null;
  }
}

export function getStoredLanguage() {
  try {
    const fromUrl = getUrlLanguage();
    if (fromUrl) {
      setStoredLanguage(fromUrl);
      return fromUrl;
    }
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
    es: { common: esCommon, auth: esAuth, app: esApp, home: esHome, trabajo: esTrabajo, summary: esSummary, config: esConfig, profile: esProfile, help: esHelp, notices: esNotices, rates: esRates, trainingRecords: esTrainingRecords, installApp: esInstallApp, diveGuide: esDiveGuide },
    en: { common: enCommon, auth: enAuth, app: enApp, home: enHome, trabajo: enTrabajo, summary: enSummary, config: enConfig, profile: enProfile, help: enHelp, notices: enNotices, rates: enRates, trainingRecords: enTrainingRecords, installApp: enInstallApp, diveGuide: enDiveGuide },
    fr: { common: frCommon, auth: frAuth, app: frApp, home: frHome, trabajo: frTrabajo, summary: frSummary, config: frConfig, profile: frProfile, help: frHelp, notices: frNotices, rates: frRates, trainingRecords: frTrainingRecords, installApp: frInstallApp, diveGuide: frDiveGuide },
    it: { common: itCommon, auth: itAuth, app: itApp, home: itHome, trabajo: itTrabajo, summary: itSummary, config: itConfig, profile: itProfile, help: itHelp, notices: itNotices, rates: itRates, trainingRecords: itTrainingRecords, installApp: itInstallApp, diveGuide: itDiveGuide },
    de: { common: deCommon, auth: deAuth, app: deApp, home: deHome, trabajo: deTrabajo, summary: deSummary, config: deConfig, profile: deProfile, help: deHelp, notices: deNotices, rates: deRates, trainingRecords: deTrainingRecords, installApp: deInstallApp, diveGuide: deDiveGuide },
    ca: { common: caCommon, auth: caAuth, app: caApp, home: caHome, trabajo: caTrabajo, summary: caSummary, config: caConfig, profile: caProfile, help: caHelp, notices: caNotices, rates: caRates, trainingRecords: caTrainingRecords, installApp: caInstallApp, diveGuide: caDiveGuide },
    eu: { common: euCommon, auth: euAuth, app: euApp, home: euHome, trabajo: euTrabajo, summary: euSummary, config: euConfig, profile: euProfile, help: euHelp, notices: euNotices, rates: euRates, trainingRecords: euTrainingRecords, installApp: euInstallApp, diveGuide: euDiveGuide },
    nl: { common: nlCommon, auth: nlAuth, app: nlApp, home: nlHome, trabajo: nlTrabajo, summary: nlSummary, config: nlConfig, profile: nlProfile, help: nlHelp, notices: nlNotices, rates: nlRates, trainingRecords: nlTrainingRecords, installApp: nlInstallApp, diveGuide: nlDiveGuide },
    th: { common: thCommon, auth: thAuth, app: thApp, home: thHome, trabajo: thTrabajo, summary: thSummary, config: thConfig, profile: thProfile, help: thHelp, notices: thNotices, rates: thRates, trainingRecords: thTrainingRecords, installApp: thInstallApp, diveGuide: thDiveGuide },
    id: { common: idCommon, auth: idAuth, app: idApp, home: idHome, trabajo: idTrabajo, summary: idSummary, config: idConfig, profile: idProfile, help: idHelp, notices: idNotices, rates: idRates, trainingRecords: idTrainingRecords, installApp: idInstallApp, diveGuide: idDiveGuide },
    vi: { common: viCommon, auth: viAuth, app: viApp, home: viHome, trabajo: viTrabajo, summary: viSummary, config: viConfig, profile: viProfile, help: viHelp, notices: viNotices, rates: viRates, trainingRecords: viTrainingRecords, installApp: viInstallApp, diveGuide: viDiveGuide },
    my: { common: myCommon, auth: myAuth, app: myApp, home: myHome, trabajo: myTrabajo, summary: mySummary, config: myConfig, profile: myProfile, help: myHelp, notices: myNotices, rates: myRates, trainingRecords: myTrainingRecords, installApp: myInstallApp, diveGuide: myDiveGuide },
    ms: { common: msCommon, auth: msAuth, app: msApp, home: msHome, trabajo: msTrabajo, summary: msSummary, config: msConfig, profile: msProfile, help: msHelp, notices: msNotices, rates: msRates, trainingRecords: msTrainingRecords, installApp: msInstallApp, diveGuide: msDiveGuide },
    ru: { common: ruCommon, auth: ruAuth, app: ruApp, home: ruHome, trabajo: ruTrabajo, summary: ruSummary, config: ruConfig, profile: ruProfile, help: ruHelp, notices: ruNotices, rates: ruRates, trainingRecords: ruTrainingRecords, installApp: ruInstallApp, diveGuide: ruDiveGuide },
    pt: { common: ptCommon, auth: ptAuth, app: ptApp, home: ptHome, trabajo: ptTrabajo, summary: ptSummary, config: ptConfig, profile: ptProfile, help: ptHelp, notices: ptNotices, rates: ptRates, trainingRecords: ptTrainingRecords, installApp: ptInstallApp, diveGuide: ptDiveGuide },
  },
  lng: getStoredLanguage(),
  fallbackLng: "es",
  ns: ["common", "auth", "app", "home", "trabajo", "summary", "config", "profile", "help", "notices", "rates", "trainingRecords", "installApp", "diveGuide"],
  defaultNS: "common",
  interpolation: { escapeValue: false }, // React ya escapa — evita doble escape de acentos/símbolos
  returnNull: false,
});

export default i18n;
