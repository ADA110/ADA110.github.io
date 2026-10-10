"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { paint } from "@/lib/textures";
import { useScanned } from "./pbr";
import { lightning, liveSky, skyState } from "@/lib/sky";
import { useStore } from "@/lib/store";

// Room bounds (meters). Floor at y=0, back wall at z=-0.56, left (window) wall at x=-1.6.
export const ROOM = {
  back: -0.56,
  left: -1.6,
  right: 3.4,
  front: 3.6,
  height: 2.7,
  window: { z0: -0.3, z1: 0.8, y0: 0.95, y1: 2.15 },
};

const WALL_T = 0.14;

/** Painted wall: flat warm white, like a hand-painted background. */
function Wall({ size, position }: { size: [number, number, number]; position: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#f4ede3" />
    </mesh>
  );
}

function Window() {
  const { z0, z1, y0, y1 } = ROOM.window;
  const x = ROOM.left - WALL_T / 2;
  const w = z1 - z0;
  const h = y1 - y0;
  const zc = (z0 + z1) / 2;
  const yc = (y0 + y1) / 2;
  const frame = paint("#f4f1ea");
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ ...frame, roughness: 1 }), [frame]);
  const t = 0.045;
  const bars: [number, number, number, number, number, number][] = [
    // [y, z, sy, sz] style: position y,z then size y,z, depth
    [y1 - t / 2, zc, t, w, 0.07, 0],
    [y0 + t / 2, zc, t, w, 0.07, 0],
    [yc, z0 + t / 2, h, t, 0.07, 0],
    [yc, z1 - t / 2, h, t, 0.07, 0],
    [yc, zc, h, 0.035, 0.05, 0], // centre mullion
    [yc + 0.12, zc, 0.03, w, 0.05, 0], // transom
  ];
  return (
    <group>
      {bars.map(([y, z, sy, sz, d], i) => (
        <mesh key={i} position={[x, y, z]} material={frameMat} castShadow receiveShadow>
          <boxGeometry args={[d, sy, sz]} />
        </mesh>
      ))}
      {/* sill */}
      <RoundedBox args={[0.2, 0.035, w + 0.12]} radius={0.008} position={[ROOM.left + 0.04, y0 - 0.015, zc]} castShadow receiveShadow material={frameMat} />
      {/* glass: faint reflection only, so the view stays clear */}
      <mesh position={[x, yc, zc]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial transparent opacity={0.08} roughness={0.02} metalness={0} envMapIntensity={1.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

const skyVert = /* glsl */ `
varying vec3 vPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// The view out of the window: Palo Alto foothills and a tree line under a sky driven by
// the real local time and weather (sun, moon, stars, clouds, fog, rain, snow, lightning).
const skyFrag = /* glsl */ `
uniform float uHour, uTime, uRise, uSet, uCloud, uRain, uFog, uSnow, uFlash;
varying vec3 vPos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}

void main() {
  // p.x runs along the wall (world -z), p.y is world height.
  vec2 p = vec2(-vPos.z, vPos.y);
  float h = uHour;
  float day = smoothstep(uRise - 0.7, uRise + 0.5, h) * (1.0 - smoothstep(uSet - 0.5, uSet + 0.7, h));
  float overcast = smoothstep(0.55, 1.0, uCloud);
  float golden = clamp(exp(-pow(h - uRise - 0.25, 2.0) / 0.35) + exp(-pow(h - uSet + 0.15, 2.0) / 0.35), 0.0, 1.0) * (1.0 - overcast * 0.7);

  // ---- sky gradient: painted anime blue (bright cyan horizon, clear blue overhead), grey when overcast
  float g = smoothstep(0.1, 2.2, p.y);
  vec3 dayTop = mix(vec3(0.06, 0.28, 0.86), mix(vec3(0.42, 0.45, 0.5), vec3(0.17, 0.19, 0.22), uRain), overcast);
  vec3 dayBot = mix(vec3(0.45, 0.78, 1.05), mix(vec3(0.66, 0.68, 0.7), vec3(0.32, 0.34, 0.37), uRain), overcast);
  vec3 nightTop = vec3(0.012, 0.012, 0.06);
  vec3 nightBot = vec3(0.06, 0.05, 0.14) + vec3(0.03, 0.02, 0.01) * overcast; // town glow
  vec3 top = mix(mix(nightTop, dayTop, day), vec3(0.3, 0.22, 0.7), golden * 0.7);
  vec3 bot = mix(mix(nightBot, dayBot, day), vec3(2.3, 0.7, 0.45), golden * 0.85);
  vec3 col = mix(bot, top, g);

  // ---- sun & moon
  float elev = sin(3.14159 * (h - uRise) / max(1.0, uSet - uRise));
  // Same place the room's sunlight comes from (lib/sky.ts sunZ); p.x runs along -z.
  vec2 sunP = vec2(-(1.3 - golden * 0.6), 0.75 + elev * 2.4);
  float sd = length(p - sunP);
  float sunVis = smoothstep(-0.05, 0.08, elev) * (1.0 - overcast * 0.95);
  col += vec3(3.0, 2.2, 1.4) * smoothstep(0.11, 0.09, sd) * sunVis * 5.0;
  col += vec3(1.4, 0.8, 0.4) * exp(-sd * 2.5) * sunVis * (0.35 + golden);
  vec2 moonP = vec2(1.25, 2.55);
  float md = length(p - moonP);
  float night = 1.0 - day;
  col += vec3(1.6, 1.7, 2.0) * smoothstep(0.075, 0.06, md) * night * (1.0 - overcast) * 1.4;
  col += vec3(0.15, 0.2, 0.35) * exp(-md * 5.0) * night * (1.0 - overcast);

  // ---- stars
  vec2 sg = floor(p * vec2(60.0, 60.0));
  float star = step(0.993, hash(sg)) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(sg + 3.0) * 30.0));
  col += vec3(star) * night * (1.0 - uCloud) * smoothstep(1.3, 2.0, p.y) * 1.6;

  // ---- clouds: big crisp-edged cumulus with sunlit tops and lavender undersides (always a few, as in
  // painted skies; more with real cloud cover)
  vec2 cp = p * vec2(0.45, 1.0) + vec2(uTime * 0.015, 0.0);
  float cover = max(uCloud, 0.62);
  float n = fbm(cp);
  float edge = 1.0 - cover * 0.72;
  float cloud = smoothstep(edge, edge + 0.025, n) * smoothstep(0.8, 1.5, p.y);
  float lit = smoothstep(edge, edge + 0.22, n) * 0.6 + 0.4 * smoothstep(0.9, 2.4, p.y);
  vec3 cloudCol = mix(vec3(0.58, 0.6, 0.86), vec3(1.3, 1.27, 1.22), lit) * mix(0.18, 1.0, day);
  cloudCol = mix(cloudCol, vec3(1.9, 0.95, 0.65), golden * 0.55);
  cloudCol = mix(cloudCol, cloudCol * vec3(0.66, 0.68, 0.72), overcast);
  col = mix(col, cloudCol, cloud * 0.95);
  col += vec3(1.1, 1.15, 1.35) * uFlash * (0.5 + 0.8 * cloud);

  // ---- far foothills (Santa Cruz Mountains)
  float hill = 0.78 + 0.26 * fbm(vec2(p.x * 0.32, 1.7)) + 0.06 * sin(p.x * 0.5 + 1.0);
  if (p.y < hill) {
    vec3 hc = mix(vec3(0.012, 0.016, 0.028), vec3(0.36, 0.45, 0.52), day);
    hc = mix(hc, vec3(0.62, 0.42, 0.42), golden * 0.45);
    hc = mix(hc, bot * 0.92, 0.35 + overcast * 0.3);
    col = hc + vec3(1.0, 0.95, 0.9) * uFlash * 0.2;
  }
  // ---- near tree line with a few houses
  float tree = 0.5 + 0.17 * noise(vec2(p.x * 3.0, 5.0)) + 0.07 * noise(vec2(p.x * 11.0, 9.0)) + 0.03 * noise(vec2(p.x * 31.0, 2.0));
  if (p.y < tree) {
    vec3 tc = mix(vec3(0.003, 0.005, 0.006), vec3(0.075, 0.12, 0.065), day);
    tc *= 0.75 + 0.5 * noise(p * 26.0);
    tc = mix(tc, vec3(0.3, 0.16, 0.08), golden * 0.25);
    col = tc;
    vec2 cell = floor(vec2(p.x * 16.0, p.y * 18.0));
    vec2 f = fract(vec2(p.x * 16.0, p.y * 18.0));
    float win = step(0.3, f.x) * step(f.x, 0.7) * step(0.3, f.y) * step(f.y, 0.75);
    float lit = step(0.955, hash(cell)) * step(p.y, tree - 0.1);
    col += vec3(2.2, 1.4, 0.65) * win * lit * smoothstep(0.6, 0.0, day);
  }

  // ---- weather overlays
  vec3 fogCol = mix(vec3(0.03, 0.035, 0.045), vec3(0.74, 0.76, 0.79), day);
  col = mix(col, fogCol, uFog * (0.45 + 0.5 * smoothstep(1.8, 0.4, p.y)));
  if (uRain > 0.0) {
    col *= 1.0 - 0.2 * uRain;
    // two layers of falling streaks (near = bigger, faster)
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      vec2 rp = vec2(p.x * (30.0 - fk * 12.0) + p.y * 3.0, p.y * (2.4 - fk) + uTime * (6.0 + fk * 3.0) + fk * 7.3);
      vec2 rc = floor(rp);
      vec2 rf = fract(rp);
      float streak = step(1.0 - 0.22 * uRain, hash(rc + fk * 13.0)) * smoothstep(0.1, 0.0, abs(rf.x - 0.5)) * rf.y;
      col = mix(col, mix(vec3(0.3, 0.33, 0.4), vec3(0.78, 0.82, 0.9), day), streak * (0.45 + fk * 0.2));
    }
  }
  if (uSnow > 0.0) {
    vec2 sp = p * 9.0 + vec2(sin(uTime * 0.6 + p.y * 3.0) * 0.35, uTime * 0.9);
    vec2 sc = floor(sp);
    float flake = step(0.82, hash(sc)) * smoothstep(0.14, 0.05, length(fract(sp) - 0.5));
    col = mix(col, vec3(1.1), flake * uSnow);
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms: {
          uHour: { value: 12 },
          uTime: { value: 0 },
          uRise: { value: 7 },
          uSet: { value: 18.6 },
          uCloud: { value: 0 },
          uRain: { value: 0 },
          uFog: { value: 0 },
          uSnow: { value: 0 },
          uFlash: { value: 0 },
        },
      }),
    [],
  );
  const lastUpdate = useRef(-1);
  const nextStrike = useRef(3);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const u = material.uniforms;
    u.uTime.value = t;
    if (t - lastUpdate.current > 0.2 || lastUpdate.current < 0) {
      lastUpdate.current = t;
      const live = liveSky();
      const s = skyState(live.hour, live.weather);
      u.uHour.value = s.hour;
      u.uRise.value = s.sunrise;
      u.uSet.value = s.sunset;
      u.uCloud.value = s.cloud;
      u.uRain.value = s.rain;
      u.uFog.value = s.fog;
      u.uSnow.value = s.snow;
      material.userData.storm = s.storm;
    }
    // Lightning: random double-flashes every few seconds during a storm.
    let flash = lightning.value * Math.exp(-dt * 9);
    if (material.userData.storm && !useStore.getState().reducedMotion) {
      nextStrike.current -= dt;
      if (nextStrike.current < 0) {
        flash = 1;
        nextStrike.current = Math.random() < 0.35 ? 0.12 : 4 + Math.random() * 8;
      }
    }
    lightning.value = flash;
    u.uFlash.value = flash;
  });
  return (
    <mesh position={[ROOM.left - 4, 1.6, 0.25]} rotation={[0, Math.PI / 2, 0]} material={material}>
      <planeGeometry args={[11, 6.5]} />
    </mesh>
  );
}

export function Room() {
  const { z0, z1, y0, y1 } = ROOM.window;
  const lx = ROOM.left - WALL_T / 2;
  const depth = ROOM.front - ROOM.back;
  const zMid = (ROOM.front + ROOM.back) / 2;
  const width = ROOM.right - ROOM.left;
  const floor = useScanned("wood_floor", [width / 2.2, depth / 2.2]);
  const rugTex = useScanned("poly_wool_herringbone", [2.2 / 0.7, 1.5 / 0.7]);
  const xMid = (ROOM.right + ROOM.left) / 2;
  const H = ROOM.height;
  const baseboard = paint("#f4f1ea");

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[xMid, 0, zMid]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial {...floor} />
      </mesh>
      {/* rug */}
      <RoundedBox args={[2.2, 0.012, 1.5]} radius={0.005} position={[0.15, 0.006, 0.55]} receiveShadow>
        <meshStandardMaterial {...rugTex} color="#e8e0d4" />
      </RoundedBox>
      {/* ceiling */}
      {/* a solid slab, so it blocks the sun: daylight only enters through the window */}
      <mesh position={[xMid, H + 0.05, zMid]} castShadow receiveShadow>
        <boxGeometry args={[width + WALL_T * 2, 0.1, depth]} />
        <meshStandardMaterial color="#efebe4" />
      </mesh>
      {/* back wall */}
      <Wall size={[width + WALL_T * 2, H, WALL_T]} position={[xMid, H / 2, ROOM.back - WALL_T / 2]} />
      {/* right wall */}
      <Wall size={[WALL_T, H, depth]} position={[ROOM.right + WALL_T / 2, H / 2, zMid]} />
      {/* left wall, built around the window opening */}
      <Wall size={[WALL_T, y0, depth]} position={[lx, y0 / 2, zMid]} />
      <Wall size={[WALL_T, H - y1, depth]} position={[lx, (H + y1) / 2, zMid]} />
      <Wall size={[WALL_T, y1 - y0, z0 - ROOM.back]} position={[lx, (y0 + y1) / 2, (z0 + ROOM.back) / 2]} />
      <Wall size={[WALL_T, y1 - y0, ROOM.front - z1]} position={[lx, (y0 + y1) / 2, (ROOM.front + z1) / 2]} />
      {/* baseboards */}
      <mesh position={[xMid, 0.05, ROOM.back + 0.008]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.1, 0.016]} />
        <meshStandardMaterial {...baseboard} roughness={1} />
      </mesh>
      <mesh position={[ROOM.left + 0.008, 0.05, zMid]} castShadow receiveShadow>
        <boxGeometry args={[0.016, 0.1, depth]} />
        <meshStandardMaterial {...baseboard} roughness={1} />
      </mesh>
      <Window />
      <Sky />
    </group>
  );
}
