import React, { useState, useEffect } from "react";
import { Waves, Home as HomeIcon, Briefcase, BarChart3, ArrowLeft, Settings, HelpCircle, LogOut } from "lucide-react";
import { useSupabaseTable } from "./useSupabaseTable";
import { useSession } from "./useSession";
import { ToastProvider, AppLoading } from "./shared";
import LoginScreen from "./LoginScreen";
import CreatePasswordScreen from "./CreatePasswordScreen";
import AcceptLegalScreen from "./AcceptLegalScreen";
import HomeTab from "./HomeTab";
import WorkLogTab from "./WorkLogTab";
import ComisionesTab from "./ComisionesTab";
import ConfigTab from "./ConfigTab";
import CompanerosTab from "./CompanerosTab";
import MiTrabajoTab from "./MiTrabajoTab";
import SummaryTab from "./SummaryTab";
import HelpTab from "./HelpTab";
import PaymentsTab from "./PaymentsTab";

// ---------------------------------------------------------------
// Paleta — profesional y contenida: un único acento neutro, fondo
// casi blanco, tinta oscura para texto. Los colores de cada sección
// (Registro, Comisiones, Compañeros, Pagos, Tarifas, Configuración,
// Home) NO están aquí — vienen de la tabla nav_sections.
// ---------------------------------------------------------------
export const NAVY = "#0F172A";
export const TEAL = "#0F766E";
export const AQUA = "#0D9488";
export const CORAL = "#C2542F";
export const GREEN = "#15803D";
export const SUN = "#B45309";
export const BG = "#F7F8F8";

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

  const [tab, setTab] = useState(initialTab);
  // Al venir de un acceso rápido de Home, además de cambiar de pestaña,
  // esa pestaña abre su hoja de creación sola. Se limpia en cuanto se usa
  // (ver onAutoOpened), así no se vuelve a disparar si luego navegas
  // manualmente a la misma pestaña.
  const [pendingOpen, setPendingOpen] = useState(null);
  // Home sigue ofreciendo accesos rápidos con los ids antiguos ("log",
  // "comisiones") — se redirigen a "trabajo", que decide qué formulario
  // abrir según ese mismo id (ver autoOpenType en MiTrabajoTab).
  const OLD_TAB_REDIRECT = { log: "trabajo", comisiones: "trabajo", colegas: "trabajo" };
  const navigateAndCreate = (tabId) => { setTab(OLD_TAB_REDIRECT[tabId] || tabId); setPendingOpen(tabId); };

  const loaded = schools.loaded && activities.loaded && paymentTypes.loaded && paymentStatuses.loaded
    && currencies.loaded && rates.loaded && commissionRates.loaded && worklog.loaded
    && comisiones.loaded && colleaguePayments.loaded && navSections.loaded && appConfig.loaded;

  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  const bottomTabActive = PRIMARY_TABS.some((t) => t.id === tab) ? tab : null;
  const isSecondary = tab in SECONDARY_TITLES;
  const logoIcon = appConfig.rows[0]?.logo_icon || "Waves";

  if (!loaded) {
    return (
      <div className="flex h-dvh items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <AppLoading iconName={logoIcon} color={TEAL} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2.5 px-5 py-4">
          {isSecondary ? (
            <button onClick={() => setTab("home")} className="-m-2 flex min-h-11 items-center gap-2 p-2" aria-label="Volver a Home">
              <ArrowLeft size={20} style={{ color: NAVY }} aria-hidden="true" />
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: sectionColor(tab) }}>{SECONDARY_TITLES[tab]}</h1>
            </button>
          ) : (
            <button onClick={() => setTab("home")} className="-m-2 flex min-h-11 items-center gap-2.5 p-2" aria-label="Ir a Home">
              <Waves size={20} style={{ color: TEAL }} strokeWidth={2.2} aria-hidden="true" />
              <div className="leading-tight text-left">
                <h1 className="text-[15px] font-bold tracking-tight" style={{ color: NAVY }}>Ocean Pulse</h1>
                <p className="text-[10.5px] font-medium text-gray-400">by Ocean Flow</p>
              </div>
            </button>
          )}
          <div className="flex items-center gap-1">
            {tab !== "help" && (
              <button onClick={() => setTab("help")} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2" aria-label="Ayuda">
                <HelpCircle size={20} style={{ color: NAVY }} aria-hidden="true" />
              </button>
            )}
            {tab !== "config" && (
              <button onClick={() => setTab("config")} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2" aria-label="Configuración">
                <Settings size={20} style={{ color: NAVY }} aria-hidden="true" />
              </button>
            )}
            {profile?.nickname && (
              <span className="max-w-[104px] truncate text-[12px] font-medium text-gray-500" title={profile.nickname}>
                {profile.nickname}
              </span>
            )}
            <button onClick={onSignOut} className="-m-2 flex min-h-11 min-w-11 items-center justify-center p-2" aria-label="Cerrar sesión">
              <LogOut size={20} style={{ color: NAVY }} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-5">
        {tab === "home" && (
          <HomeTab
            worklog={worklog} rates={rates} comisiones={comisiones} commissionRates={commissionRates} colleaguePayments={colleaguePayments}
            activities={activities} schools={schools} currencies={currencies} navSections={navSections} paymentStatuses={paymentStatuses}
            onQuickCreate={navigateAndCreate}
          />
        )}
        {tab === "log" && (
          <WorkLogTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} worklog={worklog} appConfig={appConfig}
            accentColor={sectionColor("log")}
            autoOpenSheet={pendingOpen === "log"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "comisiones" && (
          <ComisionesTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} currencies={currencies} commissionRates={commissionRates} comisiones={comisiones} appConfig={appConfig}
            accentColor={sectionColor("comisiones")}
            autoOpenSheet={pendingOpen === "comisiones"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "colegas" && (
          <CompanerosTab
            schools={schools} activities={activities} paymentStatuses={paymentStatuses} currencies={currencies} rates={rates} colleaguePayments={colleaguePayments}
            accentColor={sectionColor("colegas")}
            autoOpenSheet={pendingOpen === "colegas"} onAutoOpened={() => setPendingOpen(null)}
          />
        )}
        {tab === "trabajo" && (
          <MiTrabajoTab
            schools={schools} activities={activities} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses} currencies={currencies}
            rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones} colleaguePayments={colleaguePayments}
            accentColor={sectionColor("trabajo")} userId={profile?.user_id}
            autoOpenType={pendingOpen} onAutoOpened={() => setPendingOpen(null)}
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
                onClick={() => setTab(t.id)}
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
    </div>
  );
}

// Puerta de sesión: sin sesión activa, pantalla de login (o, si la URL trae
// enlace de activación, pantalla de crear contraseña — ver más abajo); con
// sesión pero activated_at aún sin fijar, pantalla de crear contraseña vía
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

function AuthGate() {
  const { session, profile, loading, signIn, signOut, activateAccount, pendingLegalConsents, acceptLegalConsents } = useSession();
  const [bypassAttempted, setBypassAttempted] = useState(false);
  // Mientras esté en true, se muestra el mismo loading que "loading" en vez
  // de dejar parpadear LoginScreen durante el auto-signIn. Si falla o
  // faltan las variables, se pone a false y cae al login normal — nunca se
  // queda bloqueado.
  const [bypassPending, setBypassPending] = useState(DEV_AUTH_BYPASS);

  useEffect(() => {
    if (!DEV_AUTH_BYPASS || loading || session || bypassAttempted) return;
    setBypassAttempted(true);
    const email = import.meta.env.VITE_DEV_DEMO_EMAIL;
    const password = import.meta.env.VITE_DEV_DEMO_PASSWORD;
    if (!email || !password) {
      console.error("[dev-auth-bypass] Faltan VITE_DEV_DEMO_EMAIL/VITE_DEV_DEMO_PASSWORD en .env.local — se muestra el login normal.");
      setBypassPending(false);
      return;
    }
    signIn(email, password).catch((err) => {
      console.error("[dev-auth-bypass] No se pudo iniciar sesión automáticamente:", err.message);
      setBypassPending(false);
    });
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
