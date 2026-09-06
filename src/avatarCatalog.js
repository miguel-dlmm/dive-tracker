import { Fish, FishSymbol, Turtle, Shrimp, Snail, Shell, Anchor, Compass, LifeBuoy, Sailboat, ShipWheel, Bubbles, TreePalm, Droplets } from "lucide-react";
import { NAVY, TEAL, AQUA, CORAL, GREEN, SUN } from "./colors";

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
// Waves sigue sin estar aquí: es el icono de la propia app (favicon,
// login, spinner — ver EnvironmentIndicator.jsx/index.html), no un avatar.
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

export const AVATAR_COLORS = [
  { name: "navy", value: NAVY },
  { name: "teal", value: TEAL },
  { name: "aqua", value: AQUA },
  { name: "coral", value: CORAL },
  { name: "green", value: GREEN },
  { name: "sun", value: SUN },
];

export function iconByName(name) {
  return AVATAR_ICONS.find((a) => a.name === name)?.Icon || AVATAR_ICONS[0].Icon;
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
