import React from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

// category: { label, description, articles } ya filtrada por rol
// accentColor: color heredado de la sección (nav_sections)
// onSelectArticle(articleId) / onBack(): vuelve a la lista de categorías
export default function HelpArticleList({ category, accentColor, onSelectArticle, onBack }) {
  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="-ml-2 flex min-h-11 items-center gap-1.5 p-2 text-sm font-medium text-gray-500"
        aria-label="Volver a categorías"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Categorías
      </button>

      <div>
        <h2 className="text-base font-bold" style={{ color: accentColor }}>{category.label}</h2>
        {category.description && <p className="mt-0.5 text-xs text-gray-400">{category.description}</p>}
      </div>

      <div className="space-y-2">
        {category.articles.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelectArticle(a.id)}
            className="flex w-full items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left transition-transform active:scale-[0.98]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-800">{a.title}</span>
              <span className="mt-0.5 block text-xs text-gray-400">{a.summary}</span>
            </span>
            <ChevronRight size={16} className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
