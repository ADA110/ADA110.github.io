import * as THREE from "three";
import { useStore } from "./store";
import { conditionOf, placeHour, withCondition, type Weather } from "./weather";

export { placeHour as currentHour };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type SkyState = {
  hour: number;
  sunrise: number;
  sunset: number;
  /** 0 at night, 1 in full daylight. */
  day: number;
  /** Peaks just after sunrise and before sunset (dimmed by cloud). */
  golden: number;
  /** Sun height, -1..1 (positive while up). */
  elev: number;
  cloud: number;
  overcast: number;
  rain: number;
  fog: number;
  snow: number;
  storm: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambient: number;
};

/** Everything the window, sky and room lighting need, derived from Palo Alto's time + weather. */
export function skyState(hour: number, w: Weather | null): SkyState {
  const sunrise = w?.sunrise ?? 7;
  const sunset = w?.sunset ?? 18.6;
  const c = w ? conditionOf(w.code) : "clear";
  const cloud = Math.max(w?.cloud ?? 0.1, c === "cloudy" || c === "rain" || c === "storm" ? 0.9 : 0);
  const overcast = smooth(0.55, 1, cloud);
  const rain = c === "drizzle" ? 0.4 : c === "rain" ? 0.8 : c === "storm" ? 1 : 0;
  const fog = c === "fog" ? 0.85 : c === "drizzle" ? 0.25 : rain * 0.2;
  const snow = c === "snow" ? 0.9 : 0;
  const storm = c === "storm" ? 1 : 0;

  const day = smooth(sunrise - 0.7, sunrise + 0.5, hour) * (1 - smooth(sunset - 0.5, sunset + 0.7, hour));
  const golden =
    Math.min(1, Math.exp(-((hour - sunrise - 0.25) ** 2) / 0.35) + Math.exp(-((hour - sunset + 0.15) ** 2) / 0.35)) *
    (1 - overcast * 0.7);
  const elev = Math.sin((Math.PI * (hour - sunrise)) / Math.max(1, sunset - sunrise));

  const sunColor = new THREE.Color("#9fb4ff") // moonlight
    .lerp(new THREE.Color("#fff3e2"), day)
    .lerp(new THREE.Color("#ff9a52"), golden * 0.85)
    .lerp(new THREE.Color("#c9d2dc"), overcast * day * 0.8);
  const dimming = 1 - overcast * 0.8 - rain * 0.1;
  return {
    hour,
    sunrise,
    sunset,
    day,
    golden,
    elev,
    cloud,
    overcast,
    rain,
    fog,
    snow,
    storm,
    sunColor,
    sunIntensity: (0.25 + day * 3.2 + golden * 0.8) * Math.max(0.15, dimming),
    // Clouds trade direct sun for soft, even daylight.
    ambient: 0.05 + day * (0.35 + overcast * 0.15),
  };
}

/** The sky the visitor should see now: live Palo Alto time + weather, unless they're previewing. */
export function liveSky() {
  const { weather, preview } = useStore.getState();
  const hour = preview.hour ?? placeHour();
  const w = preview.condition ? withCondition(weather, preview.condition) : weather;
  return { hour, weather: w, previewing: preview.hour !== null || preview.condition !== null };
}

/** Lightning flash level (0–1), animated by the sky during storms and read by the room lights. */
export const lightning = { value: 0 };
