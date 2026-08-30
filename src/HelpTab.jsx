import React from "react";
import * as Icons from "lucide-react";
import { TEAL } from "./App";
import { ExpandableCard } from "./shared";
import { HELP_CATEGORIES } from "./help/content";
import HelpArticleBody from "./help/HelpArticleBody";

// Rediseño 2026-08-30 (ver docs/ADR/0011-rediseno-ayuda.md, addendum "de
// índice a guía viva" — feedback explícito: "un primer nivel y, cuando
// entro, un segundo nivel con un solo item... el antipatrón de lo que
// queremos en Ocean Flow"). Causa raíz confirmada en content.js: CADA
// categoría tiene exactamente un artículo — la pantalla intermedia
// "lista de artículos de esta categoría" (antes HelpArticleList.jsx)
// nunca mostraba más de una fila, pura navegación de más entre la
// categoría y su contenido real.
//
// En vez de "arreglar" esa pantalla de en medio, se retira el modelo de
// navegación por pantallas entero: Ayuda pasa a ser una única página que
// se recorre haciendo scroll, con cada categoría como una ExpandableCard
// (mismo componente que ya usa Resumen para "Por escuela"/"Por curso"/
// Comisiones/Calendario — misma interacción en toda la app, no una
// tercera forma de plegar/desplegar). Tocar una categoría despliega su
// artículo EN EL SITIO; no hay "volver" porque no hay a dónde volver — es
// exactamente el "guía viva, no índice pobre" que se pidió, y de paso dos
// pantallas (HelpCategoryList.jsx, HelpArticleList.jsx) y su estado de
// navegación (categoryId/articleId, gesto de swipe-back) dejan de hacer
// falta: no hay profundidad que atravesar.
//
// Asume una única entrada en `category.articles` (cierto hoy en las 8
// categorías) — si algún día una categoría necesita más de un artículo,
// esa es una decisión de contenido/estructura nueva que tomar entonces,
// no algo que esta pantalla deba prever de antemano sin necesidad real.
//
// navSections: { rows } — la Ayuda hereda el color de cada sección en vez
// de tener su propia paleta (ver CLAUDE.md, convención 2)
// profile: fila de profiles (useSession) — is_admin/is_superadmin filtran
// categorías/artículos adminOnly (p.ej. "Gestionar usuarios")
const GROUP_LABELS = { quiero: "Quiero...", funcionalidades: "Funcionalidades" };
const GROUP_ORDER = [undefined, "quiero", "funcionalidades"];

export default function HelpTab({ navSections, profile }) {
  const isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;

  const categories = HELP_CATEGORIES
    .filter((c) => !c.adminOnly || isAdmin)
    .map((c) => ({ ...c, articles: c.articles.filter((a) => !a.adminOnly || isAdmin) }))
    .filter((c) => c.articles.length > 0);

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
              {rows.map((category) => {
                const Icon = Icons[category.icon] || Icons.HelpCircle;
                const color = sectionColor(category.sectionKey);
                const article = category.articles[0];
                return (
                  <ExpandableCard key={category.id} title={category.label} subtitle={category.description} icon={Icon} iconColor={color}>
                    <HelpArticleBody article={article} accentColor={color} />
                  </ExpandableCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
