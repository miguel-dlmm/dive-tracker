// Buscador de sitios de buceo (Geocoding API de Open-Meteo, gratis y sin
// key — mismo proveedor que el resto del widget, evita sumar un tercer
// servicio solo para esto). Las búsquedas NUNCA se guardan por sí solas —
// solo cuando el usuario elige explícitamente "usar como favorito", ver
// DiveConditionsWidget.jsx.
export async function searchDiveSpots(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=es&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: r.admin1 ? `${r.name}, ${r.admin1}` : r.name,
    country: r.country,
    lat: r.latitude,
    lng: r.longitude,
  }));
}
