import React, { useState } from "react";
import * as Icons from "lucide-react";
import { TEAL } from "./App";
import { ExpandableCard } from "./shared";
import { useSwipeBack } from "./motion";
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
// Sin prop `profile`: la Ayuda no documenta nada de admin/superadmin (regla
// permanente, Release V1 Fase 1 — ver CLAUDE.md), así que no necesita saber
// el rol de quien la abre. Antes sí lo recibía, para un filtro
// adminOnly/superadminOnly retirado 2026-09-01 junto con el contenido que
// filtraba.
// onClose: cierra Ayuda entera (mismo handler que la "X" de la cabecera,
// ver App.jsx) — lo dispara el gesto de "atrás" cuando no hay ninguna
// categoría desplegada (ver backProps más abajo).
const GROUP_LABELS = { quiero: "Quiero...", funcionalidades: "Funcionalidades" };
const GROUP_ORDER = [undefined, "quiero", "funcionalidades"];

// Categoría desplegada, persistida (feedback explícito 2026-08-30: "recargar
// → mantener la pantalla actual; cerrar con X y reabrir → volver al
// inicio"), mismo patrón y misma vida (sessionStorage) que
// oceanpulse:configSection en ConfigTab.jsx. Pasa a ser un acordeón — como
// mucho una categoría abierta a la vez — en vez de plegables
// independientes: con varias abiertas a la vez no habría una única
// "pantalla actual" que persistir ni un "atrás" con significado claro.
const HELP_OPEN_KEY = "oceanpulse:helpOpen";
function readStoredOpen() {
  try { return sessionStorage.getItem(HELP_OPEN_KEY) || null; } catch { return null; }
}
export function clearStoredHelpOpen() {
  try { sessionStorage.removeItem(HELP_OPEN_KEY); } catch { /* no-op */ }
}

export default function HelpTab({ navSections, onClose }) {
  const sectionColor = (key) => navSections.rows.find((s) => s.key === key)?.color || TEAL;
  const [openId, setOpenIdState] = useState(readStoredOpen);
  const setOpenId = (id) => {
    setOpenIdState(id);
    try {
      if (id) sessionStorage.setItem(HELP_OPEN_KEY, id);
      else sessionStorage.removeItem(HELP_OPEN_KEY);
    } catch { /* no-op */ }
  };
  // Deslizar hacia la derecha = "atrás", recursivo (feedback explícito
  // 2026-08-30, mismo criterio que ConfigTab): con una categoría abierta,
  // la colapsa (un nivel atrás); sin ninguna abierta, cierra Ayuda entera
  // — nunca una excepción ni una interacción aislada, el mismo gesto en
  // cualquier nivel de profundidad.
  const backProps = useSwipeBack(openId ? () => setOpenId(null) : onClose);

  const categories = HELP_CATEGORIES.filter((c) => c.articles.length > 0);

  if (categories.length === 0) {
    return <p className="px-3 py-10 text-center text-sm text-gray-400">Todavía no hay contenido de ayuda.</p>;
  }

  return (
    <div className="space-y-5" {...backProps}>
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
                  <ExpandableCard
                    key={category.id}
                    title={category.label}
                    subtitle={category.description}
                    icon={Icon}
                    iconColor={color}
                    open={openId === category.id}
                    onToggle={(next) => setOpenId(next ? category.id : null)}
                  >
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
