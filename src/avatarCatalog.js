import { Fish, FishSymbol, Turtle, Shrimp, Snail, Shell, Anchor, Compass, LifeBuoy, Sailboat, ShipWheel, Bubbles, TreePalm, Droplets } from "lucide-react";
import { ENTITY_COLOR_PALETTE } from "./colors";

// Catálogo cerrado de avatares (Bloque 5, ampliado 2026-09-06 dentro del
// rediseño — ver docs/DESIGN-SYSTEM.md §7) — mismo criterio que el icono de
// carga de la app (GeneralSettings, ConfigTab.jsx): iconos de lucide-react
// + colores de marca, nunca una imagen subida por el usuario. Evita
// moderación de contenido y almacenamiento de ficheros para algo que, en
// una app de un único instructor por cuenta, no necesita ser una foto real.
//
// Criterio anterior (2026-09-04): "solo animales marinos reales", fijado en
// 6 porque lucide-react@1.33.0 no tiene más de 6 iconos de fauna marina de
// verdad — 4 de esos 6 eran sustituciones de compromiso sin relación visual
// real con el animal pedido (Shrimp haciendo de tiburón ballena, Snail de
// manta, Shell de pulpo, FishSymbol de tiburón), documentadas en su momento
// como "débiles" y pendientes de revisar. Criterio nuevo (2026-09-06): se
// amplía a "iconografía real de mar/buceo", no solo fauna — cada icono
// representa lo que su nombre dice, ninguno finge ser un animal que no es.
// Los 6 animales se quedan (representándose a sí mismos, no a la lista
// original de 2026-09-04) y se añaden 8 iconos de mar/buceo genuinos, 4 de
// ellos ya usados y aceptados como iconografía de marca en otro sitio de la
// app (ICON_OPTIONS del icono de carga, ConfigTab.jsx: Anchor, Compass,
// LifeBuoy, Sailboat) — mismo lenguaje visual, no uno nuevo.
// Waves sigue sin estar aquí: sigue siendo una opción del icono de carga
// configurable (ICON_OPTIONS, ConfigTab.jsx), no un avatar. El favicon/
// login/spinner ya no son Waves de todos modos — son el logo real desde
// el rediseño 2026-09-06 (ver docs/DESIGN-SYSTEM.md §1.1).
export const AVATAR_ICONS = [
  { name: "Fish", Icon: Fish },
  { name: "FishSymbol", Icon: FishSymbol },
  { name: "Turtle", Icon: Turtle },
  { name: "Shrimp", Icon: Shrimp },
  { name: "Snail", Icon: Snail },
  { name: "Shell", Icon: Shell },
  { name: "Anchor", Icon: Anchor },
  { name: "Compass", Icon: Compass },
  { name: "LifeBuoy", Icon: LifeBuoy },
  { name: "Sailboat", Icon: Sailboat },
  { name: "ShipWheel", Icon: ShipWheel },
  { name: "Bubbles", Icon: Bubbles },
  { name: "TreePalm", Icon: TreePalm },
  { name: "Droplets", Icon: Droplets },
];

// Antes una paleta propia (NAVY/TEAL/AQUA/CORAL/GREEN/SUN, el vocabulario
// PRE-rediseño) sin relación con la paleta de marca nueva ni con la de
// entidad de negocio — dos vocabularios de color en la misma app. Ahora
// reutiliza ENTITY_COLOR_PALETTE (colors.js), la misma paleta curada de
// escuelas/cursos — 2026-09-07, pedido explícito: "que integren con la
// paleta de colores de la app" + "que esté disponible en blanco también"
// (ya lo estaba en ENTITY_COLOR_PALETTE, así que llega gratis al
// reutilizarla). Nombres en español, no los nombres técnicos Tailwind de
// la paleta base — son los que puede leer un lector de pantalla al
// elegir avatar.
const AVATAR_COLOR_NAMES = ["negro", "blanco", "pizarra", "rojo", "naranja", "ámbar", "verde", "cian", "azul", "índigo", "morado", "rosa"];
export const AVATAR_COLORS = ENTITY_COLOR_PALETTE.map((value, i) => ({ name: AVATAR_COLOR_NAMES[i], value }));

// Mapa plano nombre→componente, derivado de AVATAR_ICONS — expuesto aparte
// (no solo la función de abajo) porque `react-hooks/static-components`
// marca como error asignar a una variable usada como etiqueta JSX el
// resultado de LLAMAR a una función (aunque sea pura y determinista, como
// esta) durante el render; un acceso a objeto plano sí lo acepta — mismo
// motivo por el que LOADING_ICONS (shared.jsx) y CATEGORY_ICONS
// (HelpTab.jsx) son objetos, no funciones. Cualquier `<Icon />` que
// dependa de un nombre de icono del catálogo de avatares debe usar este
// mapa directamente (`AVATAR_ICON_MAP[name] || AVATAR_ICON_MAP.Fish`),
// nunca `iconByName(name)` (se mantiene solo para código no-JSX).
export const AVATAR_ICON_MAP = Object.fromEntries(AVATAR_ICONS.map((a) => [a.name, a.Icon]));

export function iconByName(name) {
  return AVATAR_ICON_MAP[name] || AVATAR_ICON_MAP.Fish;
}

// Resuelve un icono/color por defecto deterministas a partir del nickname —
// nunca deja el avatar "vacío" mientras el usuario no elige uno explícito,
// y dos cargas de la misma cuenta siempre ven el mismo valor por defecto
// (no aleatorio en cada render).
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

export function resolveAvatar(profile) {
  if (profile?.avatar_icon && profile?.avatar_color) {
    return { icon: profile.avatar_icon, color: profile.avatar_color };
  }
  const seed = hashString(profile?.nickname || profile?.user_id || "ocean-flow");
  return {
    icon: AVATAR_ICONS[seed % AVATAR_ICONS.length].name,
    color: AVATAR_COLORS[seed % AVATAR_COLORS.length].value,
  };
}
