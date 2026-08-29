import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Waves, Home as HomeIcon, Briefcase, BarChart3, X, Settings, HelpCircle, LogOut } from "lucide-react";
import { useSupabaseTable } from "./useSupabaseTable";
import { useSession } from "./useSession";
import { ToastProvider, AppLoading, useScrolled } from "./shared";
import { DURATION, EASE, usePrefersReducedMotion } from "./motion";
import { NAVY, TEAL, AQUA, CORAL, GREEN, SUN, BG } from "./colors";
import LoginScreen from "./LoginScreen";
import CreatePasswordScreen from "./CreatePasswordScreen";
import AcceptLegalScreen from "./AcceptLegalScreen";
import HomeTab from "./HomeTab";
import WorkLogTab from "./WorkLogTab";
import ComisionesTab from "./ComisionesTab";
import ConfigTab from "./ConfigTab";
import CompanerosTab from "./CompanerosTab";
import MiTrabajoTab from "./MiTrabajoTab";
import MovementSheet from "./MovementSheet";
import WhatsNew from "./WhatsNew";
import { APP_VERSION } from "./version";
import SummaryTab from "./SummaryTab";
import HelpTab from "./HelpTab";
import PaymentsTab from "./PaymentsTab";

// ---------------------------------------------------------------
// Paleta — profesional y contenida: un único acento neutro, fondo
// casi blanco, tinta oscura para texto. Los colores de cada sección
// (Registro, Comisiones, Compañeros, Pagos, Tarifas, Configuración,
// Home) NO están aquí — vienen de la tabla nav_sections.
//
// Los valores en sí viven en colors.js (sin dependencias propias, para
// evitar un ciclo de imports con shared.jsx — ver ese archivo, importado
// arriba junto al resto). Se re-exportan aquí para que el resto de la app
// siga importando "./App" como siempre, sin tocar ningún import existente.
// ---------------------------------------------------------------
export { NAVY, TEAL, AQUA, CORAL, GREEN, SUN, BG };

export const DISPLAY_FONT = "'Inter', sans-serif";
export const BODY_FONT = "'Inter', sans-serif";

// Barra inferior: los destinos que se usan a diario. "Mi trabajo" sustituye
// visualmente a Registro/Comisiones/Compañeros — ver
// docs/ADR/0005-mi-trabajo-unificacion-economica.md (Fase 1). Esas 3
// pantallas siguen existiendo en el código (rutas "log"/"comisiones"/
// "colegas" más abajo) por si hiciera falta revertir, aunque ya no tienen
// ningún punto de entrada en la UI.
const PRIMARY_TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "trabajo", label: "Mi trabajo", icon: Briefcase },
  { id: "summary", label: "Resumen", icon: BarChart3 },
];

// Configuración/Ayuda son accesos secundarios (desde la cabecera). Al
// entrar en uno, la barra inferior no resalta nada — en su lugar, la
// cabecera muestra "‹ Volver" + el nombre de la pantalla, el patrón
// nativo de iOS/Android para "dónde estoy y cómo vuelvo", más propio de
// app que una miga de pan (que es un patrón más de web de escritorio).
// "pagos" sigue en este mapa por si se reactiva, pero ya no tiene ningún
// punto de entrada en la UI — ver docs/ADR/0005 (Mi trabajo cubre su
// función con "Cobrar todos" + filtro por escuela).
const SECONDARY_TITLES = { config: "Configuración", help: "Ayuda", pagos: "Pagos" };

// Recuerda la pestaña activa y a cuál "volver" desde una pantalla
// secundaria — corrige de raíz dos problemas reales, no dos parches
// sueltos: (1) recargar la página siempre volvía a Home aunque estuvieras
// en Mi trabajo o Resumen; (2) "‹ Volver" desde Ayuda/Configuración
// llevaba siempre a Home en vez de a la pestaña desde la que se entró.
// sessionStorage, no localStorage: debe sobrevivir a una recarga dentro
// de la misma pestaña del navegador, pero abrir la app en una sesión
// nueva (nueva pestaña, navegador reabierto) debe partir de Home, el
// punto de entrada natural — no tiene sentido "recordar" eso
// indefinidamente. Se limpia al cerrar sesión (ver el botón de logout más
// abajo) para que un usuario distinto en el mismo navegador no herede la
// posición del anterior — relevante sobre todo probando con el bypass de
// desarrollo y varias cuentas de prueba.
const NAV_STORAGE_KEY = "oceanpulse:navState";
function readStoredNav() {
  try {
    const raw = sessionStorage.getItem(NAV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function clearStoredNav() {
  try { sessionStorage.removeItem(NAV_STORAGE_KEY); } catch { /* no-op */ }
}

// "Qué hay de nuevo" — se muestra una vez por versión y por cuenta (no por
// dispositivo/navegador): localStorage, no sessionStorage, para que
// sobreviva a cerrar la pestaña, igual que la moneda favorita (ver
// docs/ADR/0007-preferencias-personales-en-localstorage.md). Guarda la
// versión vista, no un booleano — así una futura versión nueva vuelve a
// mostrarlo automáticamente sin tener que "resetear" nada.
const whatsNewSeenKey = (userId) => `oceanpulse:whatsNewSeen:${userId || "anon"}`;
function hasSeenWhatsNew(userId) {
  try { return localStorage.getItem(whatsNewSeenKey(userId)) === APP_VERSION; } catch { return true; }
}
function markWhatsNewSeen(userId) {
  try { localStorage.setItem(whatsNewSeenKey(userId), APP_VERSION); } catch { /* no-op */ }
}

function AppShell({ onSignOut, profile, initialTab = "home" }) {
  const schools = useSupabaseTable("schools", "name");
  const activities = useSupabaseTable("activities", "name");
  const paymentTypes = useSupabaseTable("payment_types", "name");
  const paymentStatuses = useSupabaseTable("payment_statuses", "name");
  const currencies = useSupabaseTable("currencies", "name", "code");
  const rates = useSupabaseTable("rates", "school");
  const commissionRates = useSupabaseTable("commission_rates", "school");
  const worklog = useSupabaseTable("worklog", "date");
  const comisiones = useSupabaseTable("comisiones", "date");
  const colleaguePayments = useSupabaseTable("colleague_payments", "date");
  const navSections = useSupabaseTable("nav_sections", "key", "key");
  const appConfig = useSupabaseTable("app_config", "id", "id");

  // initialTab !== "home" es el caso "justActivated" (ver AuthGate) — una
  // activación recién completada siempre debe abrir en Ayuda, prioridad
  // sobre cualquier posición guardada de una sesión anterior.
  const [tab, setTab] = useState(() => (initialTab !== "home" ? initialTab : (readStoredNav()?.tab || initialTab)));
  // Único punto de cambio de pestaña disparado por un toque del usuario
  // (todo el resto de este archivo llama a changeTab, nunca a setTab
  // directamente, salvo el propio useState de arriba). Corrige un bug real
  // reportado en iPhone: navegar desde un elemento profundo dentro de una
  // pestaña larga y ya desplazada (p. ej. "Generado este mes", al fondo de
  // Home) hacía desaparecer la barra de navegación inferior al entrar en
  // la pestaña siguiente — no reproducible en Chromium (herramientas de
  // este entorno, ver CLAUDE.md "8. Verificación UX/UI"), pero confirmado
  // aquí que SOLO ese camino requiere scroll profundo antes de tocar
  // (1260px en la comprobación) frente al resto de accesos de navegación
  // (cabecera y barra inferior son fixed y siempre están a la vista sin
  // desplazar, "Pendiente de cobrar" es la primera tarjeta) — encaja con
  // el bug ya documentado de WebKit en el que un elemento fixed puede
  // quedar mal posicionado si el elemento con el toque/foco activo
  // desaparece del DOM mientras la página estaba desplazada. blur()
  // suelta el foco/toque ANTES de que React desmonte ese elemento, en vez
  // de dejar que WebKit lo gestione a mitad del propio desmontaje.
  const changeTab = (next) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTab(next);
  };
  // Pestaña primaria a la que vuelve "‹ Volver" desde Ayuda/Configuración
  // — se actualiza sola (ver el efecto más abajo) cada vez que `tab` pasa
  // a ser una pestaña primaria, así que no hace falta tocar cada sitio
  // que navega para mantenerla al día.
  const [returnTab, setReturnTab] = useState(() => readStoredNav()?.returnTab || "home");
  useEffect(() => {
    if (PRIMARY_TABS.some((t) => t.id === tab)) setReturnTab(tab);
  }, [tab]);
  useEffect(() => {
    try { sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({ tab, returnTab })); } catch { /* no-op */ }
  }, [tab, returnTab]);
  // Sin esto, cambiar de pestaña conserva el scroll de la pantalla
  // anterior — si venías de una lista larga, entrabas a la siguiente
  // pestaña a mitad de página en vez de arriba del todo (detectado al
  // revisar el rediseño de Ayuda: la cabecera "Quiero..." y "Primeros
  // pasos" quedaban fuera de vista tras haber hecho scroll en Resumen).
  // No es un problema de un rediseño concreto — es la navegación entre
  // pestañas en general, por eso vive aquí y no en una pantalla suelta.
  // requestAnimationFrame, no una llamada síncrona: le da a WebKit un
  // fotograma para terminar de asentar el layout tras un desmontaje/montaje
  // grande de contenido antes de saltar el scroll a 0 — mismo bug de la
  // nota de changeTab de arriba, la otra mitad de la misma mitigación.
  useEffect(() => {
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, [tab]);
  // El acceso rápido de Home (botón "Añadir movimiento" o tocar un día del
  // calendario) abre MovementSheet sin cambiar de pestaña — Home sigue
  // visible mientras se rellena el formulario. Solo al guardar con éxito
  // (ver onSaved más abajo) se navega a Mi trabajo; cancelar/cerrar deja
  // al usuario donde estaba. Ver docs/ADR/0005, addendum — antes esto
  // cambiaba de pestaña ANTES de guardar (pendingOpen/autoOpenType, ya
  // retirado): con eso, cancelar la creación dejaba al usuario en Mi
  // trabajo aunque no hubiera guardado nada.
  const [homeSheetRequest, setHomeSheetRequest] = useState(null);
  const startHomeCreate = (type, date) => setHomeSheetRequest({ type, editingEntry: null, date });

  // "Qué hay de nuevo" — se decide en el primer render tras conocer al
  // usuario (profile.user_id), no en un efecto con dependencia vacía: con
  // el bypass de desarrollo, AppShell puede remontarse con un profile
  // distinto sin recargar la página completa.
  const [whatsNewOpen, setWhatsNewOpen] = useState(() => !hasSeenWhatsNew(profile?.user_id));
  const closeWhatsNew = () => {
    markWhatsNewSeen(profile?.user_id);
    setWhatsNewOpen(false);
  };

  const loaded = schools.loaded && activities.loaded && paymentTypes.loaded && paymentStatuses.loaded
    && currencies.loaded && rates.loaded && commissionRates.loaded && worklog.loaded
    && comisiones.loaded && colleaguePayments.loaded && navSections.loaded && appConfig.loaded;

  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  const bottomTabActive = PRIMARY_TABS.some((t) => t.id === tab) ? tab : null;
  const isSecondary = tab in SECONDARY_TITLES;
  const logoIcon = appConfig.rows[0]?.logo_icon || "Waves";
  // La cabecera acompaña siempre al usuario (ver rediseño de navegación
  // global) — antes se quedaba en flujo normal y desaparecía al hacer
  // scroll en cualquier lista larga, dejando Ayuda/Configuración/Cerrar
  // sesión (y "‹ Volver" en pantallas secundarias) inalcanzables sin
  // volver arriba. scrolled añade una sombra sutil una vez el contenido
  // pasa por debajo, para que se lea como "flotando" y no como un bloque
  // más de la página.
  const scrolled = useScrolled();
  const reducedMotion = usePrefersReducedMotion();

  if (!loaded) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <AppLoading iconName={logoIcon} color={TEAL} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      {/* bg-white opaco, sin backdrop-blur: lo tenía antes (bg-white/95 +
          backdrop-blur-md), pero un usuario reportó la cabecera tapada por
          el contenido en Ayuda en su iPhone real, algo que no se pudo
          reproducir en Chromium (mobile-check) probando cada escenario
          razonable — indicio de un problema específico del compositor de
          WebKit, no de la lógica de la app. backdrop-filter + un elemento
          hermano con transform (la transición de pestañas, más abajo) es
          una combinación con bugs de compositing documentados en Safari.
          Quitar el blur elimina esa clase de riesgo por completo; se
          pierde el efecto "cristal esmerilado", que además apenas se
          notaba con solo un 5% de transparencia. */}
      <header
        className="sticky top-0 z-30 border-b border-black/5 bg-white transition-shadow duration-200"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          transform: "translateZ(0)",
          boxShadow: scrolled ? "0 1px 3px rgba(15, 23, 42, 0.06)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2.5 px-5 py-4">
          {isSecondary ? (
            // X, no flecha "‹": Ayuda/Configuración no son un nivel más
            // dentro de la jerarquía de la pestaña actual — se entra
            // igual desde Home, Mi trabajo o Resumen, así que son más
            // "una capa encima" (modal) que "un paso más adentro". Ayuda
            // además ya usa su propia flecha "‹" para SU jerarquía interna
            // (Categorías → Artículos → Artículo, ver HelpArticleList/
            // HelpArticleView) — una segunda flecha aquí, con un
            // significado distinto (salir de Ayuda entera, no retroceder
            // un nivel dentro de ella), sería ambigua en el punto más
            // profundo. X + "Cerrar" es además el mismo patrón que ya usan
            // las hojas inferiores de la app.
            <button onClick={() => changeTab(returnTab)} className="-m-2 flex min-h-11 items-center gap-2 p-2" aria-label="Cerrar">
              <X size={20} style={{ color: NAVY }} aria-hidden="true" />
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: sectionColor(tab) }}>{SECONDARY_TITLES[tab]}</h1>
            </button>
          ) : (
            <button onClick={() => changeTab("home")} className="-m-2 flex min-h-11 items-center gap-2.5 p-2" aria-label="Ir a Home">
              <Waves size={20} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
              <div className="leading-tight text-left">
                <h1 className="text-[15px] font-bold tracking-tight" style={{ color: NAVY }}>Ocean Pulse</h1>
                <p className="text-[10.5px] font-medium text-gray-400">by Ocean Flow</p>
              </div>
            </button>
          )}
          <div className="flex items-center gap-1">
            {tab !== "help" && (
              <button onClick={() => changeTab("help")} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2" aria-label="Ayuda">
                <HelpCircle size={20} style={{ color: NAVY }} aria-hidden="true" />
              </button>
            )}
            {tab !== "config" && (
              <button onClick={() => changeTab("config")} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2" aria-label="Configuración">
                <Settings size={20} style={{ color: NAVY }} aria-hidden="true" />
              </button>
            )}
            {profile?.nickname && (
              <span className="max-w-[104px] truncate text-[12px] font-medium text-gray-500" title={profile.nickname}>
                {profile.nickname}
              </span>
            )}
            <button onClick={() => { clearStoredNav(); if (DEV_AUTH_BYPASS) disableDevBypass(); onSignOut(); }} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2" aria-label="Cerrar sesión">
              <LogOut size={20} style={{ color: NAVY }} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-5">
      <AnimatePresence mode="wait">
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: reducedMotion ? 0.01 : DURATION.sm, ease: EASE.enter } }}
        exit={{ opacity: 0, y: -4, transition: { duration: reducedMotion ? 0.01 : DURATION.xs, ease: EASE.exit } }}
      >
        {tab === "home" && (
          <HomeTab
            worklog={worklog} rates={rates} comisiones={comisiones} commissionRates={commissionRates} colleaguePayments={colleaguePayments}
            activities={activities} currencies={currencies} paymentStatuses={paymentStatuses}
            onQuickCreate={startHomeCreate}
            onOpenPending={() => changeTab("trabajo")}
            onOpenSummary={() => changeTab("summary")}
          />
        )}
        {tab === "log" && (
          <WorkLogTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} appConfig={appConfig}
            accentColor={sectionColor("log")}
          />
        )}
        {tab === "comisiones" && (
          <ComisionesTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} currencies={currencies} commissionRates={commissionRates} comisiones={comisiones} appConfig={appConfig}
            accentColor={sectionColor("comisiones")}
          />
        )}
        {tab === "colegas" && (
          <CompanerosTab
            schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} colleaguePayments={colleaguePayments}
            accentColor={sectionColor("colegas")}
          />
        )}
        {tab === "trabajo" && (
          <MiTrabajoTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} currencies={currencies}
            rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones} colleaguePayments={colleaguePayments}
            accentColor={sectionColor("trabajo")} userId={profile?.user_id}
          />
        )}
        {tab === "config" && (
          <ConfigTab
            schools={schools} activities={activities} currencies={currencies} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses}
            rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones}
            navSections={navSections} appConfig={appConfig} profile={profile}
          />
        )}
        {tab === "help" && <HelpTab navSections={navSections} profile={profile} />}
        {tab === "pagos" && (
          <PaymentsTab
            activities={activities} schools={schools} paymentStatuses={paymentStatuses} currencies={currencies}
            rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones} colleaguePayments={colleaguePayments}
          />
        )}
        {tab === "summary" && <SummaryTab worklog={worklog} rates={rates} comisiones={comisiones} commissionRates={commissionRates} activities={activities} schools={schools} currencies={currencies} colleaguePayments={colleaguePayments} />}
      </motion.div>
      </AnimatePresence>
      </main>

      {/* Barra inferior — 5 destinos de uso diario.
          translateZ(0) fuerza una capa de composición propia en iOS Safari:
          evita el parpadeo/"desaparece un instante" que puede darse en
          elementos fixed cuando la barra de direcciones se oculta al hacer
          scroll. */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", transform: "translateZ(0)" }}
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-1">
          {PRIMARY_TABS.map((t) => {
            const Icon = t.icon;
            const active = bottomTabActive === t.id;
            const c = sectionColor(t.id);
            return (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                aria-current={active ? "page" : undefined}
                className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 transition-colors"
                style={{ color: active ? c : "#9CA3AF" }}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span className="text-[10.5px] font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Montada aquí, fuera del contenido de la pestaña activa (no dentro
          de <main>), para que el acceso rápido de Home pueda abrir esta
          misma hoja sin cambiar de pestaña primero — ver startHomeCreate
          más arriba y docs/ADR/0005 (addendum). Cuando tab === "trabajo",
          MiTrabajoTab ya monta su propia instancia para el FAB/editar fila
          (con su propio sheetRequest, independiente); esta de aquí solo
          se activa cuando homeSheetRequest no es null, así que nunca hay
          dos hojas abiertas a la vez. */}
      <MovementSheet
        request={homeSheetRequest}
        onClose={() => setHomeSheetRequest(null)}
        onSaved={() => { setHomeSheetRequest(null); changeTab("trabajo"); }}
        schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses}
        currencies={currencies} rates={rates} commissionRates={commissionRates}
        worklog={worklog} comisiones={comisiones} colleaguePayments={colleaguePayments}
        accentColor={sectionColor("trabajo")} userId={profile?.user_id}
      />

      {whatsNewOpen && <WhatsNew onClose={closeWhatsNew} />}
    </div>
  );
}

// Puerta de sesión: si useSession detecta que la cuenta está desactivada
// (accountBanned, comprobado antes que cualquier otra cosa — ver más abajo),
// login con el aviso correspondiente, sin excepción. Si no, sin sesión
// activa, pantalla de login (o, si la URL trae enlace de activación,
// pantalla de crear contraseña — ver más abajo); con sesión pero
// activated_at aún sin fijar, pantalla de crear contraseña vía
// activateAccount() (ver useSession.js) — que ya incluye aceptar los
// documentos legales, ver CreatePasswordScreen; con activated_at fijado pero
// consentimiento legal pendiente (republicación de una versión nueva de un
// documento para un usuario ya existente), pantalla de aceptación legal; con
// todo listo, la app normal. Vive fuera de AppShell para no depender de que
// carguen las tablas de negocio solo para decidir cuál de las pantallas
// tocar.
//
// MVP: mientras haya sesión y activated_at siga sin fijar, se trata siempre
// como una activación reanudable (Caso B), sin comprobar si esa sesión
// corresponde de verdad al enlace de la URL — el enlace de activación hoy
// solo lleva token_hash+type, sin el email de destino, así que esa
// comprobación (Caso C, "sesión ajena") no es implementable todavía. Queda
// pendiente para cuando la fase de generación de enlaces incorpore el email;
// no se ha añadido ninguna lógica parcial a propósito, para no dejar un
// comportamiento provisional que haya que deshacer luego.
// Bypass de login SOLO en desarrollo — ver CLAUDE.md "Bypass de login en
// desarrollo". import.meta.env.MODE es una constante que Vite resuelve en
// build time: en `vite build` (producción, mode "production") es distinta
// de "development" de forma estática y esta rama se elimina del bundle por
// completo, no es un simple `if` que pueda quedar activo por error en
// producción. Se compara con "development" en vez de usar el flag DEV
// porque DEV también es true bajo vitest (mode "test") — con DEV, los
// tests que cargan .env.local (donde vive VITE_DEV_AUTH_BYPASS) activarían
// el auto-login real y romperían el flujo de login que esos tests
// verifican. Además exige el opt-in explícito VITE_DEV_AUTH_BYPASS=true —
// no está activo por defecto ni siquiera en desarrollo. No crea ninguna
// ruta de autenticación nueva: se limita a llamar automáticamente al
// signIn() real que ya existe, con la cuenta demo configurada en
// .env.local — misma sesión de Supabase, mismo RLS, que si se tecleara el
// login a mano.
const DEV_AUTH_BYPASS = import.meta.env.MODE === "development" && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

// bypassAttempted (más abajo, useState de AuthGate) por sí solo NO basta
// para que "cerrar sesión" se quede cerrada: Supabase persiste la sesión en
// localStorage, así que cualquier recarga de página remonta AuthGate desde
// cero — bypassAttempted vuelve a nacer en false, la sesión restaurada por
// Supabase hace que el efecto ni se entere, y un logout MUCHO después de
// esa recarga vuelve a cumplir "no hay sesión ni intento previo" y
// dispara un auto-login nuevo, secuestrando la sesión otra vez. Bug real
// encontrado probando exactamente el flujo que este mecanismo debía
// permitir (logout -> login manual con otra cuenta) tras recargar por el
// camino. localStorage, no sessionStorage ni un useState: tiene que
// sobrevivir a la recarga que expone el problema, y no hay motivo para
// que un "cerrca sesión" explícito deje de respetarse si además se cierra
// la pestaña — el desarrollador que quiera el bypass de vuelta siempre
// puede iniciar sesión a mano una vez con la cuenta demo.
const DEV_BYPASS_DISABLED_KEY = "oceanpulse:devBypassDisabled";
function isDevBypassDisabled() {
  try { return localStorage.getItem(DEV_BYPASS_DISABLED_KEY) === "true"; } catch { return false; }
}
function disableDevBypass() {
  try { localStorage.setItem(DEV_BYPASS_DISABLED_KEY, "true"); } catch { /* no-op */ }
}

function AuthGate() {
  const { session, profile, loading, accountBanned, signIn, signOut, activateAccount, pendingLegalConsents, acceptLegalConsents } = useSession();
  const [bypassAttempted, setBypassAttempted] = useState(false);
  // Mientras esté en true, se muestra el mismo loading que "loading" en vez
  // de dejar parpadear LoginScreen durante el auto-signIn. Si falla o
  // faltan las variables, se pone a false y cae al login normal — nunca se
  // queda bloqueado.
  const [bypassPending, setBypassPending] = useState(DEV_AUTH_BYPASS);

  useEffect(() => {
    if (!DEV_AUTH_BYPASS || loading || session || bypassAttempted) return;
    setBypassAttempted(true);
    // isDevBypassDisabled() se comprueba aquí dentro, no en la guarda de
    // arriba: la guarda también controla si se llega a poner bypassPending
    // a false (ver más abajo) — si "desactivado" hubiera cortado ahí,
    // bypassPending se habría quedado en true para siempre en cualquier
    // montaje donde la sesión ya viniera restaurada de localStorage (tras
    // una recarga), y el gate de carga (bypassPending && !session) se
    // habría quedado colgado en cuanto la sesión pasara a null — bug real
    // encontrado al probar el fix anterior, no solo en teoría.
    if (isDevBypassDisabled()) {
      setBypassPending(false);
      return;
    }
    const email = import.meta.env.VITE_DEV_DEMO_EMAIL;
    const password = import.meta.env.VITE_DEV_DEMO_PASSWORD;
    if (!email || !password) {
      console.error("[dev-auth-bypass] Faltan VITE_DEV_DEMO_EMAIL/VITE_DEV_DEMO_PASSWORD en .env.local — se muestra el login normal.");
      setBypassPending(false);
      return;
    }
    // .finally(), no solo .catch(): antes bypassPending solo se ponía a
    // false en el camino de error — tras un login automático CON ÉXITO se
    // quedaba en true para siempre, así que un logout posterior volvía a
    // cumplir bypassPending && !session y se quedaba en el loading para
    // siempre (bypassAttempted ya en true impide que este efecto se repita
    // y lo corrija). El bypass debe automatizar solo el primer acceso, no
    // secuestrar la sesión — tras el intento (éxito o no), el gate de
    // carga deja de depender de esta bandera y el logout cae de forma
    // normal en LoginScreen, como con cualquier otra cuenta.
    signIn(email, password)
      .catch((err) => {
        console.error("[dev-auth-bypass] No se pudo iniciar sesión automáticamente:", err.message);
      })
      .finally(() => setBypassPending(false));
  }, [loading, session, bypassAttempted, signIn]);
  // Justo tras completar la activación, AppShell debe abrir directamente en
  // Ayuda en vez de Home — se limpia solo (no persiste entre sesiones), ver
  // App.jsx → AppShell → initialTab.
  const [justActivated, setJustActivated] = useState(false);
  // activateAccount encadena completePasswordChange + markAccountActivated +
  // acceptLegalConsents — sin este flag, AuthGate re-renderizaría en el
  // hueco entre pasos (p. ej. activated_at ya fijado pero consentimientos
  // aún sin insertar) y saltaría un instante a AcceptLegalScreen en mitad de
  // una activación normal. Se mantiene en true durante toda la operación
  // compuesta para que CreatePasswordScreen siga siendo quien decide qué
  // mostrar mientras dura.
  const [activating, setActivating] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const hasActivationLink = Boolean(tokenHash && type);

  const handleActivate = async (password) => {
    setActivating(true);
    try {
      await activateAccount({ tokenHash, type, expectedEmail: session?.user?.email, password });
      setJustActivated(true);
    } finally {
      setActivating(false);
    }
  };

  if (loading || (DEV_AUTH_BYPASS && bypassPending && !session)) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <AppLoading color={TEAL} />
      </div>
    );
  }

  // accountBanned se comprueba ANTES que la sesión o el enlace de la URL a
  // propósito: debe prevalecer sobre cualquier otra cosa que esté pasando
  // (una sesión persistida que useSession ya cerró, o un enlace de
  // activación todavía en la URL) — nunca debe dejar entrar a crear
  // contraseña, activar una cuenta ni ningún flujo de recuperación mientras
  // la cuenta esté realmente desactivada. Ver ACCOUNT_DEACTIVATED_MESSAGE y
  // resolveSessionState en useSession.js.
  if (accountBanned) {
    return <LoginScreen signIn={signIn} accountBanned />;
  }

  if (!session && !activating) {
    if (!hasActivationLink) return <LoginScreen signIn={signIn} />;
    return <CreatePasswordScreen onSubmit={handleActivate} />;
  }

  if (activating || !profile || !profile.activated_at) {
    return <CreatePasswordScreen onSubmit={handleActivate} />;
  }

  if (pendingLegalConsents.length > 0) {
    return <AcceptLegalScreen onSubmit={acceptLegalConsents} />;
  }

  return <AppShell onSignOut={signOut} profile={profile} initialTab={justActivated ? "help" : "home"} />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthGate />
    </ToastProvider>
  );
}
