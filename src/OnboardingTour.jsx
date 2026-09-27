import { useTranslation } from "react-i18next";
import { Home as HomeIcon, Briefcase, BarChart3, GraduationCap, HelpCircle, Rocket } from "lucide-react";
import { GREEN, TEAL, SUN, CORAL, BRAND_NAVY, BRAND_OCEAN } from "./App";
import SlideDeck from "./SlideDeck";

// Bienvenida real (2026-09-27, pedido explícito del usuario) — tour de 6
// diapositivas que ve cualquier cuenta nueva (alta normal o por enlace de
// invitación) la primera vez que entra a la app, una sola vez en la vida
// de la cuenta. A diferencia de WhatsNew (que se repite en cada versión y
// por eso le vale con un dato por dispositivo en localStorage), esto debe
// verse como máximo una vez sea cual sea el dispositivo por el que la
// cuenta entre después — de ahí que la puerta viva en
// `profile.onboarding_tour_seen_at` (columna real en Supabase, ver
// scripts/migrations/0022-onboarding-tour-visto.sql), no en localStorage.
//
// Se muestra como overlay sobre AppShell ya montada (Home visible detrás,
// cargando) — mismo patrón que WhatsNew, pedido explícito 2026-09-27 ("que
// salga como el whats new, con la portada cargándose debajo"). Ver
// onboardingOpen/closeOnboardingTour en AppShell, App.jsx.
//
// Para que una cuenta nueva no reciba dos avisos de golpe (este tour +
// "Qué hay de nuevo" justo después), al cerrar este tour AppShell también
// marca como vista la versión actual de WhatsNew para esa cuenta — ver
// closeOnboardingTour en App.jsx.
//
// icon/color no son traducibles, viven aquí; título/cuerpo de cada
// diapositiva viven en notices.json (onboarding.slides, mismo orden por
// índice), igual que ya hace WhatsNew.jsx.
const SLIDE_ICONS = [
  { icon: HomeIcon, color: GREEN }, // 1. Home
  { icon: Briefcase, color: BRAND_OCEAN }, // 2. Mi trabajo
  { icon: BarChart3, color: TEAL }, // 3. Resumen + informe PDF
  { icon: GraduationCap, color: SUN }, // 4. Training Records
  { icon: HelpCircle, color: CORAL }, // 5. Ayuda
  { icon: Rocket, color: BRAND_NAVY }, // 6. Empieza por aquí (escuela + tarifas)
];

export default function OnboardingTour({ onClose }) {
  const { t } = useTranslation("notices");
  const slideCopy = t("onboarding.slides", { returnObjects: true });
  const slides = SLIDE_ICONS.map((s, i) => ({ ...s, ...slideCopy[i] }));

  return (
    <SlideDeck
      slides={slides}
      onClose={onClose}
      testId="onboarding-slide"
      labels={{
        eyebrow: t("onboarding.eyebrow"),
        close: t("onboarding.close"),
        back: t("onboarding.back"),
        next: t("onboarding.next"),
        start: t("onboarding.start"),
        slideTablist: t("onboarding.slideTablist"),
      }}
    />
  );
}
