"use client";

import { Billboard, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { cssVar, paintedTexture, roundRect, terracotta } from "@/lib/textures";
import { placeClock } from "@/lib/weather";
import { DESK } from "./Desk";
import { useLathe } from "./helpers";
import { Hotspot } from "./Hotspot";

const T = DESK.top;

// ---------------- Mug + steam ----------------

const steamFrag = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
void main(){
  vec2 uv = vUv;
  float t = uTime * 0.35 + uSeed * 10.0;
  float x = uv.x - 0.5 + (noise(vec2(uv.y * 3.0 - t, uSeed)) - 0.5) * 0.5 * uv.y;
  float n = noise(vec2(x * 6.0, uv.y * 4.0 - t * 1.6)) * noise(vec2(x * 3.0 + 4.0, uv.y * 2.0 - t));
  float shape = smoothstep(0.32, 0.0, abs(x)) * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.45, uv.y);
  float a = smoothstep(0.12, 0.55, n) * shape * uOpacity;
  gl_FragColor = vec4(vec3(1.0), a);
}
`;
const steamVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function Steam() {
  const mats = useMemo(
    () =>
      [0, 1].map(
        (i) =>
          new THREE.ShaderMaterial({
            vertexShader: steamVert,
            fragmentShader: steamFrag,
            transparent: true,
            depthWrite: false,
            uniforms: { uTime: { value: 0 }, uSeed: { value: i * 0.37 + 0.1 }, uOpacity: { value: 0.22 } },
          }),
      ),
    [],
  );
  useFrame((s) => mats.forEach((m) => (m.uniforms.uTime.value = s.clock.elapsedTime)));
  return (
    <Billboard position={[0, 0.17, 0]} lockX lockZ>
      {mats.map((m, i) => (
        <mesh key={i} material={m} position={[i * 0.006 - 0.003, 0, i * 0.002]} renderOrder={10}>
          <planeGeometry args={[0.07, 0.16]} />
        </mesh>
      ))}
    </Billboard>
  );
}

function Mug() {
  const body = useLathe([
    [0.0, 0.009],
    [0.034, 0.009],
    [0.0365, 0.014],
    [0.0365, 0.094],
    [0.0385, 0.0975],
    [0.0405, 0.094],
    [0.0405, 0.008],
    [0.038, 0.0],
    [0.0, 0.0],
  ]);
  const handle = useMemo(() => new THREE.TorusGeometry(0.025, 0.0058, 16, 32, Math.PI), []);
  return (
    <group position={[0.57, T, 0.14]} rotation={[0, -0.6, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial color="#e7ddcc" roughness={0.25} clearcoat={1} clearcoatRoughness={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={handle} position={[0.039, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <meshPhysicalMaterial color="#e7ddcc" roughness={0.25} clearcoat={1} clearcoatRoughness={0.08} />
      </mesh>
      {/* coffee */}
      <mesh position={[0, 0.078, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0365, 40]} />
        <meshPhysicalMaterial color="#2b170b" roughness={0.08} clearcoat={1} />
      </mesh>
      <Steam />
    </group>
  );
}

// ---------------- Snake plant ----------------

function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 2, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const t = p.getY(i) + 0.5; // 0 at base, 1 at tip
    const width = Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.92 + 0.25), 0.8) * (1 - Math.pow(t, 4));
    // V-shaped cross-section gives the leaf a crease.
    p.setXYZ(i, x * width, t, -Math.abs(x) * 0.25 * width + t * t * 0.18);
  }
  g.computeVertexNormals();
  return g;
}

function Plant() {
  const geom = useMemo(leafGeometry, []);
  const leafTex = useMemo(
    () =>
      paintedTexture(128, 512, (ctx, w, h) => {
        ctx.fillStyle = "#2f5a2c";
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 6) {
          const wave = Math.sin(y * 0.09) * 10 + Math.sin(y * 0.031) * 18;
          ctx.fillStyle = `rgba(${150 + (y % 30)}, ${190 + (y % 20)}, 120, ${0.25 + ((y * 7) % 13) / 60})`;
          ctx.fillRect(0, y + wave * 0.1, w, 2 + (y % 3));
        }
        ctx.fillStyle = "#c8b84f";
        ctx.fillRect(0, 0, 9, h);
        ctx.fillRect(w - 9, 0, 9, h);
      }).tex,
    [],
  );
  const leaves = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2 + (i % 3) * 0.3;
        return {
          rotY: a,
          tilt: 0.08 + (i % 4) * 0.06,
          h: 0.22 + ((i * 37) % 11) / 11 * 0.16,
          w: 0.034 + (i % 3) * 0.006,
          r: 0.012 + (i % 2) * 0.012,
          phase: i * 1.7,
        };
      }),
    [],
  );
  const group = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!group.current || useStore.getState().reducedMotion) return;
    group.current.children.forEach((c, i) => {
      c.rotation.z = Math.sin(s.clock.elapsedTime * 0.8 + leaves[i].phase) * 0.012;
    });
  });
  const pot = useLathe([
    [0.0, 0.0],
    [0.04, 0.0],
    [0.043, 0.004],
    [0.05, 0.085],
    [0.056, 0.088],
    [0.056, 0.104],
    [0.05, 0.106],
    [0.047, 0.1],
  ]);
  const terra = terracotta();
  return (
    <group position={[-0.47, T, -0.4]}>
      <mesh geometry={pot} castShadow receiveShadow>
        <meshStandardMaterial {...terra} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.094, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.048, 32]} />
        <meshStandardMaterial color="#2a1d14" roughness={1} />
      </mesh>
      <group ref={group} position={[0, 0.09, 0]}>
        {leaves.map((l, i) => (
          <group key={i} rotation={[0, l.rotY, 0]}>
            <mesh
              geometry={geom}
              position={[l.r, 0, 0]}
              rotation={[l.tilt, 0, 0]}
              scale={[l.w, l.h, 0.06]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial map={leafTex} roughness={0.45} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------------- Headphones on a stand ----------------

function Headphones() {
  const R = 0.085;
  const band = useMemo(() => new THREE.TorusGeometry(R, 0.0075, 14, 64, Math.PI), []);
  const cushion = useMemo(() => new THREE.TorusGeometry(R - 0.009, 0.007, 12, 48, Math.PI * 0.6), []);
  const pad = useMemo(() => new THREE.TorusGeometry(0.033, 0.011, 16, 40), []);
  const shell = { color: "#d6cfc4", roughness: 0.55, metalness: 0.05 } as const;
  const leather = { color: "#bcb3a6", roughness: 0.75 } as const;
  const top = T + 0.27;
  return (
    <Hotspot id="music" labelPosition={[0.66, top + 0.06, -0.24]}>
      <group position={[0.66, T, -0.24]} rotation={[0, -0.35, 0]}>
        {/* stand */}
        <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.058, 0.012, 40]} />
          <meshStandardMaterial color="#2b2622" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.135, 0]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.26, 16]} />
          <meshStandardMaterial color="#2b2622" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.265, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.012, 0.05, 6, 16]} />
          <meshStandardMaterial color="#5a4636" roughness={0.6} />
        </mesh>
        {/* headphones */}
        <group position={[0, 0.277 - R, 0]}>
          <mesh geometry={band} castShadow>
            <meshStandardMaterial color="#b9b3aa" roughness={0.3} metalness={0.9} />
          </mesh>
          <mesh geometry={cushion} rotation={[0, 0, Math.PI * 0.2]} castShadow>
            <meshStandardMaterial {...leather} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * R, -0.045, 0]} rotation={[0, 0, s * 0.06]}>
              {/* yoke */}
              <mesh position={[0, 0.03, 0]} castShadow>
                <boxGeometry args={[0.008, 0.035, 0.012]} />
                <meshStandardMaterial {...shell} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                <cylinderGeometry args={[0.044, 0.042, 0.026, 40]} />
                <meshStandardMaterial {...shell} />
              </mesh>
              <mesh geometry={pad} position={[-s * 0.016, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
                <meshStandardMaterial {...leather} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </Hotspot>
  );
}

// ---------------- Phone ----------------

function Phone() {
  const awake = useRef(0);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const screen = useMemo(
    () =>
      paintedTexture(360, 760, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#1f3c88");
        g.addColorStop(0.55, "#6b3fa0");
        g.addColorStop(1, "#e2683c");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const clock = placeClock();
        const sans = cssVar("--font-geist-sans", "sans-serif");
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.textAlign = "center";
        ctx.font = `500 22px ${sans}`;
        ctx.fillText(clock.date, w / 2, 130);
        ctx.font = `700 104px ${sans}`;
        ctx.fillText(clock.time, w / 2, 238);
        // notification
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        roundRect(ctx, 22, 300, w - 44, 112, 22);
        ctx.fill();
        ctx.textAlign = "left";
        ctx.fillStyle = "#111";
        ctx.font = `700 20px ${sans}`;
        ctx.fillText("Messages", 44, 338);
        ctx.font = `400 20px ${sans}`;
        ctx.fillText(`Say hi to ${site.name.split(" ")[0]} 👋`, 44, 368);
        ctx.fillStyle = "#555";
        ctx.font = `400 16px ${sans}`;
        ctx.fillText("Tap to get in touch", 44, 394);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        roundRect(ctx, w / 2 - 70, h - 24, 140, 6, 3);
        ctx.fill();
      }),
    [],
  );
  useFrame((s, dt) => {
    const { hovered, section } = useStore.getState();
    const goal = hovered === "contact" || section === "contact" ? 1 : 0.05;
    awake.current += (goal - awake.current) * (1 - Math.exp(-6 * dt));
    if (mat.current) mat.current.emissiveIntensity = awake.current * 0.95;
    if (Math.floor(s.clock.elapsedTime) % 20 === 0 && s.clock.elapsedTime % 1 < dt) screen.redraw();
  });
  return (
    <Hotspot id="contact" labelPosition={[-0.4, T + 0.08, 0.15]}>
      <group position={[-0.4, T, 0.16]} rotation={[0, 0.38, 0]}>
        <RoundedBox args={[0.0715, 0.0078, 0.147]} radius={0.0035} smoothness={4} position={[0, 0.0039, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#3a3c40" roughness={0.3} metalness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.0079, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.0675, 0.143]} />
          <meshStandardMaterial ref={mat} color="#050505" roughness={0.08} emissive="#ffffff" emissiveMap={screen.tex} emissiveIntensity={0} />
        </mesh>
      </group>
    </Hotspot>
  );
}

// ---------------- Picture frame ----------------

function PictureFrame() {
  const photo = useMemo(
    () =>
      paintedTexture(400, 520, (ctx, w, h) => {
        ctx.fillStyle = "#f3efe6";
        ctx.fillRect(0, 0, w, h);
        // inner print
        const g = ctx.createLinearGradient(0, 40, 0, h - 40);
        g.addColorStop(0, "#284b8f");
        g.addColorStop(1, "#d9643a");
        ctx.fillStyle = g;
        ctx.fillRect(40, 40, w - 80, h - 80);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.textAlign = "center";
        ctx.font = `400 150px ${cssVar("--font-serif", "serif")}`;
        ctx.fillText(site.initials, w / 2, h / 2 + 50);
        ctx.font = `400 22px ${cssVar("--font-geist-sans", "sans-serif")}`;
        ctx.fillText("photo coming soon", w / 2, h - 80);
      }),
    [],
  );
  const W = 0.13;
  const H = 0.17;
  const D = 0.016;
  const b = 0.014;
  const wood = { color: "#2a1a10", roughness: 0.45, metalness: 0 } as const;
  return (
    <Hotspot id="about" labelPosition={[0.38, T + 0.01, -0.27]}>
      <group position={[0.4, T, -0.38]} rotation={[0, -0.32, 0]}>
        <group position={[0, H / 2 + 0.002, 0]} rotation={[-0.16, 0, 0]}>
          {[
            [0, H / 2 - b / 2, W, b],
            [0, -H / 2 + b / 2, W, b],
            [W / 2 - b / 2, 0, b, H],
            [-W / 2 + b / 2, 0, b, H],
          ].map(([x, y, w, h], i) => (
            <RoundedBox key={i} args={[w, h, D]} radius={0.002} position={[x, y, 0]} castShadow receiveShadow>
              <meshStandardMaterial {...wood} />
            </RoundedBox>
          ))}
          <mesh position={[0, 0, -0.002]}>
            <planeGeometry args={[W - b * 2 + 0.002, H - b * 2 + 0.002]} />
            <meshStandardMaterial map={photo.tex} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[W - b * 2, H - b * 2]} />
            <meshPhysicalMaterial transparent opacity={0.1} roughness={0.03} depthWrite={false} />
          </mesh>
          {/* back panel + easel */}
          <mesh position={[0, 0, -0.007]}>
            <boxGeometry args={[W - 0.004, H - 0.004, 0.003]} />
            <meshStandardMaterial color="#3b2a1d" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.02, -0.04]} rotation={[0.45, 0, 0]} castShadow>
            <boxGeometry args={[0.03, 0.12, 0.004]} />
            <meshStandardMaterial color="#3b2a1d" roughness={0.9} />
          </mesh>
        </group>
      </group>
    </Hotspot>
  );
}

export function Props() {
  return (
    <>
      <Mug />
      <Plant />
      <Headphones />
      <Phone />
      <PictureFrame />
    </>
  );
}
