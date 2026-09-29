vi.mock("./supabaseClient", () => ({ supabase: { from: vi.fn() } }));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiveConditionsWidget from "./DiveConditionsWidget";
import { ToastProvider } from "./shared";
import { supabase } from "./supabaseClient";
import i18n from "./i18n";

const PROFILE = { user_id: "u1" };
const PROFILE_WITH_FAVORITE = {
  user_id: "u1",
  favorite_dive_spot_name: "Koh Tao · Sairee",
  favorite_dive_spot_country: "Thailand",
  favorite_dive_spot_lat: 10.0956,
  favorite_dive_spot_lng: 99.8402,
};
const HARMONICS = [{ name: "M2", amplitude: 0.5, phase: 0 }, { name: "K1", amplitude: 0.3, phase: 90 }];
const PROFILE_WITH_FAVORITE_AND_TIDE = {
  ...PROFILE_WITH_FAVORITE,
  favorite_tide_station_id: "ticon/ko_lak-328-tha-uhslc_fd",
  favorite_tide_station_name: "Ko Lak",
  favorite_tide_station_distance_km: 188.9,
  favorite_tide_harmonic_constituents: HARMONICS,
  favorite_tide_station_attribution: "Slackwater database. Licensed CC BY 4.0.",
};

function hourlyFixture() {
  const time = Array.from({ length: 24 }, (_, h) => `2026-09-29T${String(h).padStart(2, "0")}:00`);
  return {
    forecast: {
      timezone: "Asia/Bangkok",
      hourly: { time, wind_speed_10m: time.map(() => 6), wind_direction_10m: time.map(() => 45) },
      daily: { time: ["2026-09-29"], sunrise: ["2026-09-29T06:04"], sunset: ["2026-09-29T18:08"] },
    },
    marine: {
      hourly: { time, wave_height: time.map(() => 0.2), wave_period: time.map(() => 4), sea_surface_temperature: time.map(() => 29.9) },
    },
  };
}

// datums necesita MSL además de LAT — el motor lo usa como referencia
// para convertir entre datums; sin él lanza ("Station missing MSL datum")
// y el widget lo oculta en silencio (nunca rompe Home), lo que hizo este
// fixture incompleto difícil de diagnosticar la primera vez.
const TIDE_STATION_FIXTURE = { name: "Ko Lak", timezone: "Asia/Bangkok", chart_datum: "LAT", datums: { LAT: 1, MSL: 2 }, harmonic_constituents: HARMONICS, attribution: "Slackwater database. Licensed CC BY 4.0." };
const TIDE_INDEX_FIXTURE = [{ id: "ticon/ko_lak-328-tha-uhslc_fd", name: "Ko Lak", country: "Thailand", lat: 11.795, lng: 99.817 }];

const GEOCODING_RESULT = { name: "Ko Lak", country: "Thailand", latitude: 11.795, longitude: 99.817 };

function mockFetchSuccess() {
  const { forecast, marine } = hourlyFixture();
  global.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.includes("geocoding-api")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [GEOCODING_RESULT] }) });
    if (u.includes("marine-api")) return Promise.resolve({ ok: true, json: () => Promise.resolve(marine) });
    if (u.includes("tide-stations-index.json")) return Promise.resolve({ ok: true, json: () => Promise.resolve(TIDE_INDEX_FIXTURE) });
    if (u.includes("raw.githubusercontent.com")) return Promise.resolve({ ok: true, json: () => Promise.resolve(TIDE_STATION_FIXTURE) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(forecast) });
  });
}

function mockGeolocation(behavior) {
  global.navigator.geolocation = {
    getCurrentPosition: vi.fn((success, error) => {
      if (behavior === "success") success({ coords: { latitude: 10.1, longitude: 99.8 } });
      else error(new Error("denied"));
    }),
  };
}

function renderWidget(profile = PROFILE, overrides = {}) {
  const onProfileUpdated = vi.fn();
  render(
    <ToastProvider>
      <DiveConditionsWidget profile={profile} onProfileUpdated={onProfileUpdated} {...overrides} />
    </ToastProvider>
  );
  return { onProfileUpdated };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

it("muestra el estado vacío si el GPS falla y no hay favorito guardado", async () => {
  mockGeolocation("denied");
  renderWidget(PROFILE);
  await waitFor(() => expect(screen.getByText(i18n.t("diveConditions:emptyTitle"))).toBeInTheDocument());
  expect(screen.getByRole("button", { name: i18n.t("diveConditions:useMyLocation") })).toBeInTheDocument();
});

it("cae al favorito guardado cuando el GPS falla, y muestra las condiciones", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  renderWidget(PROFILE_WITH_FAVORITE);
  expect(await screen.findByText("Koh Tao · Sairee")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  expect(screen.getByText("0.2 m")).toBeInTheDocument();
});

it("resuelve la ubicación automáticamente vía GPS cuando está disponible", async () => {
  mockGeolocation("success");
  mockFetchSuccess();
  renderWidget(PROFILE);
  expect(await screen.findByText(i18n.t("diveConditions:currentLocation"))).toBeInTheDocument();
});

it("usa la marea ya guardada en el favorito sin volver a pedirla a GitHub", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  renderWidget(PROFILE_WITH_FAVORITE_AND_TIDE);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  await waitFor(() => {
    const rising = screen.queryByText(i18n.t("diveConditions:tideRising"));
    const falling = screen.queryByText(i18n.t("diveConditions:tideFalling"));
    expect(rising || falling).toBeTruthy();
  });
  const calledUrls = global.fetch.mock.calls.map(([url]) => String(url));
  expect(calledUrls.some((u) => u.includes("raw.githubusercontent.com"))).toBe(false);
  expect(calledUrls.some((u) => u.includes("tide-stations-index.json"))).toBe(false);
});

it("resuelve la marea de cero (índice + estación) cuando el sitio no tiene marea guardada", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  renderWidget(PROFILE_WITH_FAVORITE);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  await waitFor(() => {
    const rising = screen.queryByText(i18n.t("diveConditions:tideRising"));
    const falling = screen.queryByText(i18n.t("diveConditions:tideFalling"));
    expect(rising || falling).toBeTruthy();
  });
  // No se comprueba aquí si "tide-stations-index.json" se pidió en ESTE
  // test en concreto: el índice se cachea a nivel de módulo (deliberado en
  // producción, para no volver a descargarlo en la misma sesión) y un test
  // anterior de este mismo archivo puede haberlo resuelto ya — lo que sí
  // es fiable siempre es que la estación ganadora se pide fresca (la caché
  // de esa parte vive en localStorage, limpiado en cada test).
  const calledUrls = global.fetch.mock.calls.map(([url]) => String(url));
  expect(calledUrls.some((u) => u.includes("raw.githubusercontent.com"))).toBe(true);
});

it("avisa con más fuerza cuando la estación de marea está lejos (>300 km)", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  const farProfile = { ...PROFILE_WITH_FAVORITE_AND_TIDE, favorite_tide_station_distance_km: 410 };
  renderWidget(farProfile);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  expect(await screen.findByText(/410/)).toBeInTheDocument();
});

it("despliega el detalle por horas al tocar 'Ver el día por horas'", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  const user = userEvent.setup();
  renderWidget(PROFILE_WITH_FAVORITE);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  const toggle = screen.getByRole("button", { name: i18n.t("diveConditions:viewByHour") });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(await screen.findByText(i18n.t("diveConditions:sunrise"))).toBeInTheDocument();
});

it("no muestra el enlace de favorito si el sitio activo ya es el favorito", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  renderWidget(PROFILE_WITH_FAVORITE);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  expect(screen.queryByRole("button", { name: i18n.t("diveConditions:useAsFavorite") })).not.toBeInTheDocument();
});

it("marca un resultado de búsqueda como favorito al tocar su estrella", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
  supabase.from.mockReturnValue({ update });
  const user = userEvent.setup();
  renderWidget(PROFILE_WITH_FAVORITE);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());

  await user.click(screen.getByRole("button", { name: i18n.t("diveConditions:changeSpot") }));
  const input = screen.getByPlaceholderText(i18n.t("diveConditions:searchPlaceholder"));
  await user.type(input, "Ko Lak");
  const star = await screen.findByRole("button", { name: i18n.t("diveConditions:useAsFavorite") }, { timeout: 2000 });
  await user.click(star);

  await waitFor(() => expect(update).toHaveBeenCalled(), { timeout: 2000 });
  const patch = update.mock.calls[0][0];
  expect(patch.favorite_dive_spot_name).toBe(GEOCODING_RESULT.name);
  expect(patch.favorite_dive_spot_lat).toBe(GEOCODING_RESULT.latitude);
});

it("degrada sin romper Home si Open-Meteo falla", async () => {
  mockGeolocation("denied");
  global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  renderWidget(PROFILE_WITH_FAVORITE);
  expect(await screen.findByText(i18n.t("diveConditions:errorLoad"))).toBeInTheDocument();
});
