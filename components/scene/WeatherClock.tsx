"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { cssVar, paintedTexture } from "@/lib/textures";
import { liveSky } from "@/lib/sky";
import { conditionLabel, conditionOf, formatHour, placeClock, type Condition } from "@/lib/weather";
import { Hotspot } from "./Hotspot";
import { ROOM } from "./Room";

const W = 0.44;
const H = 0.26;
export const CLOCK = { x: -1.12, y: 1.6 };

// ---------- weather icons (canvas) ----------
function sun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#ffc24b";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffc24b";
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45);
    ctx.lineTo(x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9);
    ctx.stroke();
  }
}
function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#e9ecff";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x + r * 0.55, y - r * 0.35, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = "#d9dee6") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - s * 0.55, y + s * 0.1, s * 0.42, 0, Math.PI * 2);
  ctx.arc(x, y - s * 0.15, s * 0.6, 0, Math.PI * 2);
  ctx.arc(x + s * 0.6, y + s * 0.12, s * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - s * 0.55, y + s * 0.1, s * 1.15, s * 0.42);
}
function drawIcon(ctx: CanvasRenderingContext2D, c: Condition, isDay: boolean, x: number, y: number, s: number) {
  const celestial = (dx: number, dy: number, r: number) => (isDay ? sun(ctx, x + dx, y + dy, r) : moon(ctx, x + dx, y + dy, r));
  if (c === "clear") return celestial(0, 0, s * 0.42);
  if (c === "partly") {
    celestial(-s * 0.25, -s * 0.22, s * 0.32);
    return cloud(ctx, x + s * 0.1, y + s * 0.12, s * 0.5);
  }
  cloud(ctx, x, y - s * 0.05, s * 0.55, c === "storm" ? "#9aa3b2" : "#d9dee6");
  ctx.lineCap = "round";
  if (c === "rain" || c === "drizzle" || c === "storm") {
    ctx.strokeStyle = "#6fb2ff";
    ctx.lineWidth = s * 0.06;
    const n = c === "drizzle" ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) * s * 0.3;
      ctx.beginPath();
      ctx.moveTo(x + dx, y + s * 0.42);
      ctx.lineTo(x + dx - s * 0.08, y + s * 0.62);
      ctx.stroke();
    }
  }
  if (c === "storm") {
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, y + s * 0.3);
    ctx.lineTo(x - s * 0.12, y + s * 0.6);
    ctx.lineTo(x + s * 0.02, y + s * 0.58);
    ctx.lineTo(x - s * 0.06, y + s * 0.82);
    ctx.lineTo(x + s * 0.16, y + s * 0.5);
    ctx.lineTo(x + s * 0.02, y + s * 0.52);
    ctx.closePath();
    ctx.fill();
  }
  if (c === "snow") {
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + (i - 1) * s * 0.3, y + s * 0.55 + (i % 2) * s * 0.1, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (c === "fog") {
    ctx.strokeStyle = "#c9ced6";
    ctx.lineWidth = s * 0.07;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.55 + i * s * 0.15, y + s * 0.45 + i * s * 0.16);
      ctx.lineTo(x + s * 0.55 - i * s * 0.1, y + s * 0.45 + i * s * 0.16);
      ctx.stroke();
    }
  }
}

function drawDisplay(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { hour, weather, previewing } = liveSky();
  const sans = cssVar("--font-geist-sans", "sans-serif");
  const clock = placeClock(new Date(), previewing ? hour : null);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0e1116");
  g.addColorStop(1, "#07090c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // header
  ctx.fillStyle = "#8a93a3";
  ctx.font = `600 20px ${sans}`;
  ctx.textAlign = "left";
  ctx.fillText("WHERE I LIVE", 34, 46);
  ctx.textAlign = "right";
  ctx.fillStyle = previewing ? "#ffb347" : "#3ddc84";
  ctx.beginPath();
  ctx.arc(w - (previewing ? 136 : 86), 39, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a93a3";
  ctx.fillText(previewing ? "PREVIEW" : "LIVE", w - 34, 46);

  // time
  ctx.textAlign = "left";
  ctx.fillStyle = "#f4f2ee";
  ctx.font = `300 132px ${sans}`;
  ctx.fillText(clock.time, 28, 178);
  const tw = ctx.measureText(clock.time).width;
  ctx.font = `500 30px ${sans}`;
  ctx.fillStyle = "#b8bfcc";
  ctx.fillText(clock.ampm, 40 + tw, 178);
  ctx.font = `400 24px ${sans}`;
  ctx.fillStyle = "#8a93a3";
  ctx.fillText(clock.date, 34, 220);

  // divider
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(34, 248, w - 68, 2);

  if (!weather) {
    ctx.fillStyle = "#8a93a3";
    ctx.font = `400 24px ${sans}`;
    ctx.fillText("Checking the weather…", 34, 312);
    return;
  }
  const c = conditionOf(weather.code);
  const isDay = clock.hour > weather.sunrise && clock.hour < weather.sunset;
  drawIcon(ctx, c, isDay, 88, 318, 90);
  ctx.fillStyle = "#f4f2ee";
  ctx.font = `300 76px ${sans}`;
  ctx.fillText(`${weather.tempF}°`, 160, 340);
  const t2 = ctx.measureText(`${weather.tempF}°`).width;
  ctx.font = `600 26px ${sans}`;
  ctx.fillText(conditionLabel(c, isDay), 176 + t2, 306);
  ctx.font = `400 22px ${sans}`;
  ctx.fillStyle = "#8a93a3";
  ctx.fillText(`H ${weather.hiF}°  L ${weather.loF}°  ·  Wind ${weather.windMph} mph`, 176 + t2, 340);
  const next = isDay ? `Sunset ${formatHour(weather.sunset)}` : `Sunrise ${formatHour(weather.sunrise)}`;
  ctx.fillText(next, 34, 392);
  ctx.textAlign = "right";
  ctx.fillText(`Feels like ${weather.feelsF}°`, w - 34, 392);
}

/** A slim wall display showing Palo Alto's live time and weather; the window outside matches it. */
export function WeatherClock() {
  const weather = useStore((s) => s.weather);
  const preview = useStore((s) => s.preview);
  const display = useMemo(() => paintedTexture(704, 416, (ctx, w, h) => drawDisplay(ctx, w, h)), []);
  const lastMinute = useRef("");

  useEffect(() => display.redraw(), [weather, preview, display]);
  useEffect(() => () => display.tex.dispose(), [display]);

  useFrame(() => {
    const t = placeClock(new Date(), useStore.getState().preview.hour).time;
    if (t !== lastMinute.current) {
      lastMinute.current = t;
      display.redraw();
    }
  });

  return (
    <Hotspot id="weather" labelPosition={[CLOCK.x, CLOCK.y - H / 2 - 0.05, ROOM.back + 0.05]} lift={0}>
    <group position={[CLOCK.x, CLOCK.y, ROOM.back + 0.012]}>
      <RoundedBox args={[W + 0.014, H + 0.014, 0.018]} radius={0.004} castShadow receiveShadow>
        <meshStandardMaterial color="#1c1d20" roughness={0.35} metalness={0.8} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0092]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial color="#000" roughness={0.1} emissive={new THREE.Color("#ffffff")} emissiveMap={display.tex} emissiveIntensity={0.85} />
      </mesh>
    </group>
    </Hotspot>
  );
}
