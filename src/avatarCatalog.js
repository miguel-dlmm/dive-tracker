import { Fish, FishSymbol, Turtle, Shrimp, Snail, Shell } from "lucide-react";
import { NAVY, TEAL, AQUA, CORAL, GREEN, SUN } from "./colors";

// Catálogo cerrado de avatares (Bloque 5) — mismo criterio que el icono de
// carga de la app (GeneralSettings, ConfigTab.jsx): iconos de lucide-react
// + colores de marca, nunca una imagen subida por el usuario. Evita
// moderación de contenido y almacenamiento de ficheros para algo que, en
// una app de un único instructor por cuenta, no necesita ser una foto real.
//
// Catálogo reducido a animales marinos de verdad (pedido explícito del
// usuario, 2026-09-01/02) — antes mezclaba objetos náuticos (Anchor,
// Sailboat, Ship, Compass, LifeBuoy, Droplets, Sunrise) con animales. Se
// revisó el catálogo completo de lucide-react buscando fauna marina real:
// no existen iconos de ballena, delfín, pulpo, cangrejo, tiburón, estrella
// de mar ni medusa en esta librería — el catálogo se queda en los 6 que sí
// representan un animal marino real, en vez de forzar 10 rellenando con
// objetos náuticos otra vez (eso es justo lo que se pidió dejar de hacer).
// Waves sigue sin estar aquí: es el icono de la propia app (favicon,
// login, spinner — ver EnvironmentIndicator.jsx/index.html), no un avatar.
export const AVATAR_ICONS = [
  { name: "Fish", Icon: Fish },
  { name: "FishSymbol", Icon: FishSymbol },
  { name: "Turtle", Icon: Turtle },
  { name: "Shrimp", Icon: Shrimp },
  { name: "Snail", Icon: Snail },
  { name: "Shell", Icon: Shell },
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
