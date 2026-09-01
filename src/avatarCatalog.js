import { Waves, Anchor, Sailboat, Fish, Turtle, Compass, Ship, Shell, LifeBuoy, Droplets } from "lucide-react";
import { NAVY, TEAL, AQUA, CORAL, GREEN, SUN } from "./colors";

// Catálogo cerrado de avatares (Bloque 5) — mismo criterio que el icono de
// carga de la app (GeneralSettings, ConfigTab.jsx): iconos de lucide-react
// + colores de marca, nunca una imagen subida por el usuario. Evita
// moderación de contenido y almacenamiento de ficheros para algo que, en
// una app de un único instructor por cuenta, no necesita ser una foto real.
// Set de iconos DISTINTO del de "icono de carga" a propósito — que no se
// confunda un avatar con el spinner de la app.
export const AVATAR_ICONS = [
  { name: "Waves", Icon: Waves },
  { name: "Anchor", Icon: Anchor },
  { name: "Sailboat", Icon: Sailboat },
  { name: "Fish", Icon: Fish },
  { name: "Turtle", Icon: Turtle },
  { name: "Compass", Icon: Compass },
  { name: "Ship", Icon: Ship },
  { name: "Shell", Icon: Shell },
  { name: "LifeBuoy", Icon: LifeBuoy },
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
