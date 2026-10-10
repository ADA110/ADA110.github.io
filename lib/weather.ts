// Live time + weather for the place the desk "is": Palo Alto.

export const PLACE = {
  name: "Palo Alto, CA",
  lat: 37.4419,
  lon: -122.143,
  timeZone: "America/Los_Angeles",
};

export type Weather = {
  tempF: number;
  feelsF: number;
  hiF: number;
  loF: number;
  /** WMO weather code. */
  code: number;
  /** 0–1 */
  cloud: number;
  windMph: number;
  /** Local hours (e.g. 7.2 = 7:12am) */
  sunrise: number;
  sunset: number;
};

const toHours = (iso: string) => {
  const [h, m] = (iso.split("T")[1] ?? "00:00").split(":").map(Number);
  return h + m / 60;
};

/** Palo Alto conditions from Open-Meteo (free, no key, CORS-enabled). */
export async function fetchWeather(): Promise<Weather | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(PLACE.lat),
    longitude: String(PLACE.lon),
    current: "temperature_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m",
    daily: "sunrise,sunset,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: PLACE.timeZone,
    forecast_days: "1",
  }).toString();
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      tempF: Math.round(d.current.temperature_2m),
      feelsF: Math.round(d.current.apparent_temperature),
      hiF: Math.round(d.daily.temperature_2m_max[0]),
      loF: Math.round(d.daily.temperature_2m_min[0]),
      code: d.current.weather_code,
      cloud: d.current.cloud_cover / 100,
      windMph: Math.round(d.current.wind_speed_10m),
      sunrise: toHours(d.daily.sunrise[0]),
      sunset: toHours(d.daily.sunset[0]),
    };
  } catch {
    return null;
  }
}

export type Condition = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "storm" | "snow";

export function conditionOf(code: number): Condition {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export function conditionLabel(c: Condition, isDay: boolean) {
  return {
    clear: isDay ? "Sunny" : "Clear",
    partly: "Partly cloudy",
    cloudy: "Cloudy",
    fog: "Foggy",
    drizzle: "Drizzle",
    rain: "Rain",
    storm: "Thunderstorms",
    snow: "Snow",
  }[c];
}

/** `?weather=rain` (or storm, fog, cloudy, partly, clear, snow, drizzle) previews any condition. */
const OVERRIDE_CODES: Record<Condition, { code: number; cloud: number }> = {
  clear: { code: 0, cloud: 0.05 },
  partly: { code: 2, cloud: 0.45 },
  cloudy: { code: 3, cloud: 0.95 },
  fog: { code: 45, cloud: 0.9 },
  drizzle: { code: 53, cloud: 0.9 },
  rain: { code: 63, cloud: 1 },
  storm: { code: 95, cloud: 1 },
  snow: { code: 73, cloud: 1 },
};

export const CONDITIONS = Object.keys(OVERRIDE_CODES) as Condition[];

/** The same day's weather, but with a different condition (for previews). */
export function withCondition(w: Weather | null, c: Condition): Weather {
  const base: Weather = w ?? { tempF: 62, feelsF: 61, hiF: 68, loF: 52, code: 0, cloud: 0, windMph: 4, sunrise: 7.1, sunset: 18.7 };
  return { ...base, ...OVERRIDE_CODES[c] };
}

export function applyWeatherOverride(w: Weather | null): Weather | null {
  if (typeof window === "undefined") return w;
  const q = new URLSearchParams(window.location.search).get("weather") as Condition | null;
  if (!q || !(q in OVERRIDE_CODES)) return w;
  return withCondition(w, q);
}

/** Current hour (0–24, fractional) in Palo Alto. `?hour=21.5` overrides it for testing. */
export function placeHour(now = new Date()) {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("hour");
    if (q !== null && q !== "" && !Number.isNaN(Number(q))) return ((Number(q) % 24) + 24) % 24;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PLACE.timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/** Palo Alto clock face values (time, AM/PM, date). Pass `hour` to show a previewed time. */
export function placeClock(now = new Date(), hourOverride?: number | null) {
  const hour = hourOverride ?? placeHour(now);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60) % 60;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: PLACE.timeZone, weekday: "long", month: "short", day: "numeric" }).format(now);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${h12}:${String(m).padStart(2, "0")}`, ampm: h < 12 ? "AM" : "PM", date, hour };
}

export function formatHour(hour: number) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60) % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
