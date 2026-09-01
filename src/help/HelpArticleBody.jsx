import React from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import { TEAL } from "../App";
import HelpStep from "./HelpStep";

const sectionLabelCls = "mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400";

// Contenido de un artículo, sin cabecera ni "volver" — vive dentro de la
// propia ExpandableCard de su categoría (ver HelpTab.jsx), que ya pone el
// título y permite cerrarla. Antes era HelpArticleView.jsx, una PANTALLA
// aparte con su propio título+resumen+botón de volver; al pasar Ayuda de
// navegación por pantallas a tarjetas plegables en el sitio (2026-08-30,
// "de índice a guía viva"), ese título/volver quedaban duplicados con los
// que ya pone la tarjeta — se retira aquí, se queda solo el contenido.
// article: { summary, whatYouCanDo, whenToUseIt, steps, tips, expectedResult }
// accentColor: color heredado de la sección (nav_sections)
export default function HelpArticleBody({ article, accentColor }) {
  const { t } = useTranslation("help");
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{article.summary}</p>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className={sectionLabelCls}>{t("sections.whatYouCanDo")}</h3>
        <p className="text-sm text-gray-700">{article.whatYouCanDo}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className={sectionLabelCls}>{t("sections.whenToUseIt")}</h3>
        <p className="text-sm text-gray-700">{article.whenToUseIt}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("sections.steps")}</h3>
        <ol className="space-y-3">
          {article.steps.map((step, i) => (
            <HelpStep
              key={i}
              index={i + 1}
              text={typeof step === "string" ? step : step.text}
              image={typeof step === "string" ? null : step.image}
            />
          ))}
        </ol>
      </div>

      {article.tips?.length > 0 && (
        <div className="rounded-lg p-4" style={{ backgroundColor: "#F0FDFA" }}>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: TEAL }}>
            <Lightbulb size={14} aria-hidden="true" /> {t("sections.tips")}
          </h3>
          <ul className="space-y-1.5">
            {article.tips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-700">• {tip}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border p-4" style={{ borderColor: accentColor, backgroundColor: "#FAFAFA" }}>
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("sections.expectedResult")}</h3>
          <p className="mt-0.5 text-sm text-gray-700">{article.expectedResult}</p>
        </div>
      </div>
    </div>
  );
}
