import React from "react";
import * as Icons from "lucide-react";
import { ChevronRight } from "lucide-react";
import { NAVY } from "../App";
import { lighten } from "../shared";

// categories: HELP_CATEGORIES ya filtradas por rol (ver HelpTab)
// sectionColor(key): color heredado de nav_sections, o TEAL si la
// categoría no mapea a ninguna sección (p.ej. "Primeros pasos")
// onSelect(categoryId)
export default function HelpCategoryList({ categories, sectionColor, onSelect }) {
  if (categories.length === 0) {
    return <p className="px-3 py-10 text-center text-sm text-gray-400">Todavía no hay contenido de ayuda.</p>;
  }
  return (
    <div className="space-y-2">
      {categories.map((c) => {
        const Icon = Icons[c.icon] || Icons.HelpCircle;
        const color = sectionColor(c.sectionKey);
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-transform active:scale-[0.98]"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: lighten(color), color }}
            >
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: NAVY }}>{c.label}</span>
              <span className="block truncate text-xs text-gray-400">{c.description}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
