"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { CONDITIONS, conditionLabel, conditionOf, formatHour, placeClock, placeHour, type Condition } from "@/lib/weather";

const ICON: Record<Condition, string> = {
  clear: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  storm: "⛈️",
  snow: "❄️",
};

const fmtSlider = (h: number) => formatHour(h).replace(":00", "");

/** Live Palo Alto readout + controls to preview any weather / time in the room. */
export function WeatherNow() {
  const weather = useStore((s) => s.weather);
  const preview = useStore((s) => s.preview);
  const set = useStore((s) => s.set);
  // Time is read only in the browser (pages are prerendered), then ticks every 15s.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const clock = now ? placeClock(now) : { time: "--:--", ampm: "", date: "\u00a0", hour: 12 };
  const live = weather ? conditionOf(weather.code) : null;
  const isDay = weather ? clock.hour > weather.sunrise && clock.hour < weather.sunset : true;
  const setPreview = (p: Partial<typeof preview>) => set({ preview: { ...preview, ...p } });
  const previewing = preview.condition !== null || preview.hour !== null;

  return (
    <div className="stack">
      <div className="card weather-hero">
        <div>
          <p className="eyebrow">Live · Palo Alto, CA</p>
          <p className="weather-time">
            {clock.time} <span>{clock.ampm}</span>
          </p>
          <p className="muted">{clock.date}</p>
        </div>
        {weather && live ? (
          <div className="weather-temp">
            <span aria-hidden>{ICON[live]}</span>
            <strong>{weather.tempF}°</strong>
            <span className="muted">{conditionLabel(live, isDay)}</span>
          </div>
        ) : (
          <p className="muted">Weather unavailable right now.</p>
        )}
      </div>
      {weather && (
        <dl className="facts">
          <div>
            <dt>Feels like</dt>
            <dd>{weather.feelsF}°F</dd>
          </div>
          <div>
            <dt>High / low</dt>
            <dd>
              {weather.hiF}° / {weather.loF}°
            </dd>
          </div>
          <div>
            <dt>Sunrise</dt>
            <dd>{formatHour(weather.sunrise)}</dd>
          </div>
          <div>
            <dt>Sunset</dt>
            <dd>{formatHour(weather.sunset)}</dd>
          </div>
        </dl>
      )}
      <p className="muted small">
        The window, the sunlight on the desk and this display all follow the real time and weather in Palo Alto, where I
        live. Data from Open-Meteo, refreshed every 10 minutes.
      </p>

      <section className="stack preview-box">
        <header className="preview-head">
          <h3>Play with the sky</h3>
          {previewing && (
            <button className="text-btn" onClick={() => set({ preview: { condition: null, hour: null } })}>
              Back to live
            </button>
          )}
        </header>
        <div className="chips big selectable" role="radiogroup" aria-label="Weather">
          <button role="radio" aria-checked={preview.condition === null} onClick={() => setPreview({ condition: null })}>
            Live
          </button>
          {CONDITIONS.map((c) => (
            <button key={c} role="radio" aria-checked={preview.condition === c} onClick={() => setPreview({ condition: c })}>
              <span aria-hidden>{ICON[c]}</span> {conditionLabel(c, true)}
            </button>
          ))}
        </div>
        <label className="time-slider">
          <span>
            Time of day <strong>{preview.hour === null ? "Live" : fmtSlider(preview.hour)}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={23.75}
            step={0.25}
            value={preview.hour ?? (now ? placeHour(now) : 12)}
            onChange={(e) => setPreview({ hour: Number(e.target.value) })}
          />
        </label>
      </section>
    </div>
  );
}
