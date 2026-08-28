import React from "react";
import * as Icons from "lucide-react";
import { ChevronRight } from "lucide-react";
import { NAVY } from "../App";
import { lighten } from "../shared";

// Etiquetas de grupo — ver content.js para el porqué de "quiero" vs
// "funcionalidades". Categorías sin `group` (solo "Primeros pasos") van
// sueltas, sin cabecera, siempre primero.
const GROUP_LABELS = { quiero: "Quiero...", funcionalidades: "Funcionalidades" };
const GROUP_ORDER = [undefined, "quiero", "funcionalidades"];

function CategoryRow({ category, sectionColor, onSelect }) {
  const Icon = Icons[category.icon] || Icons.HelpCircle;
  const color = sectionColor(category.sectionKey);
  return (
    <button
      onClick={() => onSelect(category.id)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-transform active:scale-[0.98]"
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: lighten(color), color }}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: NAVY }}>{category.label}</span>
        <span className="block truncate text-xs text-gray-400">{category.description}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden="true" />
    </button>
  );
}

// categories: HELP_CATEGORIES ya filtradas por rol (ver HelpTab)
// sectionColor(key): color heredado de nav_sections, o TEAL si la
// categoría no mapea a ninguna sección (p.ej. "Primeros pasos", "Filtros")
// onSelect(categoryId)
export default function HelpCategoryList({ categories, sectionColor, onSelect }) {
  if (categories.length === 0) {
    return <p className="px-3 py-10 text-center text-sm text-gray-400">Todavía no hay contenido de ayuda.</p>;
  }
  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((group) => {
        const rows = categories.filter((c) => c.group === group);
        if (rows.length === 0) return null;
        return (
          <div key={group || "sin-grupo"}>
            {GROUP_LABELS[group] && (
              <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {GROUP_LABELS[group]}
              </h2>
            )}
            <div className="space-y-2">
              {rows.map((c) => (
                <CategoryRow key={c.id} category={c} sectionColor={sectionColor} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
