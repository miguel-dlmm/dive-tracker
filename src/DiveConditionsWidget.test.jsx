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

function mockFetchSuccess() {
  const { forecast, marine } = hourlyFixture();
  global.fetch = vi.fn((url) => {
    const body = String(url).includes("marine-api") ? marine : forecast;
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
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

it("el hueco de marea muestra 'Próximamente', nunca un dato inventado", async () => {
  mockGeolocation("denied");
  mockFetchSuccess();
  renderWidget(PROFILE_WITH_FAVORITE);
  await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());
  expect(screen.getByText(i18n.t("diveConditions:tideComingSoon"))).toBeInTheDocument();
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

it("degrada sin romper Home si Open-Meteo falla", async () => {
  mockGeolocation("denied");
  global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  renderWidget(PROFILE_WITH_FAVORITE);
  expect(await screen.findByText(i18n.t("diveConditions:errorLoad"))).toBeInTheDocument();
});
