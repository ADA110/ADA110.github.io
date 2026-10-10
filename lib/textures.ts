// Procedural PBR textures, generated once on the client: no image downloads.
// Each generator paints a height field and derives color, roughness and a normal map from it.
import * as THREE from "three";

// ---------- noise ----------
function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves = 4, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 17);
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}

// ---------- helpers ----------
type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const c = new THREE.Color(h);
  return [c.r * 255, c.g * 255, c.b * 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

type Field = (x: number, y: number) => RGB;

/** A procedural colour texture (the site is cel-shaded, so colour is all a surface needs). */
export type PaintedSet = { map: THREE.CanvasTexture };

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function bake(w: number, h: number, field: Field, repeat: [number, number] = [1, 1]): PaintedSet {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const c = field(x, y);
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat[0], repeat[1]);
  map.anisotropy = 8;
  map.colorSpace = THREE.SRGBColorSpace;
  return { map };
}

const cache = new Map<string, PaintedSet>();
function cached(key: string, make: () => PaintedSet) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
}

// ---------- materials ----------

/** Granulated cork. */
export const cork = () =>
  cached("cork", () => {
    const a = hex("#b98a55");
    const b = hex("#7c5430");
    const c = hex("#d6ab73");
    return bake(256, 256, (x, y) => {
      const g = valueNoise(x * 0.9, y * 0.9, 31);
      const g2 = valueNoise(x * 0.36, y * 0.36, 32);
      let color = mix(a, b, g2 * 0.7);
      if (g > 0.78) color = c;
      if (g < 0.15) color = b;
      return color;
    });
  });

/** Painted MDF / plastic: a flat colour with a barely-there brush mottle. */
export const paint = (tint: string) =>
  cached("paint" + tint, () => {
    const base = hex(tint);
    return bake(128, 128, (x, y) => mix(base, [0, 0, 0], (fbm(x * 0.2, y * 0.2, 3, 61) - 0.5) * 0.03), [3, 3]);
  });

// ---------- canvas-drawn graphics (text, UI) ----------

export function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * A texture painted with the 2D canvas API. It repaints once web fonts load,
 * and `redraw()` can be called for animated content.
 */
export function paintedTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const redraw = () => {
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    tex.needsUpdate = true;
  };
  redraw();
  if (typeof document !== "undefined") void document.fonts?.ready.then(redraw);
  return { tex, redraw, ctx, canvas };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 99) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = word;
      if (++lines >= maxLines - 1) break;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}
