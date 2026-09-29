// Cliente de Open-Meteo (Forecast + Marine) para el widget de condiciones
// de buceo en Home — ver docs/BACKLOG.md, "Widget de condiciones de buceo
// en Home", y el análisis completo enlazado ahí. Llamada directa desde el
// cliente, sin backend propio: Open-Meteo tiene CORS abierto (verificado
// en vivo), gratis sin API key para el volumen real de este proyecto, y
// así no hace falta sumar una función serverless más al límite 12/12 de
// Vercel Hobby ya alcanzado (ver CLAUDE.md, "Límite de Serverless
// Functions").
//
// Caché en localStorage (30 min), no en memoria de React: sobrevive a
// recargar Home, que es exactamente cuándo más se repetiría la llamada.

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = "oceanflow:diveConditions:";
export const FORECAST_DAYS = 8; // hoy + 7 días adelante, pedido explícito

function cacheKey(lat, lng) {
  return `${CACHE_PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function readCache(lat, lng) {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(lat, lng, data) {
  try {
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch {
    // localStorage lleno o inaccesible (modo privado) — la caché es una
    // optimización, no un requisito; seguir sin ella no rompe el widget.
  }
}

// direcciones en español, mismas abreviaturas que ya usa el resto de la
// app para escuelas/ubicaciones (N/NE/E/SE/S/SO/O/NO).
const WIND_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
export function windDirectionLabel(deg) {
  if (deg == null) return "";
  return WIND_DIRECTIONS[Math.round(deg / 45) % 8];
}

// Agrupa los arrays horarios (192 puntos para 8 días) en un array de 8
// días, cada uno con sus 24 horas — el propio timestamp ISO ya viene en
// hora local (timezone=auto), así que agrupar por el prefijo de fecha
// basta sin ninguna conversión de zona horaria a mano.
function groupByDay(hourlyTime, series) {
  const days = [];
  let currentDate = null;
  let dayIndex = -1;
  hourlyTime.forEach((iso, i) => {
    const date = iso.slice(0, 10);
    if (date !== currentDate) {
      currentDate = date;
      dayIndex++;
      days[dayIndex] = { date, hours: [] };
    }
    days[dayIndex].hours.push({
      time: iso.slice(11, 16),
      wind: series.windSpeed[i],
      windDir: series.windDirection[i],
      wave: series.waveHeight[i],
      wavePeriod: series.wavePeriod[i],
      waterTemp: series.waterTemp[i],
    });
  });
  return days;
}

// Lanza si falla — el llamador decide cómo degradar (nunca un error roto
// en Home, convención ya establecida del proyecto).
export async function fetchDiveConditions(lat, lng, { skipCache = false } = {}) {
  if (!skipCache) {
    const cached = readCache(lat, lng);
    if (cached) return cached;
  }

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&forecast_days=${FORECAST_DAYS}&timezone=auto&wind_speed_unit=kmh`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,sea_surface_temperature&forecast_days=${FORECAST_DAYS}&timezone=auto`;

  const [forecastRes, marineRes] = await Promise.all([fetch(forecastUrl), fetch(marineUrl)]);
  if (!forecastRes.ok || !marineRes.ok) throw new Error("open-meteo-fetch-failed");
  const [forecast, marine] = await Promise.all([forecastRes.json(), marineRes.json()]);

  const days = groupByDay(forecast.hourly.time, {
    windSpeed: forecast.hourly.wind_speed_10m,
    windDirection: forecast.hourly.wind_direction_10m,
    waveHeight: marine.hourly.wave_height,
    wavePeriod: marine.hourly.wave_period,
    waterTemp: marine.hourly.sea_surface_temperature,
  });

  const data = {
    timezone: forecast.timezone,
    days,
    daily: {
      date: forecast.daily.time,
      sunrise: forecast.daily.sunrise,
      sunset: forecast.daily.sunset,
    },
  };
  writeCache(lat, lng, data);
  return data;
}
