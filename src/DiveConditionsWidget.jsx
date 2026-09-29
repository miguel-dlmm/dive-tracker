import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Wind, Waves, Thermometer, Moon, MapPin, Navigation, ChevronDown, ChevronLeft, ChevronRight, Search, Star, Sunrise, Sunset, Info, TriangleAlert } from "lucide-react";
import { BRAND_NAVY, BRAND_OCEAN, TEAL, GREEN, SUN } from "./App";
import { useFloatingDropdown, FloatingPanel, useToast } from "./shared";
import { panelVariants, monthSlideVariants, usePrefersReducedMotion, DURATION, EASE } from "./motion";
import { fetchDiveConditions, windDirectionLabel, FORECAST_DAYS } from "./diveConditions/openMeteo";
import { searchDiveSpots } from "./diveConditions/geocoding";
import { resolveTideForLocation, predictTide, TIDE_WARN_DISTANCE_KM } from "./diveConditions/tide";
import { supabase } from "./supabaseClient";

// Widget de condiciones de buceo en Home (viento/oleaje/temperatura del
// agua + previsión por horas hasta 7 días adelante) — ver docs/BACKLOG.md,
// "Widget de condiciones de buceo en Home", y el análisis/mockup previos
// de esta misma sesión. Variante "tarjeta continua" (elegida explícitamente
// por el usuario entre 3 propuestas) — mismo lenguaje visual que el resto
// de tarjetas de Home (borde gray-200, rounded-xl, bg-white).
//
// Marea: NO implementada en este MVP a propósito (la resolución de
// estación real, Slackwater + TICON-4, es un sub-sistema aparte — ver el
// análisis enlazado en el backlog). La tarjeta reserva su hueco visual
// ("Próximamente") en vez de romper la cuadrícula de 4 columnas o
// inventar un dato que no existe todavía.

const CONTAINER = "flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5";

function dayLabel(t, offset, dateStr) {
  if (offset === 0) return t("today");
  if (offset === 1) return t("tomorrow");
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

// Ventana de 3h con menor viento medio del día — cálculo real sobre los
// datos ya cargados (no ilustrativo, a diferencia del mockup previo).
function computeBestWindow(hours) {
  if (!hours || hours.length < 3) return null;
  let bestStart = 0, bestAvg = Infinity;
  for (let i = 0; i <= hours.length - 3; i++) {
    const avg = (hours[i].wind + hours[i + 1].wind + hours[i + 2].wind) / 3;
    if (avg < bestAvg) { bestAvg = avg; bestStart = i; }
  }
  return `${hours[bestStart].time}–${hours[bestStart + 2].time}`;
}

function buildSparkPath(values, w, h) {
  const padX = 3, padTop = 8, padBottom = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - padX * 2) / (values.length - 1);
  const pts = values.map((v, i) => [padX + i * stepX, padTop + (1 - (v - min) / range) * (h - padTop - padBottom), v]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = line + ` L${pts[pts.length - 1][0].toFixed(1)},${h - padBottom} L${pts[0][0].toFixed(1)},${h - padBottom} Z`;
  return { line, area, pts };
}

function HourlyChart({ hours, metric, currentHourIndex }) {
  const W = 300, H = 62;
  const [hoverIndex, setHoverIndex] = useState(currentHourIndex);
  useEffect(() => { setHoverIndex(currentHourIndex); }, [currentHourIndex, metric]);
  const values = hours.map((h) => (metric === "wave" ? h.wave : h.wind));
  const { line, area, pts } = useMemo(() => buildSparkPath(values, W, H), [values]);
  const svgRef = useRef(null);

  const point = pts[Math.min(hoverIndex, pts.length - 1)];

  function handlePoint(clientX) {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    const stepX = (W - 6) / (values.length - 1);
    let idx = Math.round((relX - 3) / stepX);
    idx = Math.max(0, Math.min(values.length - 1, idx));
    setHoverIndex(idx);
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-auto w-full cursor-pointer"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => handlePoint(e.clientX)}
        onPointerMove={(e) => { if (e.buttons === 1 || e.pointerType === "touch") handlePoint(e.clientX); }}
      >
        <path d={area} fill={BRAND_OCEAN} opacity=".12" />
        <path d={line} fill="none" stroke={BRAND_OCEAN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {point && (
          <>
            <line x1={point[0]} y1="0" x2={point[0]} y2={H} stroke={BRAND_OCEAN} strokeWidth="1" strokeDasharray="2,2" opacity=".5" />
            <circle cx={point[0]} cy={point[1]} r="6" fill="#fff" />
            <circle cx={point[0]} cy={point[1]} r="4" fill={BRAND_OCEAN} />
          </>
        )}
      </svg>
      <div className="mt-0.5 flex justify-between px-0.5">
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
          <span key={h} className="text-[8px] font-semibold text-gray-300 tabular-nums">{String(h).padStart(2, "0")}</span>
        ))}
      </div>
    </div>
  );
}

export default function DiveConditionsWidget({ profile, onProfileUpdated }) {
  const { t } = useTranslation("diveConditions");
  const toast = useToast();
  const reduced = usePrefersReducedMotion();

  const [location, setLocation] = useState(null); // { name, country, lat, lng, isGps }
  const [resolving, setResolving] = useState(true);
  const [conditions, setConditions] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const [tideData, setTideData] = useState(null); // { stationId, stationName, distanceKm, harmonicConstituents, attribution, timezone, chartDatum, datums }
  const [tideResolving, setTideResolving] = useState(false);
  const [tideError, setTideError] = useState(false);

  const [expandOpen, setExpandOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [metric, setMetric] = useState("wind");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [lastSelectedFromSearch, setLastSelectedFromSearch] = useState(false);
  const searchDebounce = useRef(null);

  const { open: switcherOpen, setOpen: setSwitcherOpen, anchorRef, panelRef, pos } = useFloatingDropdown("left");

  const favorite = profile?.favorite_dive_spot_lat != null && profile?.favorite_dive_spot_lng != null
    ? {
        name: profile.favorite_dive_spot_name,
        country: profile.favorite_dive_spot_country,
        lat: profile.favorite_dive_spot_lat,
        lng: profile.favorite_dive_spot_lng,
        tideStationId: profile.favorite_tide_station_id,
        tideStationName: profile.favorite_tide_station_name,
        tideStationDistanceKm: profile.favorite_tide_station_distance_km,
        tideHarmonicConstituents: profile.favorite_tide_harmonic_constituents,
        tideStationAttribution: profile.favorite_tide_station_attribution,
      }
    : null;

  function isFavoriteActiveFor(loc, fav) {
    return !!(fav && loc && fav.lat === loc.lat && fav.lng === loc.lng);
  }

  // Resolución inicial de ubicación: GPS del dispositivo primero
  // (automático, pedido explícito del usuario) -> favorito guardado en
  // profiles si el GPS falla/deniega -> placeholder con buscador si
  // tampoco hay favorito. Una sola vez al montar.
  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator)) {
      setLocation(favorite ? { ...favorite, isGps: false } : null);
      setResolving(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setLocation({ name: t("currentLocation"), country: "", lat: pos.coords.latitude, lng: pos.coords.longitude, isGps: true });
        setResolving(false);
      },
      () => {
        if (cancelled) return;
        setLocation(favorite ? { ...favorite, isGps: false } : null);
        setResolving(false);
      },
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga de condiciones cuando cambia la ubicación resuelta.
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setConditions(null);
    setLoadError(false);
    fetchDiveConditions(location.lat, location.lng)
      .then((data) => { if (!cancelled) setConditions(data); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng]);

  // Resolución de marea (fase 2) — si el sitio activo es el favorito y ya
  // tiene la estación resuelta y guardada en profiles, se reutiliza tal
  // cual, sin volver a pedir nada a GitHub. Si no, se resuelve de cero
  // (índice ligero + estación ganadora), cacheado en localStorage por
  // coordenada redondeada para no repetirlo en cada carga.
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setTideData(null);
    setTideError(false);

    const favoriteHasTide = isFavoriteActiveFor(location, favorite) && favorite?.tideStationId && favorite?.tideHarmonicConstituents;
    if (favoriteHasTide) {
      setTideData({
        stationId: favorite.tideStationId,
        stationName: favorite.tideStationName,
        distanceKm: favorite.tideStationDistanceKm,
        harmonicConstituents: favorite.tideHarmonicConstituents,
        attribution: favorite.tideStationAttribution,
        timezone: undefined,
        chartDatum: undefined,
        datums: undefined,
      });
      return;
    }

    setTideResolving(true);
    resolveTideForLocation(location.lat, location.lng)
      .then((data) => { if (!cancelled) setTideData(data); })
      .catch(() => { if (!cancelled) setTideError(true); })
      .finally(() => { if (!cancelled) setTideResolving(false); });
    return () => { cancelled = true; };
  }, [location?.lat, location?.lng]);

  // Búsqueda con pequeño debounce, mientras el desplegable de sitio está abierto.
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      const results = await searchDiveSpots(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(searchDebounce.current);
  }, [searchQuery]);

  const selectLocation = useCallback((loc, fromSearch) => {
    setLocation({ ...loc, isGps: false });
    setLastSelectedFromSearch(!!fromSearch);
    setSwitcherOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setDayOffset(0);
  }, [setSwitcherOpen]);

  const saveFavorite = useCallback(async () => {
    if (!location || !profile?.user_id) return;
    const patch = {
      favorite_dive_spot_name: location.name,
      favorite_dive_spot_country: location.country || null,
      favorite_dive_spot_lat: location.lat,
      favorite_dive_spot_lng: location.lng,
      // La marea ya resuelta para este sitio (si la hay) se guarda a la
      // vez — evita una segunda resolución la próxima vez que se abra.
      favorite_tide_station_id: tideData?.stationId ?? null,
      favorite_tide_station_name: tideData?.stationName ?? null,
      favorite_tide_station_distance_km: tideData?.distanceKm ?? null,
      favorite_tide_harmonic_constituents: tideData?.harmonicConstituents ?? null,
      favorite_tide_station_attribution: tideData?.attribution ?? null,
    };
    try {
      const { error } = await supabase.from("profiles").update(patch).eq("user_id", profile.user_id);
      if (error) throw error;
      onProfileUpdated?.(patch);
      setLastSelectedFromSearch(false);
      toast.success(t("favoriteSaved"));
    } catch {
      toast.error(t("favoriteSaveError"));
    }
  }, [location, tideData, profile?.user_id, onProfileUpdated, toast, t]);

  const isFavoriteActive = isFavoriteActiveFor(location, favorite);

  const tidePrediction = useMemo(() => {
    if (!tideData?.harmonicConstituents) return null;
    try {
      return predictTide(tideData);
    } catch {
      return null;
    }
  }, [tideData]);

  // ---- Estado vacío: sin GPS ni favorito ----
  if (!resolving && !location) {
    return (
      <div className={CONTAINER + " items-center py-5 text-center"}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#EAF2F8" }}>
          <MapPin size={18} style={{ color: BRAND_OCEAN }} aria-hidden="true" />
        </span>
        <span className="text-[12.5px] font-bold" style={{ color: BRAND_NAVY }}>{t("emptyTitle")}</span>
        <span className="max-w-[26ch] text-[10.5px] leading-relaxed text-gray-500">{t("emptyBody")}</span>
        <div className="mt-1 flex w-full flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setResolving(true);
              navigator.geolocation?.getCurrentPosition(
                (pos) => { setLocation({ name: t("currentLocation"), country: "", lat: pos.coords.latitude, lng: pos.coords.longitude, isGps: true }); setResolving(false); },
                () => setResolving(false),
                { timeout: 6000 }
              );
            }}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-4 text-[11.5px] font-bold text-white"
            style={{ backgroundColor: BRAND_OCEAN }}
          >
            <Navigation size={13} aria-hidden="true" />{t("useMyLocation")}
          </button>
          <span className="text-[9.5px] text-gray-300">{t("or")}</span>
          <div className="flex w-full max-w-[220px] items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2">
            <Search size={12} className="shrink-0 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-w-0 flex-1 border-none bg-transparent text-[11.5px] outline-none"
              aria-label={t("searchPlaceholder")}
            />
          </div>
          {searchQuery.trim().length >= 2 && (
            <div className="w-full max-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white">
              {searching && <div className="px-3 py-2 text-[10.5px] text-gray-400">…</div>}
              {!searching && searchResults.length === 0 && <div className="px-3 py-2 text-[10.5px] text-gray-400">{t("noResults")}</div>}
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectLocation(r, true)}
                  className="block w-full border-t border-gray-100 px-3 py-2 text-left text-[11px] font-medium text-gray-700 first:border-t-0"
                >
                  {r.name}{r.country ? `, ${r.country}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (resolving || !location) {
    return <div className={CONTAINER + " min-h-[92px] items-center justify-center text-[11px] text-gray-400"}>{t("loading")}</div>;
  }

  const day = conditions?.days?.[dayOffset];
  const nowHour = new Date().getHours();
  const currentHourData = dayOffset === 0 ? conditions?.days?.[0]?.hours?.[nowHour] : null;
  const sunrise = conditions?.daily?.sunrise?.[dayOffset];
  const sunset = conditions?.daily?.sunset?.[dayOffset];
  const bestWindow = day ? computeBestWindow(day.hours) : null;
  const tideFar = tideData && tideData.distanceKm > TIDE_WARN_DISTANCE_KM;

  return (
    <div className={CONTAINER}>
      <div className="flex items-center justify-between gap-2">
        <div className="relative inline-flex">
          <button
            ref={anchorRef}
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-expanded={switcherOpen}
            aria-label={t("changeSpot")}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1.5"
            style={{ backgroundColor: "#0632560D" }}
          >
            {location.isGps ? <Navigation size={13} style={{ color: BRAND_OCEAN }} aria-hidden="true" /> : <MapPin size={13} style={{ color: BRAND_OCEAN }} aria-hidden="true" />}
            <span className="max-w-[130px] truncate text-[11.5px] font-bold" style={{ color: BRAND_NAVY }}>{location.name}</span>
            <ChevronDown size={11} className="opacity-70" style={{ color: BRAND_NAVY }} aria-hidden="true" />
          </button>
          <FloatingPanel open={switcherOpen} pos={pos} panelRef={panelRef} matchWidth={false} className="w-[236px] p-2.5">
            {favorite && (
              <button
                type="button"
                onClick={() => selectLocation(favorite, false)}
                className="flex min-h-[42px] w-full items-center gap-2.5 rounded-lg bg-[#EAF2F8] px-2.5 py-2 text-left"
              >
                <Star size={14} className="shrink-0" style={{ color: "#B45309" }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-bold" style={{ color: BRAND_NAVY }}>{favorite.name}</span>
                  <span className="text-[10px] text-gray-500">{t("yourFavorite")}</span>
                </span>
              </button>
            )}
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2">
              <Search size={13} className="shrink-0 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="min-w-0 flex-1 border-none bg-transparent text-[12px] outline-none"
                aria-label={t("searchPlaceholder")}
              />
            </div>
            {searchQuery.trim().length >= 2 && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-gray-100">
                {searching && <div className="px-2.5 py-2 text-[10.5px] text-gray-400">…</div>}
                {!searching && searchResults.length === 0 && <div className="px-2.5 py-2 text-[10.5px] text-gray-400">{t("noResults")}</div>}
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectLocation(r, true)}
                    className="block w-full border-t border-gray-100 px-2.5 py-2 text-left text-[11px] font-medium text-gray-700 first:border-t-0"
                  >
                    {r.name}{r.country ? `, ${r.country}` : ""}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 px-0.5 text-[9.5px] leading-relaxed text-gray-300">{t("searchHint")}</p>
          </FloatingPanel>
        </div>

        {!isFavoriteActive && lastSelectedFromSearch && (
          <button type="button" onClick={saveFavorite} className="shrink-0 text-[10.5px] font-bold underline" style={{ color: BRAND_OCEAN }}>
            {t("useAsFavorite")}
          </button>
        )}

        {/* Nav de día — lado contrario a la localización, arriba (pedido
            explícito). Tocarlo abre el desplegable si estaba cerrado, para
            que el cambio de día se vea al momento. */}
        {!loadError && conditions?.days && (
          <div className="flex items-center">
            <button type="button" disabled={dayOffset <= 0}
              onClick={() => { setDayOffset((d) => d - 1); if (!expandOpen) setExpandOpen(true); }}
              aria-label={t("prevDay")}
              className="flex h-5 w-5 items-center justify-center rounded-full p-3 disabled:text-gray-200" style={{ color: BRAND_OCEAN }}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className="min-w-[64px] text-center text-[10.5px] font-extrabold" style={{ color: BRAND_NAVY }}>
              {dayLabel(t, dayOffset, conditions.days[dayOffset]?.date)}
            </span>
            <button type="button" disabled={dayOffset >= Math.min(FORECAST_DAYS - 1, conditions.days.length - 1)}
              onClick={() => { setDayOffset((d) => d + 1); if (!expandOpen) setExpandOpen(true); }}
              aria-label={t("nextDay")}
              className="flex h-5 w-5 items-center justify-center rounded-full p-3 disabled:text-gray-200" style={{ color: BRAND_OCEAN }}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {loadError && <p className="text-[11px] text-gray-400">{t("errorLoad")}</p>}

      {!loadError && (
        <div className="grid grid-cols-4 gap-1.5">
          <MetricTile icon={Wind} color={BRAND_OCEAN}
            value={currentHourData ? Math.round(currentHourData.wind) : "—"}
            sub={currentHourData ? `km/h · ${windDirectionLabel(currentHourData.windDir)}` : ""}
            label={t("wind")} />
          <MetricTile icon={Waves} color={BRAND_NAVY}
            value={currentHourData ? `${currentHourData.wave.toFixed(1)} m` : "—"}
            sub={currentHourData ? t("period", { seconds: Math.round(currentHourData.wavePeriod) }) : ""}
            label={t("wave")} />
          <MetricTile icon={Moon} color={tideFar ? SUN : BRAND_OCEAN}
            value={tidePrediction ? (tidePrediction.rising ? t("tideRising") : t("tideFalling")) : (tideError ? "—" : (tideResolving ? "…" : "—"))}
            sub={tidePrediction?.next ? t(tidePrediction.next.high ? "tideHighAt" : "tideLowAt", { time: tidePrediction.next.time }) : ""}
            label={t("tide")}
            muted={!tidePrediction} />
          <MetricTile icon={Thermometer} color={GREEN}
            value={currentHourData ? `${currentHourData.waterTemp.toFixed(1)}°` : "—"}
            sub="" label={t("waterTemp")} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpandOpen((v) => !v)}
        aria-expanded={expandOpen}
        className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold"
        style={{ backgroundColor: "#EAF2F8", color: BRAND_OCEAN }}
      >
        {t("viewByHour")}
        <motion.span animate={{ rotate: expandOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expandOpen && !loadError && day && (
          <motion.div {...panelVariants(reduced)} className="flex flex-col gap-2.5 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{t("byHour")}</span>
              <div className="flex gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-0.5">
                {["wind", "wave"].map((m) => (
                  <button key={m} type="button" onClick={() => setMetric(m)}
                    className="rounded px-2 py-1 text-[9.5px] font-bold"
                    style={metric === m ? { backgroundColor: BRAND_NAVY, color: "#fff" } : { color: "#6B7A85" }}>
                    {t(m)}
                  </button>
                ))}
              </div>
            </div>

            <HourlyChart hours={day.hours} metric={metric} currentHourIndex={dayOffset === 0 ? nowHour : 12} />

            <div className="flex gap-3 rounded-lg bg-gray-50 px-2.5 py-2">
              <div className="flex flex-1 items-center gap-1.5">
                <span className="flex h-5.5 w-5.5 items-center justify-center rounded-md" style={{ backgroundColor: "#B453091A" }}>
                  <Sunrise size={12} style={{ color: "#B45309" }} aria-hidden="true" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[11.5px] font-extrabold tabular-nums" style={{ color: BRAND_NAVY }}>{sunrise ? sunrise.slice(11, 16) : "—"}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wide text-gray-400">{t("sunrise")}</span>
                </span>
              </div>
              <div className="flex flex-1 items-center gap-1.5">
                <span className="flex h-5.5 w-5.5 items-center justify-center rounded-md" style={{ backgroundColor: "#B453091A" }}>
                  <Sunset size={12} style={{ color: "#B45309" }} aria-hidden="true" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[11.5px] font-extrabold tabular-nums" style={{ color: BRAND_NAVY }}>{sunset ? sunset.slice(11, 16) : "—"}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wide text-gray-400">{t("sunset")}</span>
                </span>
              </div>
            </div>

            {bestWindow && (
              <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[10.5px] leading-relaxed" style={{ backgroundColor: "#EAF2F8", color: "#2B5170" }}>
                <Info size={13} className="mt-0.5 shrink-0" style={{ color: BRAND_OCEAN }} aria-hidden="true" />
                <span><b style={{ color: BRAND_NAVY }}>{t("bestWindowLabel")}:</b> {bestWindow} · {t("bestWindowNote")}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {tidePrediction && !tideFar && (
        <p className="px-0.5 text-[9px] leading-relaxed text-gray-300">
          {t("orientative")} · {t("tideStationNote", { station: tideData.stationName, distance: Math.round(tideData.distanceKm) })}
        </p>
      )}
      {tidePrediction && tideFar && (
        <div className="flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[9.5px] leading-relaxed" style={{ backgroundColor: "#FDF1E4", borderColor: "#EFD2AE", color: "#8A5A15" }}>
          <TriangleAlert size={12} className="mt-0.5 shrink-0" style={{ color: SUN }} aria-hidden="true" />
          <span>{t("tideDistanceWarning", { station: tideData.stationName, distance: Math.round(tideData.distanceKm) })}</span>
        </div>
      )}
      {!tidePrediction && <p className="px-0.5 text-[9px] leading-relaxed text-gray-300">{t("orientative")}</p>}
    </div>
  );
}

function MetricTile({ icon: Icon, color, value, sub, label, muted }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="flex h-6.5 w-6.5 items-center justify-center rounded-lg" style={{ backgroundColor: muted ? "#F1F3F4" : `${color}1A` }}>
        <Icon size={14} style={{ color }} aria-hidden="true" />
      </span>
      <span className="text-[13px] font-extrabold leading-tight tabular-nums" style={{ color: muted ? "#B7C1C9" : BRAND_NAVY }}>{value}</span>
      <span className="text-[8.5px] font-semibold leading-tight text-gray-400">{sub}</span>
      <span className="text-[7.5px] font-bold uppercase tracking-wide text-gray-300">{label}</span>
    </div>
  );
}
