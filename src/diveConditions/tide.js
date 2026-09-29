// Marea real (fase 2 del widget de condiciones — ver docs/BACKLOG.md).
// Todo el cálculo corre en el cliente, sin backend nuevo:
//
// 1. resolveNearestStation(lat, lng) — descarga una vez el índice ligero
//    (~3.600 estaciones, generado por scripts/generate-tide-station-index.mjs,
//    filtrado a estaciones "reference" de licencia comercial y calidad
//    aceptada) y busca la más cercana con una distancia haversine simple
//    sobre esos puntos — trivial, sin librería.
// 2. fetchStationData(id) — pide SOLO la estación ganadora, completa (con
//    sus constituyentes armónicos), directa a GitHub. Verificado en vivo
//    que `id` mapea 1:1 con esa ruta y que responde con CORS abierto.
// 3. predictTide(stationData, ...) — usa @slackwater/engine (motor de
//    predicción armónica, MIT, sin dependencias, validado en CI contra
//    NOAA) para calcular el nivel de agua y la próxima pleamar/bajamar.
//
// Honestidad sobre la precisión: la estación real más cercana casi nunca
// está EN el sitio de buceo — puede estar a cientos de km. El propio
// widget lo muestra siempre (nombre + distancia + atribución), con un
// aviso más visible por encima de TIDE_WARN_DISTANCE_KM, en vez de
// aparentar una precisión que no existe.

import { useStation } from "@slackwater/engine";

export const TIDE_WARN_DISTANCE_KM = 300;

const STATION_INDEX_URL = "/data/tide-stations-index.json";
const STATION_DATA_BASE = "https://raw.githubusercontent.com/openwatersio/slackwater-database/main/data";
const STATION_CACHE_PREFIX = "oceanflow:tideStation:";
const STATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días — la asignación de estación no cambia con el tiempo real

let indexPromise = null;
function loadStationIndex() {
  if (!indexPromise) {
    indexPromise = fetch(STATION_INDEX_URL)
      .then((res) => { if (!res.ok) throw new Error("tide-index-fetch-failed"); return res.json(); })
      .catch((err) => { indexPromise = null; throw err; });
  }
  return indexPromise;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function resolveNearestStation(lat, lng) {
  const index = await loadStationIndex();
  let best = null;
  let bestDistance = Infinity;
  for (const s of index) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d < bestDistance) { bestDistance = d; best = s; }
  }
  if (!best) return null;
  return { id: best.id, name: best.name, country: best.country, distanceKm: bestDistance };
}

function cacheKey(lat, lng) {
  return `${STATION_CACHE_PREFIX}${lat.toFixed(1)},${lng.toFixed(1)}`;
}

function readStationCache(lat, lng) {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > STATION_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeStationCache(lat, lng, data) {
  try {
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch {
    // localStorage lleno/inaccesible — no crítico, se resuelve otra vez
  }
}

export async function fetchStationData(id) {
  const res = await fetch(`${STATION_DATA_BASE}/${id}.json`);
  if (!res.ok) throw new Error("tide-station-fetch-failed");
  return res.json();
}

// Resuelve todo lo necesario para un sitio: estación más cercana + sus
// datos completos, cacheado en localStorage por coordenada redondeada
// (no en la caché general de 30 min del tiempo — la asignación de
// estación no caduca igual de rápido). Lanza si falla; el llamador
// decide cómo degradar.
export async function resolveTideForLocation(lat, lng) {
  const cached = readStationCache(lat, lng);
  if (cached) return cached;

  const nearest = await resolveNearestStation(lat, lng);
  if (!nearest) throw new Error("no-tide-station-found");
  const stationData = await fetchStationData(nearest.id);

  const result = {
    stationId: nearest.id,
    stationName: stationData.name || nearest.name,
    distanceKm: nearest.distanceKm,
    harmonicConstituents: stationData.harmonic_constituents,
    attribution: stationData.attribution,
    timezone: stationData.timezone,
    chartDatum: stationData.chart_datum,
    datums: stationData.datums,
  };
  writeStationCache(lat, lng, result);
  return result;
}

// Convierte una hora LOCAL del sitio de buceo (p. ej. "2026-09-29T14:00",
// sin marca de huso horario, tal como la devuelve Open-Meteo con
// timezone=auto) al instante UTC real que necesita el motor de marea.
// Date.UTC() lee los componentes tal cual, como si fueran UTC — restar el
// offset del sitio da el instante UTC correcto, sin depender en ningún
// momento de la zona horaria del dispositivo que está mirando el móvil.
export function localIsoToDate(isoLocal, utcOffsetSeconds) {
  const [datePart, timePart] = isoLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(asUtc - (utcOffsetSeconds || 0) * 1000);
}

// A partir de los datos ya resueltos (de profiles, o de resolveTideForLocation)
// calcula el nivel actual (tendencia subiendo/bajando) y la próxima
// pleamar/bajamar — reconstruye el objeto de estación que espera
// @slackwater/engine a partir de los campos ya guardados, sin volver a
// pedir nada a GitHub.
export function predictTide({ harmonicConstituents, chartDatum, datums, timezone }, at = new Date()) {
  const station = useStation({
    harmonic_constituents: harmonicConstituents,
    chart_datum: chartDatum,
    datums,
  });
  const soon = new Date(at.getTime() + 10 * 60 * 1000);
  const now = station.getWaterLevelAtTime({ time: at });
  const later = station.getWaterLevelAtTime({ time: soon });
  const rising = later.level > now.level;

  const windowEnd = new Date(at.getTime() + 24 * 3600 * 1000);
  const { extremes } = station.getExtremesPrediction({ start: at, end: windowEnd });
  const next = extremes?.[0] || null;

  const timeFmt = timezone
    ? new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone: timezone })
    : new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

  return {
    level: now.level,
    rising,
    next: next ? { high: next.high, time: timeFmt.format(new Date(next.time)) } : null,
  };
}
