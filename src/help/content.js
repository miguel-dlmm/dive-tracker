// Estructura del Manual de Ayuda — solo metadatos, sin texto traducible.
//
// Rediseño 2026-08-29 (ver docs/ADR/0011-rediseno-ayuda.md): la app
// cambió demasiado desde la última versión de este contenido (Registro/
// Comisiones/Compañeros/Pagos como pantallas separadas, "Ganado este
// mes", pestañas en Configuración) para conservarlo — se reescribe entero
// para reflejar Mi trabajo, Resumen y Configuración actuales.
//
// i18n (Release V1, Fase 2 — multidioma, 2026-09-01): todo el texto
// (label/description de categoría; title/summary/whatYouCanDo/
// whenToUseIt/steps/tips/expectedResult de artículo) se movió a
// src/i18n/locales/{es,en}/help.json, bajo "categories.<id>" y
// "articles.<id>" — HelpTab.jsx los resuelve con t() en render. Este
// archivo se queda solo con lo que NO es texto: ids (también claves de
// traducción), iconos, agrupación, y — en `stepImages` — el `src` de la
// captura de cada paso con imagen (el `alt` si es traducible vive en el
// JSON, como `steps[i].imageAlt`).
//
// Cada categoría lleva un `group` opcional:
//   - undefined → categoría suelta, sin cabecera de grupo (solo
//     "Primeros pasos", va siempre primero).
//   - "quiero"  → historias de uso, orientadas a una acción concreta del
//     usuario ("Quiero registrar un movimiento").
//   - "funcionalidades" → referencia por pantalla, para cuando ya sabes
//     qué quieres hacer y necesitas recordar dónde o cómo.
//
// sectionKey (opcional): key de la tabla nav_sections cuyo color hereda
// la categoría, para que la Ayuda use los mismos colores que el resto de
// la app en vez de una paleta propia (ver CLAUDE.md, convención 2).
//
// stepImages (opcional, por artículo): { <índice del paso>: "<src>" } —
// solo para los pasos que llevan captura. Las capturas evaluadas en la
// reescritura de 2026-08-29 se descartaron por mostrar la cuenta de
// desarrollo y datos repetidos; el 2026-08-30 se generaron de nuevo con
// scripts/capture-help-screenshots.mjs, que recorta la cabecera para no
// mostrar la cuenta — un paso por artículo lleva ahora su captura real.
//
// Regla permanente (Release V1, Fase 1 — ver CLAUDE.md, "Reglas
// permanentes — Release V1"): la Ayuda nunca documenta funcionalidades
// de admin ni de superadmin, ni siquiera detrás de un filtro de rol —
// solo lo que aplica a cualquier usuario estándar. Antes existía un
// mecanismo `adminOnly`/`superadminOnly` que ocultaba contenido según el
// rol de quien lo veía (retirado 2026-09-01 junto con la categoría
// "Datasets iniciales" y las menciones a Administración/Usuarios que
// tenía "Configuración, de un vistazo") — ocultar no es lo mismo que no
// documentar, así que ese mecanismo dejó de tener sentido aquí.
export const HELP_CATEGORIES = [
  {
    id: "bienvenida",
    icon: "Sparkles",
    articles: [
      { id: "primeros-pasos", stepImages: { 0: "/help/home-vistazo.png" } },
    ],
  },

  // ---------------- Quiero... (historias de uso) ----------------
  // Orden 2026-08-29: sigue el flujo real de un usuario nuevo (configurar
  // → crear → cobrar → consultar), no el orden alfabético ni el orden en
  // que se rediseñaron las pantallas — ver docs/ADR/0011, addendum.
  {
    id: "quiero-configurar",
    group: "quiero",
    sectionKey: "config",
    icon: "Settings",
    articles: [
      { id: "configurar-app", stepImages: { 0: "/help/configuracion-menu.png" } },
    ],
  },
  {
    id: "quiero-crear-movimiento",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "GraduationCap",
    articles: [
      { id: "crear-movimiento", stepImages: { 1: "/help/crear-movimiento-tipo.png" } },
    ],
  },
  {
    id: "quiero-cobrar",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "Wallet",
    articles: [
      { id: "cobrar-movimientos", stepImages: { 0: "/help/mi-trabajo-pendientes.png" } },
    ],
  },
  {
    id: "quiero-consultar-generado",
    group: "quiero",
    sectionKey: "summary",
    icon: "TrendingUp",
    articles: [
      { id: "consultar-generado", stepImages: { 1: "/help/resumen-tendencia.png" } },
    ],
  },

  // ---------------- Funcionalidades (referencia por pantalla) ----------------
  {
    id: "func-mi-trabajo",
    group: "funcionalidades",
    sectionKey: "trabajo",
    icon: "Briefcase",
    articles: [{ id: "mi-trabajo-referencia" }],
  },
  {
    id: "func-resumen",
    group: "funcionalidades",
    sectionKey: "summary",
    icon: "BarChart3",
    articles: [{ id: "resumen-referencia" }],
  },
  {
    id: "func-configuracion",
    group: "funcionalidades",
    sectionKey: "config",
    icon: "Settings",
    articles: [{ id: "configuracion-referencia" }],
  },
  {
    id: "func-perfil",
    group: "funcionalidades",
    icon: "CircleUserRound",
    articles: [{ id: "perfil-referencia" }],
  },
  {
    id: "func-filtros",
    group: "funcionalidades",
    icon: "SlidersHorizontal",
    articles: [{ id: "filtros-referencia" }],
  },
];
