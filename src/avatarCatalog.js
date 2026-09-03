import { Fish, FishSymbol, Turtle, Shrimp, Snail, Shell } from "lucide-react";
import { NAVY, TEAL, AQUA, CORAL, GREEN, SUN } from "./colors";

// Catálogo cerrado de avatares (Bloque 5) — mismo criterio que el icono de
// carga de la app (GeneralSettings, ConfigTab.jsx): iconos de lucide-react
// + colores de marca, nunca una imagen subida por el usuario. Evita
// moderación de contenido y almacenamiento de ficheros para algo que, en
// una app de un único instructor por cuenta, no necesita ser una foto real.
//
// Lista pedida explícitamente (2026-09-04): tiburón ballena, manta,
// tortuga, tiburón, pulpo y el primer pez del listado anterior. Auditoría
// completa de los 2034 iconos de lucide-react@1.33.0 (grep sobre
// node_modules/lucide-react/dist/esm/icons, no solo por nombre obvio):
// la fauna marina real disponible en esta librería es, en su totalidad,
// Fish, FishSymbol, Turtle, Shrimp, Snail y Shell — no existe ningún icono
// de tiburón, tiburón ballena, manta/raya ni pulpo, ni siquiera uno
// genérico con esa silueta (confirma y amplía lo que ya decía este mismo
// comentario en la versión anterior del catálogo, que solo había
// comprobado ballena/delfín/pulpo/cangrejo/tiburón/estrella/medusa).
// Como la lista pedida son 6 animales distintos y solo 2 tienen icono real
// (Turtle para tortuga, Fish para "el primer pez" — se mantiene igual),
// los otros 4 usan el icono real más parecido disponible, documentado caso
// por caso abajo en vez de dejarlos sin avatar. Son sustituciones de
// compromiso, no representaciones fieles — reportado al usuario para que
// decida si las acepta, cambia la lista por animales que sí existen en
// lucide-react, o se encarga un set de iconos SVG a medida (cambio mayor,
// fuera del alcance de este ajuste).
// Waves sigue sin estar aquí: es el icono de la propia app (favicon,
// login, spinner — ver EnvironmentIndicator.jsx/index.html), no un avatar.
export const AVATAR_ICONS = [
  // Tiburón ballena: sin icono ni aproximación real en la librería. Shrimp
  // es el único que queda libre tras repartir los demás — sin ninguna
  // relación visual ni de especie, es un último recurso para no dejar el
  // hueco vacío. Candidato más claro a revisar si se decide otra cosa.
  { name: "Shrimp", Icon: Shrimp },
  // Manta (raya): mismo caso que el tiburón ballena, sin ninguna
  // aproximación real disponible — Snail es el último icono marino que
  // queda libre, sin relación visual ni de especie.
  { name: "Snail", Icon: Snail },
  { name: "Turtle", Icon: Turtle },
  // Tiburón: FishSymbol es el pez más estilizado/afilado de los dos que
  // hay en la librería — la aproximación menos mala a un perfil de
  // depredador, aunque no es un tiburón.
  { name: "FishSymbol", Icon: FishSymbol },
  // Pulpo: Shell es lo más cercano por familia (ambos son moluscos/
  // invertebrados marinos), pero no se parece visualmente a un pulpo —
  // sustitución débil, documentada como tal.
  { name: "Shell", Icon: Shell },
  // Primer pez del catálogo anterior — se mantiene sin cambios.
  { name: "Fish", Icon: Fish },
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
