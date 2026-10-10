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

type Field = (x: number, y: number) => { h: number; color: RGB; rough: number };

export type PBRSet = {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
};

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean, repeat: [number, number]) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

function bake(w: number, h: number, field: Field, normalStrength: number, repeat: [number, number] = [1, 1]): PBRSet {
  const heights = new Float32Array(w * h);
  const cC = makeCanvas(w, h);
  const rC = makeCanvas(w, h);
  const nC = makeCanvas(w, h);
  const cI = cC.getContext("2d")!.createImageData(w, h);
  const rI = rC.getContext("2d")!.createImageData(w, h);
  const nI = nC.getContext("2d")!.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const s = field(x, y);
      heights[i] = s.h;
      cI.data[i * 4] = s.color[0];
      cI.data[i * 4 + 1] = s.color[1];
      cI.data[i * 4 + 2] = s.color[2];
      cI.data[i * 4 + 3] = 255;
      const r = Math.max(0, Math.min(255, s.rough * 255));
      rI.data[i * 4] = rI.data[i * 4 + 1] = rI.data[i * 4 + 2] = r;
      rI.data[i * 4 + 3] = 255;
    }
  }
  // Sobel normal map (wraps at edges so the texture tiles).
  const H = (x: number, y: number) => heights[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1);
      const dy =
        H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1);
      const nx = -dx * normalStrength;
      const ny = dy * normalStrength;
      const len = Math.sqrt(nx * nx + ny * ny + 1);
      const i = (y * w + x) * 4;
      nI.data[i] = (nx / len * 0.5 + 0.5) * 255;
      nI.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      nI.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      nI.data[i + 3] = 255;
    }
  }
  cC.getContext("2d")!.putImageData(cI, 0, 0);
  rC.getContext("2d")!.putImageData(rI, 0, 0);
  nC.getContext("2d")!.putImageData(nI, 0, 0);
  return {
    map: toTexture(cC, true, repeat),
    roughnessMap: toTexture(rC, false, repeat),
    normalMap: toTexture(nC, false, repeat),
  };
}

const cache = new Map<string, PBRSet>();
function cached(key: string, make: () => PBRSet) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
}

// ---------- materials ----------

/** Walnut-ish desk top: long grain along X with figure and pores. */
export const deskWood = () =>
  cached("deskWood", () => {
    const light = hex("#9a6a43");
    const dark = hex("#4f2f1a");
    return bake(1024, 512, (x, y) => {
      const warp = fbm(x * 0.002, y * 0.012, 3, 3) * 18;
      const ring = Math.sin(y * 0.09 + warp + fbm(x * 0.0015, y * 0.004, 2, 9) * 6);
      const streak = fbm(x * 0.004, y * 0.35, 3, 5);
      const pores = valueNoise(x * 0.9, y * 0.12, 11) > 0.94 ? 1 : 0;
      let t = 0.5 + ring * 0.22 + (streak - 0.5) * 0.6;
      t = Math.min(1, Math.max(0, t));
      const color = mix(light, dark, t * 0.85 + pores * 0.2);
      return { h: t * 0.5 + pores * 0.08, color, rough: 0.32 + streak * 0.18 + pores * 0.1 };
    }, 0.9);
  });

/** Oak floor planks with staggered joints. */
export const floorPlanks = () =>
  cached("floor", () => {
    const base = hex("#b28a62");
    const dark = hex("#6e4c30");
    const plankH = 64; // px per plank row (texture is 1024 tall -> 16 rows)
    const plankW = 512;
    return bake(1024, 1024, (x, y) => {
      const row = Math.floor(y / plankH);
      const offset = (hash(row, 0, 2) * plankW) | 0;
      const col = Math.floor((x + offset) / plankW);
      const lx = (x + offset) % plankW;
      const ly = y % plankH;
      const tone = hash(row, col, 7);
      const grain = fbm(x * 0.006 + tone * 30, y * 0.18, 3, 4);
      const ring = Math.sin(ly * 0.25 + fbm(x * 0.004, y * 0.02, 2, 6) * 10) * 0.5 + 0.5;
      const gap = ly < 2 || lx < 2 ? 1 : 0;
      let t = 0.25 + tone * 0.35 + (grain - 0.5) * 0.5 + ring * 0.12;
      t = Math.min(1, Math.max(0, t));
      const color = gap ? hex("#2a1c12") : mix(base, dark, t);
      return { h: gap ? 0 : 0.6 + grain * 0.2, color, rough: gap ? 0.9 : 0.42 + grain * 0.2 };
    }, 1.6, [2.5, 2.5]);
  });

/** Painted plaster: soft, barely-there undulation. */
export const plaster = () =>
  cached("plaster", () => {
    const base = hex("#e9e3d9");
    const shade = hex("#d7cfc2");
    return bake(512, 512, (x, y) => {
      const n = fbm(x * 0.02, y * 0.02, 4, 21);
      const fine = valueNoise(x * 0.5, y * 0.5, 22);
      return { h: n * 0.6 + fine * 0.15, color: mix(base, shade, n * 0.35), rough: 0.88 };
    }, 0.8, [3, 3]);
  });

/** Granulated cork. */
export const cork = () =>
  cached("cork", () => {
    const a = hex("#b98a55");
    const b = hex("#7c5430");
    const c = hex("#d6ab73");
    return bake(512, 512, (x, y) => {
      const g = valueNoise(x * 0.45, y * 0.45, 31);
      const g2 = valueNoise(x * 0.18, y * 0.18, 32);
      let color = mix(a, b, g2 * 0.7);
      if (g > 0.78) color = c;
      if (g < 0.15) color = b;
      return { h: g * 0.7 + g2 * 0.3, color, rough: 0.95 };
    }, 2.5);
  });

/** Felt desk mat. */
export const felt = (tint = "#2b2d31") =>
  cached("felt" + tint, () => {
    const base = hex(tint);
    return bake(256, 256, (x, y) => {
      const n = valueNoise(x * 1.6, y * 1.6, 41) * 0.7 + fbm(x * 0.08, y * 0.08, 2, 42) * 0.3;
      return { h: n, color: mix(base, [255, 255, 255], n * 0.04), rough: 0.97 };
    }, 0.35, [6, 3]);
  });

/** Woven rug. */
export const rug = () =>
  cached("rug", () => {
    const a = hex("#c9bba6");
    const b = hex("#9d8d78");
    return bake(512, 512, (x, y) => {
      const weave = (Math.sin(x * 1.2) * Math.sin(y * 1.2)) * 0.5 + 0.5;
      const n = fbm(x * 0.03, y * 0.03, 3, 51);
      const stripe = Math.floor(y / 64) % 4 === 0 ? 1 : 0;
      return { h: weave * 0.5 + n * 0.5, color: mix(a, b, n * 0.5 + stripe * 0.35), rough: 1 };
    }, 1.2, [3, 2]);
  });

/** Painted MDF / plastic with a faint orange-peel. */
export const paint = (tint: string, rough = 0.55) =>
  cached("paint" + tint + rough, () => {
    const base = hex(tint);
    return bake(256, 256, (x, y) => {
      const n = fbm(x * 0.2, y * 0.2, 3, 61);
      return { h: n, color: mix(base, [0, 0, 0], (n - 0.5) * 0.03), rough: rough + (n - 0.5) * 0.06 };
    }, 0.12, [3, 3]);
  });

/** Terracotta for the plant pot. */
export const terracotta = () =>
  cached("terracotta", () => {
    const a = hex("#b8603d");
    const b = hex("#8f4428");
    return bake(256, 256, (x, y) => {
      const n = fbm(x * 0.05, y * 0.05, 4, 71);
      const speck = valueNoise(x * 0.7, y * 0.7, 72) > 0.9 ? 1 : 0;
      return { h: n + speck * 0.3, color: mix(a, b, n * 0.6 + speck * 0.3), rough: 0.9 };
    }, 1.2, [2, 1]);
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
