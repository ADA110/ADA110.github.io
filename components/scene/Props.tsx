"use client";

import { Billboard, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { cssVar, paintedTexture, roundRect } from "@/lib/textures";
import { placeClock } from "@/lib/weather";
import { DESK } from "./Desk";
import { useLathe } from "./helpers";
import { cloneScanned, useModel, useShadowClone, withArtwork } from "./pbr";
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

// ---------------- Plants (Poly Haven scans) ----------------

/** Haworthia succulent in a white pot on the desk. */
function DeskPlant() {
  const { scene } = useModel("potted_plant_04");
  const plant = useShadowClone(scene);
  return <primitive object={plant} position={[-0.47, T, -0.4]} rotation={[0, 0.6, 0]} />;
}

/** Arrowhead plant in a terracotta pot, on the floor under the window. */
function FloorPlant() {
  const { scene } = useModel("potted_plant_02");
  const plant = useShadowClone(scene);
  return <primitive object={plant} position={[-1.22, 0, 0.72]} rotation={[0, 2.2, 0]} scale={0.95} />;
}

// ---------------- Picture frame (Poly Haven scan, our own print inside) ----------------

function PictureFrame() {
  const { scene } = useModel("standing_picture_frame_01");
  // The profile photo, printed on a cream mat (drawn into a canvas so it's ready the moment it loads).
  const photo = useMemo(() => {
    const img = new Image();
    const p = paintedTexture(400, 560, (ctx, w, h) => {
      ctx.fillStyle = "#f3efe6";
      ctx.fillRect(0, 0, w, h);
      if (img.complete && img.naturalWidth) ctx.drawImage(img, 34, 34, w - 68, h - 68);
    });
    img.onload = p.redraw;
    img.src = site.photo.portrait;
    p.tex.flipY = false; // glTF UV convention
    return p;
  }, []);
  const frame = useMemo(
    () => cloneScanned(scene, (mesh) => (mesh.material = withArtwork(mesh.material, "standing_picture_frame_01_artwork", photo.tex))),
    [scene, photo],
  );
  return (
    <Hotspot id="about" labelPosition={[0.38, T + 0.01, -0.27]}>
      <primitive object={frame} position={[0.4, T, -0.39]} rotation={[0, -Math.PI / 2 - 0.32, 0]} scale={0.85} />
    </Hotspot>
  );
}

export function Props() {
  return (
    <>
      <Mug />
      <DeskPlant />
      <FloorPlant />
      <Phone />
      <PictureFrame />
    </>
  );
}
