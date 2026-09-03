import { useTranslation } from "react-i18next";
import { Lightbulb, CheckCircle2, Sparkles, Clock } from "lucide-react";
import { TEAL } from "../App";
import HelpStep from "./HelpStep";

const labelCls = "text-xs font-semibold uppercase tracking-wide text-gray-400";

// Contenido de un artículo, sin cabecera ni "volver" — vive dentro de la
// propia ExpandableCard de su categoría (ver HelpTab.jsx), que ya pone el
// título y permite cerrarla. Antes era HelpArticleView.jsx, una PANTALLA
// aparte con su propio título+resumen+botón de volver; al pasar Ayuda de
// navegación por pantallas a tarjetas plegables en el sitio (2026-08-30,
// "de índice a guía viva"), ese título/volver quedaban duplicados con los
// que ya pone la tarjeta — se retira aquí, se queda solo el contenido.
//
// Rediseño 2026-09-04 ("Ayuda fácil de entender" — pedido explícito del
// usuario: "veo mucho texto... facilidad de entendimiento, imágenes,
// paso a paso, huir de textos largos"). Dos cambios reales sobre la
// versión anterior, sin tocar el contrato de datos de `article`:
//   1. "Qué puedes hacer" y "Cuándo usarlo" pasan de dos tarjetas blancas
//      apiladas (con el mismo borde, el mismo fondo, la misma etiqueta
//      gris) a una única tarjeta con dos filas icono+texto separadas por
//      un divisor fino. Misma información, un bloque visual menos que
//      digerir de un vistazo — el "muro" de cajas idénticas era justo lo
//      que hacía sentir la pantalla más larga de lo que su contenido es.
//   2. `accentColor` (el color de sección heredado, ver content.js) ya no
//      se usa solo en el icono de cabecera y en "Resultado esperado" —
//      también tiñe el numerito de cada paso (HelpStep) y el icono de
//      "Qué puedes hacer", para que cada categoría se lea como un bloque
//      de color coherente de arriba a abajo, no como texto neutro con un
//      acento suelto al principio y al final.
// article: { summary, whatYouCanDo, whenToUseIt, steps, tips, expectedResult }
// accentColor: color heredado de la sección (nav_sections)
export default function HelpArticleBody({ article, accentColor }) {
  const { t } = useTranslation("help");
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{article.summary}</p>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex gap-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
          <div>
            <h3 className={labelCls}>{t("sections.whatYouCanDo")}</h3>
            <p className="mt-0.5 text-sm text-gray-700">{article.whatYouCanDo}</p>
          </div>
        </div>
        <div className="flex gap-2.5 border-t border-gray-100 pt-3">
          <Clock size={16} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          <div>
            <h3 className={labelCls}>{t("sections.whenToUseIt")}</h3>
            <p className="mt-0.5 text-sm text-gray-700">{article.whenToUseIt}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("sections.steps")}</h3>
        <ol className="space-y-3">
          {article.steps.map((step, i) => (
            <HelpStep key={i} index={i + 1} text={step} accentColor={accentColor} />
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
