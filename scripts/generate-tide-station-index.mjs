// Genera el índice ligero de estaciones de marea para el widget de
// condiciones de buceo (fase 2 — marea real, ver docs/BACKLOG.md).
//
// @slackwater/database es una dependencia de DESARROLLO (31 MB
// descomprimido, con los constituyentes armónicos completos de ~11.000
// estaciones) — nunca se envía al navegador. Este script la usa solo
// aquí, en build time/mantenimiento, para producir un índice minúsculo
// (id, nombre, país, lat/lng) que sí es seguro de servir como estático.
//
// En tiempo de ejecución, el cliente:
//   1. Descarga este índice una vez (al dar de alta/resolver un sitio,
//      no en cada carga de Home).
//   2. Busca la estación más cercana con una simple distancia haversine
//      sobre estos ~3.600 puntos (trivial, sin librería).
//   3. Pide SOLO esa estación ganadora, completa (con sus constituyentes
//      armónicos), directamente a GitHub —
//      https://raw.githubusercontent.com/openwatersio/slackwater-database/main/data/<id>.json
//      — verificado que `id` mapea 1:1 con esa ruta, sin necesidad de
//      guardar la URL en el índice. CORS abierto, verificado en vivo.
//
// Filtro aplicado (verificado en vivo, cuentas reales al escribir esto):
//   - type === "reference": estaciones con constituyentes armónicos
//     propios (no "subordinate", que solo tienen un offset relativo a
//     otra estación — más complejo de sintetizar, fuera de alcance).
//   - license.commercial_use === true: descarta las CC BY-NC de raíz —
//     Ocean Flow es un producto de pago, nunca se ofrece una estación
//     de licencia dudosa.
//   - quality.accepted === true: filtro de calidad que trae el propio
//     paquete (score por cobertura/recencia/amplitud de la serie
//     observada) — evita resolver a una estación con datos pobres
//     aunque esté técnicamente más cerca.
//   Resultado: 10.968 estaciones totales -> 7.019 "reference" ->
//   6.345 de licencia comercial -> 3.602 tras el filtro de calidad.
//
// Uso: node scripts/generate-tide-station-index.mjs
// Re-ejecutar cuando @slackwater/database publique una versión nueva
// (los datos NOAA se actualizan mensualmente en origen).

import { writeFileSync } from "node:fs";
import { stationsById } from "@slackwater/database";

const OUTPUT_PATH = new URL("../public/data/tide-stations-index.json", import.meta.url);

function passesFilter(station) {
  return (
    station.type === "reference" &&
    station.license?.commercial_use === true &&
    station.quality?.accepted === true
  );
}

const all = [...stationsById.values()];
const filtered = all.filter(passesFilter);

const index = filtered.map((s) => ({
  id: s.id,
  name: s.name,
  country: s.country || null,
  lat: s.latitude,
  lng: s.longitude,
}));

writeFileSync(OUTPUT_PATH, JSON.stringify(index));

console.log(`Total estaciones: ${all.length}`);
console.log(`Tras filtro (reference + commercial_use + quality.accepted): ${filtered.length}`);
console.log(`Escrito: ${OUTPUT_PATH.pathname} (${(JSON.stringify(index).length / 1024).toFixed(1)} KB sin comprimir)`);
