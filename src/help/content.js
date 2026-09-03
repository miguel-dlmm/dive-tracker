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
// Sin capturas de pantalla (rediseño 2026-09-04, "Ayuda fácil de
// entender"): la versión anterior de este archivo llevaba un campo
// `stepImages` con capturas reales generadas con
// scripts/capture-help-screenshots.mjs (recortando la cabecera para no
// mostrar la cuenta de desarrollo). Aun así, el CUERPO de esas capturas
// seguía mostrando datos reales del dataset de prueba "ihasia" (importes,
// nombres de escuela/curso) — no presentable a un usuario real, mismo
// motivo por el que WhatsNew.jsx nunca ha usado capturas (ver comentario
// en ese archivo). Se retira el mecanismo entero: ni el campo, ni el
// script (que generaba justamente ese problema), ni los PNG de
// public/help/. La claridad "paso a paso, muy visual" que se pedía se
// consigue con los pasos numerados de HelpStep.jsx (sección "Pasos" de
// cada artículo) en vez de con imágenes — cero riesgo de filtrar datos
// de prueba, cero mantenimiento de capturas que quedan desactualizadas
// en cuanto cambia una pantalla.
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
    articles: [{ id: "configurar-app" }],
  },
  {
    id: "quiero-crear-movimiento",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "GraduationCap",
    articles: [{ id: "crear-movimiento" }],
  },
  {
    id: "quiero-cobrar",
    group: "quiero",
    sectionKey: "trabajo",
    icon: "Wallet",
    articles: [{ id: "cobrar-movimientos" }],
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
