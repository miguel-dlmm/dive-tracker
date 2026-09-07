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
// traducción), iconos y agrupación.
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
// GIFs animados (2026-09-08, reintroducidos — pedido explícito:
// "recupera el rehacer la ayuda con gifs animados... corrige lo que
// necesites para poder generar los gifs"). Revierte la decisión "sin
// capturas" del rediseño 2026-09-04 de este mismo archivo (histórico
// más abajo) — aquella decisión se tomó cuando la cuenta demo mostraba
// "dev-bypass" y datos de prueba desordenados; ya no es el caso (ver
// docs/REDISENO-V2-PROGRESS.md, 9.14). El bloqueo real que aparcó el
// primer intento (GIF con "fantasma"/doble exposición, capturado a
// media transición CSS de una Sheet) se corrigió de raíz con
// `?captureGif=1` (ver `usePrefersReducedMotion`, `src/motion.js`):
// fuerza duración ~0 en las animaciones solo para grabar, así que cada
// fotograma cae siempre sobre un estado ya asentado. Campo `gif`
// opcional por artículo (nombre de fichero en `public/help/`, no
// traducible — es la misma animación en cualquier idioma) — solo los 3
// "Quiero..." con el flujo más básico lo llevan hoy (crear un
// movimiento, cobrarlo, configurar la app por primera vez), no todos
// los artículos: un GIF por cada uno de los 9 artículos sería mucho
// mantenimiento para contenido de referencia que cambia poco visita a
// visita, mientras que estos 3 son el primer contacto real de un
// usuario nuevo con la app.
//
// Histórico — por qué se habían retirado (rediseño 2026-09-04, "Ayuda
// fácil de entender"): la versión de entonces llevaba un campo
// `stepImages` con capturas reales generadas con
// scripts/capture-help-screenshots.mjs (recortando la cabecera para no
// mostrar la cuenta de desarrollo). Aun así, el CUERPO de esas capturas
// seguía mostrando datos reales del dataset de prueba "ihasia" (importes,
// nombres de escuela/curso) — no presentable a un usuario real. Se
// retiró el mecanismo entero en su momento; el campo `gif` de ahora es
// una pieza nueva, no una reactivación de aquel `stepImages`.
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
// Auditoría 2026-09-04 (este rediseño): "configurar-app" seguía
// mencionando de pasada el bloque "Administración" (tipos/estados de
// pago, monedas, colores, usuarios) solo para decir que existe si el
// usuario es admin — sigue siendo documentar admin, así sea de refilón.
// Reescrito en help.json para hablar solo de Escuelas/Cursos/Tarifas
// (BUSINESS_SECTIONS en ConfigTab.jsx), lo único que ve cualquier
// usuario estándar. src/help/content.test.js escanea ahora todo el
// texto de Ayuda (ambos idiomas) en busca de vocabulario de admin, para
// que esto no pueda volver a colarse sin que un test lo detecte.
export const HELP_CATEGORIES = [
  {
    id: "bienvenida",
    icon: "Sparkles",
    articles: [{ id: "primeros-pasos" }],
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
    articles: [{ id: "configurar-app", gif: "configurar-app.gif" }],
  },
  {
    id: "quiero-crear-movimiento",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "GraduationCap",
    articles: [{ id: "crear-movimiento", gif: "crear-movimiento.gif" }],
  },
  {
    id: "quiero-cobrar",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "Wallet",
    articles: [{ id: "cobrar-movimientos", gif: "cobrar-movimientos.gif" }],
  },
  {
    id: "quiero-consultar-generado",
    group: "quiero",
    sectionKey: "summary",
    icon: "TrendingUp",
    articles: [{ id: "consultar-generado" }],
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
