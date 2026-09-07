// Paleta de marca de Ocean Flow — sin ninguna dependencia propia a
// propósito. Vivía antes dentro de App.jsx, pero shared.jsx ya importaba
// esos mismos colores desde ahí (para ToastProvider/ConfirmDialog/etc,
// siempre dentro de una función o de JSX, nunca en el cuerpo del módulo) —
// un ciclo App.jsx ⇄ shared.jsx que llevaba tiempo siendo frágil en
// silencio. Se rompió de verdad al añadir MOVEMENT_TYPE_META (un export de
// shared.jsx que sí lee el VALOR de estos colores en el cuerpo del propio
// módulo, no dentro de una función): bajo el orden real de módulos ES de
// Vite en desarrollo, shared.jsx podía terminar de cargar antes de que
// App.jsx hubiera llegado a declarar estas constantes, y saltaba
// "Cannot access 'TEAL' before initialization". Este archivo, sin
// imports propios, hace que ese ciclo deje de poder producirse nunca —
// App.jsx sigue re-exportando estos nombres para no tocar ningún import
// existente en el resto de la app (`import { TEAL, ... } from "./App"`
// sigue funcionando igual en todos los sitios).
export const NAVY = "#0F172A";
export const TEAL = "#0F766E";
export const AQUA = "#0D9488";
export const CORAL = "#C2542F";
export const GREEN = "#15803D";
export const SUN = "#B45309";
export const BG = "#F7F8F8";

// Paleta de marca del rediseño (docs/DESIGN-SYSTEM.md §3.1). Tokens nuevos,
// añadidos sin tocar los de arriba: la migración de cada pantalla a esta
// paleta es progresiva (Fase 2 del rediseño, ver
// docs/REDISENO-V2-PROGRESS.md), pantalla a pantalla, no un cambio de golpe
// en todos los usos existentes de NAVY/TEAL/etc.
//
// BRAND_NAVY/BRAND_SKY corregidos 2026-09-07 (Fase 7, 7.5) a los valores
// exactos del vectorial real del logo (`#063256`/`#8AACCE`) — hasta
// entonces venían de un muestreo de píxel sobre un JPG exportado del
// logo (`#00335A`/`#81ADD0`), la única fuente disponible en ese momento;
// ahora que existe el SVG original, sus valores son la fuente más
// precisa y sustituyen a la estimación por muestreo. Diferencia mínima
// (pocas unidades por canal, contraste WCAG re-verificado sin cambios
// de resultado — ver docs/DESIGN-SYSTEM.md §3.3), pero real: se corrige
// en vez de mantener una aproximación ahora que hay un valor exacto.
export const BRAND_NAVY = "#063256";
export const BRAND_SKY = "#8AACCE";
export const BRAND_INK = "#191919";

// Más tonos azules de marca (2026-09-07, pedido explícito) — completan la
// rampa entre BRAND_NAVY (el más oscuro) y BRAND_SKY (el más claro) para
// material de campaña/redes que necesite un azul intermedio o un fondo
// muy suave, sin tener que recurrir a un azul genérico fuera de la
// paleta. Mismo rigor que el resto de §3 de docs/DESIGN-SYSTEM.md:
// contraste verificado, no solo elegido a ojo — BRAND_OCEAN da 5.95:1
// sobre blanco (AA para texto normal).
export const BRAND_OCEAN = "#146A96";
export const BRAND_FOAM = "#EAF2F8";

// Colores de marca por tipo de movimiento (Curso/Comisión/Ajuste),
// 2026-09-07 — pedido explícito: "define colores de marca para cursos,
// comisiones y ajustes por si hacemos campañas particulares". Curso ya
// tenía uno (TEAL, arriba) desde antes; Comisión usaba SUN (un color
// SEMÁNTICO DE ESTADO — "pendiente/atención", ver §3.4 de
// docs/DESIGN-SYSTEM.md), lo que en realidad rompía la propia "regla de
// separación marca/estado" que ese documento define — un tipo de
// movimiento no es un estado. BRAND_GOLD/BRAND_SLATE son colores nuevos,
// dedicados, que no comparten vocabulario con ningún semántico de estado
// (CORAL/SUN/GREEN) ni con los de identidad de la app (BRAND_NAVY/
// BRAND_SKY/BRAND_OCEAN). Contraste verificado sobre blanco: BRAND_GOLD
// 5.47:1 (igual que TEAL, misma "categoría de peso" visual entre los
// tres tipos), BRAND_SLATE 5.00:1 — ambos AA para texto normal.
// BRAND_SLATE_FILL: variante más oscura de BRAND_SLATE (8.51:1), para
// puntos/rellenos sólidos que necesitan más contraste que un icono
// pequeño — mismo patrón de "un tono más oscuro de la misma familia
// para relleno" que ya usaba AJUSTE_FILL en SummaryTab.jsx.
export const BRAND_GOLD = "#8C6118";
export const BRAND_SLATE = "#5B7286";
export const BRAND_SLATE_FILL = "#3A4F60";

// Paleta curada compartida por dos selectores de color distintos —
// entidad de negocio (escuela/curso, ColorSwatchPicker en shared.jsx) y
// avatar de perfil (avatarCatalog.js) — 2026-09-07. Vive aquí, no en
// shared.jsx, por el mismo motivo que el resto de este archivo:
// shared.jsx importa de avatarCatalog.js (AVATAR_ICON_MAP) y
// avatarCatalog.js necesita esta misma paleta ("que los colores del
// avatar integren con la paleta de la app", pedido explícito) — ponerla
// en shared.jsx recrearía el ciclo de imports que este archivo existe
// para evitar. Evita deliberadamente los 3 colores semánticos de estado
// (CORAL/SUN/GREEN, "esto es un estado"), los de identidad de marca
// (BRAND_NAVY/BRAND_SKY/BRAND_OCEAN, "esto es la propia app") y los de
// tipo de movimiento en MOVEMENT_TYPE_META — TEAL/BRAND_GOLD/BRAND_SLATE
// ("esto es Curso/Comisión/Ajuste") — ninguno de estos vocabularios de
// color ya existentes se pisa. Incluye negro y blanco a petición expresa
// del usuario.
export const ENTITY_COLOR_PALETTE = [
  "#000000", "#FFFFFF", "#475569", "#DC2626", "#EA580C", "#D97706",
  "#16A34A", "#0891B2", "#0284C7", "#4F46E5", "#9333EA", "#DB2777",
];
