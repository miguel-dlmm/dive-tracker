import React, { useState } from "react";
import { motion } from "motion/react";
import { TEAL } from "./App";
import { HELP_CATEGORIES } from "./help/content";
import HelpCategoryList from "./help/HelpCategoryList";
import HelpArticleList from "./help/HelpArticleList";
import HelpArticleView from "./help/HelpArticleView";
import { useSwipeBack } from "./motion";

// navSections: { rows } — la Ayuda hereda el color de cada sección en vez
// de tener su propia paleta (ver CLAUDE.md, convención 2)
// profile: fila de profiles (useSession) — is_admin/is_superadmin filtran
// categorías/artículos adminOnly (p.ej. "Gestionar usuarios")
export default function HelpTab({ navSections, profile }) {
  const [categoryId, setCategoryId] = useState(null);
  const [articleId, setArticleId] = useState(null);

  const isAdmin = !!(profile?.is_admin || profile?.is_superadmin);
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;

  const categories = HELP_CATEGORIES
    .filter((c) => !c.adminOnly || isAdmin)
    .map((c) => ({ ...c, articles: c.articles.filter((a) => !a.adminOnly || isAdmin) }))
    .filter((c) => c.articles.length > 0);

  const category = categories.find((c) => c.id === categoryId) || null;
  const article = category?.articles.find((a) => a.id === articleId) || null;
  const view = article ? "article" : category ? "articles" : "categories";

  const openCategory = (id) => { setCategoryId(id); setArticleId(null); };
  const backToCategories = () => { setCategoryId(null); setArticleId(null); };

  // Deslizar hacia la derecha = atrás (feedback explícito 2026-08-30) — un
  // nivel menos de la propia jerarquía de Ayuda (artículo -> lista de
  // artículos -> categorías), igual gesto que Configuración (useSwipeBack,
  // motion.js). En "categories" no hay adonde volver: enabled=false, sin
  // efecto.
  const onBack = view === "article" ? () => setArticleId(null) : view === "articles" ? backToCategories : null;
  const backProps = useSwipeBack(onBack, { enabled: onBack != null });

  return (
    <motion.div key={view} className="animate-help-fade-in" {...backProps}>
      {view === "categories" && (
        <HelpCategoryList categories={categories} sectionColor={sectionColor} onSelect={openCategory} />
      )}
      {view === "articles" && category && (
        <HelpArticleList
          category={category}
          accentColor={sectionColor(category.sectionKey)}
          onSelectArticle={setArticleId}
          onBack={backToCategories}
        />
      )}
      {view === "article" && category && article && (
        <HelpArticleView
          article={article}
          categoryLabel={category.label}
          accentColor={sectionColor(category.sectionKey)}
          onBack={() => setArticleId(null)}
        />
      )}
    </motion.div>
  );
}
