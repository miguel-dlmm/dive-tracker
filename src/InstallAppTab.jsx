import { useTranslation } from "react-i18next";
import { Share, SquarePlus, MoreVertical, Download, Smartphone } from "lucide-react";
import { BRAND_NAVY, BRAND_OCEAN } from "./App";

// Pantalla secundaria (2026-09-07, pedido explícito: "un enlace para
// añadir la app a tu escritorio como acceso directo, en iOS y en
// android... una página que se abre sobre toda la pantalla como la
// ayuda y que se puede cerrar") — mismo patrón que Training Records:
// pestaña más en SECONDARY_TABS (App.jsx), sin cabecera propia (la
// global ya pone "✕ + título" y cerrar siempre vuelve a Home). Solo
// instrucciones — no hay ningún prompt nativo de instalación que
// disparar desde aquí: iOS Safari no expone ninguna API para eso
// (`beforeinstallprompt` es solo Chromium/Android), así que el único
// camino real, en cualquier plataforma, es explicar el gesto manual.
function Step({ number, icon: Icon, children, accent }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>
        {number}
      </span>
      <span className="flex min-w-0 flex-1 items-start gap-2 pt-0.5 text-sm text-gray-700">
        {Icon && <Icon size={16} className="mt-0.5 shrink-0" style={{ color: accent }} aria-hidden="true" />}
        <span>{children}</span>
      </span>
    </li>
  );
}

function PlatformSection({ title, accent, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold" style={{ color: accent }}>{title}</h3>
      <ol className="space-y-3">{children}</ol>
    </section>
  );
}

export default function InstallAppTab() {
  const { t } = useTranslation("installApp");
  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: `${BRAND_NAVY}40`, background: `linear-gradient(135deg, ${BRAND_NAVY}17 0%, ${BRAND_NAVY}05 100%)` }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_NAVY }}>
          <Smartphone size={20} className="text-white" aria-hidden="true" />
        </span>
        <p className="pt-1 text-sm text-gray-700">{t("intro")}</p>
      </div>

      <PlatformSection title={t("ios.title")} accent={BRAND_NAVY}>
        <Step number={1} accent={BRAND_NAVY}>{t("ios.step1")}</Step>
        <Step number={2} icon={Share} accent={BRAND_NAVY}>{t("ios.step2")}</Step>
        <Step number={3} icon={SquarePlus} accent={BRAND_NAVY}>{t("ios.step3")}</Step>
        <Step number={4} accent={BRAND_NAVY}>{t("ios.step4")}</Step>
      </PlatformSection>

      <PlatformSection title={t("android.title")} accent={BRAND_OCEAN}>
        <Step number={1} accent={BRAND_OCEAN}>{t("android.step1")}</Step>
        <Step number={2} icon={MoreVertical} accent={BRAND_OCEAN}>{t("android.step2")}</Step>
        <Step number={3} icon={Download} accent={BRAND_OCEAN}>{t("android.step3")}</Step>
        <Step number={4} accent={BRAND_OCEAN}>{t("android.step4")}</Step>
      </PlatformSection>

      <p className="text-xs text-gray-400">{t("note")}</p>
    </div>
  );
}
