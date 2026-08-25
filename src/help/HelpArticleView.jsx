import React from "react";
import { ArrowLeft, Lightbulb, CheckCircle2 } from "lucide-react";
import { NAVY, TEAL } from "../App";
import HelpStep from "./HelpStep";

const sectionLabelCls = "mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400";

// article: { title, summary, whatYouCanDo, whenToUseIt, steps, tips, expectedResult }
// categoryLabel: para el enlace de "volver"
// accentColor: color heredado de la sección (nav_sections)
export default function HelpArticleView({ article, categoryLabel, accentColor, onBack }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="-ml-2 flex min-h-11 items-center gap-1.5 p-2 text-sm font-medium text-gray-500"
        aria-label={`Volver a ${categoryLabel}`}
      >
        <ArrowLeft size={16} aria-hidden="true" /> {categoryLabel}
      </button>

      <div>
        <h2 className="text-lg font-bold" style={{ color: NAVY }}>{article.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{article.summary}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className={sectionLabelCls}>Qué puedes hacer</h3>
        <p className="text-sm text-gray-700">{article.whatYouCanDo}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className={sectionLabelCls}>Cuándo usarlo</h3>
        <p className="text-sm text-gray-700">{article.whenToUseIt}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pasos</h3>
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
            <Lightbulb size={14} aria-hidden="true" /> Consejos y errores habituales
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Resultado esperado</h3>
          <p className="mt-0.5 text-sm text-gray-700">{article.expectedResult}</p>
        </div>
      </div>
    </div>
  );
}
