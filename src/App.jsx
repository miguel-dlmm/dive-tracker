import React, { useState } from "react";
import { Waves, Home as HomeIcon, ListChecks, BarChart3, Handshake, Users, ArrowLeft, Settings, HelpCircle, LogOut } from "lucide-react";
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
import SummaryTab from "./SummaryTab";
import HelpTab from "./HelpTab";

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

// Barra inferior: los 5 destinos que se usan a diario.
const PRIMARY_TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "log", label: "Registro", icon: ListChecks },
  { id: "comisiones", label: "Comisiones", icon: Handshake },
  { id: "colegas", label: "Compañeros", icon: Users },
  { id: "summary", label: "Resumen", icon: BarChart3 },
];

// Pagos/Tarifas/Configuración son accesos secundarios (desde Home). Al
// entrar en uno, la barra inferior no resalta nada — en su lugar, la
// cabecera muestra "‹ Volver" + el nombre de la pantalla, el patrón
// nativo de iOS/Android para "dónde estoy y cómo vuelvo", más propio de
// app que una miga de pan (que es un patrón más de web de escritorio).
const SECONDARY_TITLES = { config: "Configuración", help: "Ayuda" };

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
  const navigateAndCreate = (tabId) => { setTab(tabId); setPendingOpen(tabId); };

  const loaded = schools.loaded && activities.loaded && paymentTypes.loaded && paymentStatuses.loaded
    && currencies.loaded && rates.loaded && commissionRates.loaded && worklog.loaded
    && comisiones.loaded && colleaguePayments.loaded && navSections.loaded && appConfig.loaded;

  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  const bottomTabActive = PRIMARY_TABS.some((t) => t.id === tab) ? tab : null;
  const isSecondary = tab in SECONDARY_TITLES;
  const logoIcon = appConfig.rows[0]?.logo_icon || "Waves";

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <AppLoading iconName={logoIcon} color={TEAL} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
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
            activities={activities} schools={schools} currencies={currencies} navSections={navSections}
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
        {tab === "config" && (
          <ConfigTab
            schools={schools} activities={activities} currencies={currencies} paymentTypes={paymentTypes} paymentStatuses={paymentStatuses}
            rates={rates} commissionRates={commissionRates} worklog={worklog} comisiones={comisiones}
            navSections={navSections} appConfig={appConfig} profile={profile}
          />
        )}
        {tab === "help" && <HelpTab navSections={navSections} profile={profile} />}
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

// Puerta de sesión: sin sesión activa, pantalla de login; con sesión pero
// sin contraseña propia todavía (primer acceso vía el enlace del email de
// bienvenida, ver createUser.js), pantalla de crear contraseña — que ya
// incluye aceptar los documentos legales, ver CreatePasswordScreen; con
// contraseña fijada pero consentimiento legal pendiente (republicación de
// una versión nueva de un documento para un usuario ya existente — ver
// useSession.js), pantalla de aceptación legal; con todo listo, la app
// normal. Vive fuera de AppShell para no depender de que carguen las
// tablas de negocio solo para decidir cuál de las cuatro tocar.
function AuthGate() {
  const { session, profile, loading, signIn, signOut, completePasswordChange, pendingLegalConsents, acceptLegalConsents } = useSession();
  // Justo tras completar el primer acceso, AppShell debe abrir directamente
  // en Ayuda en vez de Home — se limpia solo (no persiste entre sesiones),
  // ver App.jsx → AppShell → initialTab.
  const [justActivated, setJustActivated] = useState(false);
  // completePasswordChange marca password_set=true ANTES de que
  // acceptLegalConsents termine — sin este flag, AuthGate re-renderizaría
  // en ese hueco con password_set ya en true y pendingLegalConsents todavía
  // sin vaciar, y saltaría un instante a AcceptLegalScreen en mitad de un
  // primer acceso normal. Se mantiene en true durante toda la operación
  // compuesta para que CreatePasswordScreen siga siendo quien decide qué
  // mostrar mientras dura.
  const [completingFirstAccess, setCompletingFirstAccess] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: BG, fontFamily: BODY_FONT }}>
        <AppLoading color={TEAL} />
      </div>
    );
  }

  if (!session) return <LoginScreen signIn={signIn} />;

  if ((profile && !profile.password_set) || completingFirstAccess) {
    return (
      <CreatePasswordScreen
        onSubmit={async (newPassword) => {
          setCompletingFirstAccess(true);
          try {
            await completePasswordChange(newPassword);
            await acceptLegalConsents();
            setJustActivated(true);
          } finally {
            setCompletingFirstAccess(false);
          }
        }}
      />
    );
  }

  if (profile && profile.password_set && pendingLegalConsents.length > 0) {
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
