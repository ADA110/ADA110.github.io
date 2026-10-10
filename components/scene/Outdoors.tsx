"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { cssVar, paintedTexture } from "@/lib/textures";
import { Segment } from "./helpers";
import { Hotspot } from "./Hotspot";
import { ROOM } from "./Room";

const WALL = ROOM.back;

// ---------------- kayak paddle leaning in the corner ----------------

function bladeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.018, 0);
  s.bezierCurveTo(-0.03, 0.06, -0.09, 0.16, -0.088, 0.3);
  s.bezierCurveTo(-0.086, 0.4, -0.05, 0.45, 0, 0.45);
  s.bezierCurveTo(0.06, 0.45, 0.082, 0.38, 0.08, 0.28);
  s.bezierCurveTo(0.078, 0.16, 0.03, 0.06, 0.018, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 24 });
  g.translate(0, 0, -0.002);
  return g;
}

function Paddle() {
  const blade = useMemo(bladeGeometry, []);
  const from = new THREE.Vector3(-1.4, 0.005, -0.27);
  const to = new THREE.Vector3(-1.5, 2.2, -0.525);
  const dir = to.clone().sub(from);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const bladeMat = { color: "#f2b31b", roughness: 0.35, metalness: 0.05 } as const;
  return (
    <group position={from} quaternion={quat}>
      {/* lower blade (tip on the floor) */}
      <mesh geometry={blade} position={[0, 0.45, 0]} rotation={[0, 0, Math.PI]} castShadow receiveShadow>
        <meshPhysicalMaterial {...bladeMat} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, len / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.015, 0.015, len - 0.84, 16]} />
        <meshStandardMaterial color="#1a1a1c" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* drip rings */}
      {[0.6, len - 0.6].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.032, 0.006, 8, 24]} />
          <meshStandardMaterial color="#2a2a2c" roughness={0.6} />
        </mesh>
      ))}
      {/* upper blade, feathered 60° like a real paddle */}
      <mesh geometry={blade} position={[0, len - 0.45, 0]} rotation={[0, Math.PI / 3, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial {...bladeMat} clearcoat={0.6} />
      </mesh>
    </group>
  );
}

// ---------------- hiking pack with a sleeping pad strapped on top ----------------

function Backpack() {
  const shell = { color: "#c4552d", roughness: 0.85 } as const;
  const dark = { color: "#2b2f33", roughness: 0.8 } as const;
  return (
    <group position={[-1.08, 0, WALL + 0.15]} rotation={[-0.12, 0.18, 0]}>
      <RoundedBox args={[0.32, 0.56, 0.22]} radius={0.07} smoothness={5} position={[0, 0.29, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...shell} />
      </RoundedBox>
      {/* lid */}
      <RoundedBox args={[0.3, 0.09, 0.21]} radius={0.04} smoothness={4} position={[0, 0.58, 0.01]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#a8441f" roughness={0.85} />
      </RoundedBox>
      {/* front stretch pocket */}
      <RoundedBox args={[0.24, 0.26, 0.05]} radius={0.022} position={[0, 0.2, 0.11]} castShadow receiveShadow>
        <meshStandardMaterial {...dark} />
      </RoundedBox>
      {/* side bottle pocket + bottle */}
      <RoundedBox args={[0.05, 0.14, 0.1]} radius={0.02} position={[0.165, 0.12, 0.02]} castShadow>
        <meshStandardMaterial {...dark} />
      </RoundedBox>
      <mesh position={[0.17, 0.22, 0.02]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.17, 20]} />
        <meshPhysicalMaterial color="#3a8f8a" roughness={0.2} metalness={0.6} clearcoat={0.6} />
      </mesh>
      {/* compression straps */}
      {[0.34, 0.46].map((y) => (
        <mesh key={y} position={[0, y, 0.112]}>
          <boxGeometry args={[0.33, 0.018, 0.006]} />
          <meshStandardMaterial color="#141414" roughness={0.7} />
        </mesh>
      ))}
      {/* carabiner */}
      <mesh position={[-0.12, 0.47, 0.118]} rotation={[0, 0, 0.3]} castShadow>
        <torusGeometry args={[0.018, 0.0035, 8, 24]} />
        <meshStandardMaterial color="#c7c9cc" roughness={0.2} metalness={1} />
      </mesh>
      {/* rolled sleeping pad on top */}
      <mesh position={[0, 0.69, 0.0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.4, 32]} />
        <meshStandardMaterial color="#4b6b3c" roughness={0.9} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.69, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.067, 0.067, 0.02, 32]} />
          <meshStandardMaterial color="#141414" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------- hiking boots ----------------

function Boot({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const leather = { color: "#6b4529", roughness: 0.78 } as const;
  const suede = { color: "#8a6a4a", roughness: 0.95 } as const;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* lugged rubber sole */}
      <RoundedBox args={[0.11, 0.032, 0.29]} radius={0.013} position={[0, 0.016, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#231f1c" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.112, 0.012, 0.286]} radius={0.005} position={[0, 0.035, 0]} castShadow>
        <meshStandardMaterial color="#b3492a" roughness={0.7} />
      </RoundedBox>
      {/* foot */}
      <RoundedBox args={[0.1, 0.075, 0.25]} radius={0.036} smoothness={4} position={[0, 0.075, -0.012]} castShadow receiveShadow>
        <meshStandardMaterial {...leather} />
      </RoundedBox>
      {/* rubber toe cap */}
      <RoundedBox args={[0.104, 0.04, 0.07]} radius={0.018} position={[0, 0.058, -0.112]} castShadow>
        <meshStandardMaterial color="#2b2623" roughness={0.85} />
      </RoundedBox>
      {/* ankle shaft */}
      <RoundedBox args={[0.096, 0.14, 0.115]} radius={0.04} smoothness={4} position={[0, 0.16, 0.06]} rotation={[-0.08, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...suede} />
      </RoundedBox>
      {/* padded collar */}
      <mesh position={[0, 0.235, 0.068]} rotation={[Math.PI / 2 - 0.1, 0, 0]} castShadow>
        <torusGeometry args={[0.04, 0.012, 10, 28]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.9} />
      </mesh>
      {/* tongue + laces */}
      <RoundedBox args={[0.05, 0.012, 0.13]} radius={0.005} position={[0, 0.12, -0.02]} rotation={[0.45, 0, 0]} castShadow>
        <meshStandardMaterial color="#5a3a22" roughness={0.9} />
      </RoundedBox>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, 0.105 + i * 0.022, -0.06 + i * 0.026]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.062, 0.004, 0.005]} />
          <meshStandardMaterial color="#c9372c" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------- topographic trail map on the wall ----------------

function TrailMap() {
  const map = useMemo(
    () =>
      paintedTexture(420, 560, (ctx, w, h) => {
        // contour lines from a smooth height field
        const img = ctx.createImageData(w, h);
        const n = (x: number, y: number) =>
          Math.sin(x * 0.013 + Math.sin(y * 0.011) * 1.7) * 0.35 +
          Math.sin(y * 0.017 + Math.cos(x * 0.009) * 2.1) * 0.35 +
          Math.sin((x + y) * 0.006) * 0.3;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const v = n(x, y);
            const i = (y * w + x) * 4;
            let r = 241, g = 234, b = 216;
            if (v < -0.55) [r, g, b] = [173, 205, 222]; // lake
            else if (v > 0.15) [r, g, b] = [222, 228, 200]; // forest tint
            const level = (v + 1) * 14;
            const f = Math.abs(level - Math.round(level));
            const major = Math.round(level) % 5 === 0;
            if (f < (major ? 0.09 : 0.05) && v >= -0.55) [r, g, b] = major ? [150, 104, 70] : [190, 150, 115];
            img.data[i] = r;
            img.data[i + 1] = g;
            img.data[i + 2] = b;
            img.data[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        // trail
        ctx.strokeStyle = "#d1342a";
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(40, 470);
        ctx.bezierCurveTo(120, 420, 90, 330, 190, 300);
        ctx.bezierCurveTo(290, 270, 250, 170, 340, 110);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#d1342a";
        ctx.beginPath();
        ctx.moveTo(340, 92);
        ctx.lineTo(352, 116);
        ctx.lineTo(328, 116);
        ctx.fill();
        // title block
        ctx.fillStyle = "rgba(241,234,216,0.92)";
        ctx.fillRect(0, h - 74, w, 74);
        ctx.fillStyle = "#3a2a1e";
        ctx.font = `400 34px ${cssVar("--font-serif", "serif")}`;
        ctx.fillText("Out There", 22, h - 32);
        ctx.font = `500 13px ${cssVar("--font-geist-mono", "monospace")}`;
        ctx.fillStyle = "#7a6650";
        ctx.fillText("37.44° N · 122.14° W", 22, h - 12);
        ctx.textAlign = "right";
        ctx.fillText(site.outdoors.activities.map((a) => a.name).join(" · ").toUpperCase(), w - 22, h - 12);
      }),
    [],
  );
  const W = 0.4;
  const H = 0.53;
  return (
    <group position={[0.64, 1.6, WALL + 0.012]}>
      <RoundedBox args={[W + 0.03, H + 0.03, 0.02]} radius={0.004} castShadow receiveShadow>
        <meshStandardMaterial color="#1b1b1b" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0105]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={map.tex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[W, H]} />
        <meshPhysicalMaterial transparent opacity={0.08} roughness={0.04} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------- camping lantern on the windowsill (glows when the lamp is off) ----------------

function Lantern() {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const level = useRef(0);
  useFrame((s, dt) => {
    const goal = useStore.getState().lampOn ? 0.15 : 1;
    level.current += (goal - level.current) * (1 - Math.exp(-3 * dt));
    const flicker = 0.92 + 0.08 * Math.sin(s.clock.elapsedTime * 13) * Math.sin(s.clock.elapsedTime * 7.3);
    if (glow.current) glow.current.emissiveIntensity = level.current * 5 * flicker;
    if (light.current) light.current.intensity = level.current * 0.35 * flicker;
  });
  const green = { color: "#2f5a3c", roughness: 0.45, metalness: 0.6 } as const;
  return (
    <group position={[-1.53, ROOM.window.y0 + 0.003, 0.58]}>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.04, 0.045, 0.03, 24]} />
        <meshStandardMaterial {...green} />
      </mesh>
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.09, 24, 1, true]} />
        <meshPhysicalMaterial color="#fff6e8" transparent opacity={0.35} roughness={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 12]} />
        <meshStandardMaterial ref={glow} color="#ffd9a0" emissive="#ffb35c" emissiveIntensity={0} />
      </mesh>
      {[-1, 1].map((s) => (
        <Segment key={s} from={[s * 0.034, 0.03, 0]} to={[s * 0.034, 0.12, 0]} radius={0.003}>
          <meshStandardMaterial {...green} />
        </Segment>
      ))}
      <mesh position={[0, 0.128, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.042, 0.02, 24]} />
        <meshStandardMaterial {...green} />
      </mesh>
      <mesh position={[0, 0.155, 0]}>
        <torusGeometry args={[0.028, 0.003, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#b9bcc0" metalness={1} roughness={0.3} />
      </mesh>
      <pointLight ref={light} position={[0, 0.08, 0.05]} color="#ffb35c" intensity={0} distance={2.5} decay={2} />
    </group>
  );
}

export function Outdoors() {
  return (
    <>
      <Hotspot id="outdoors" labelPosition={[-1.12, 0.9, -0.3]} lift={0}>
        <Paddle />
        <Backpack />
        <Boot position={[-1.17, 0, -0.05]} rotation={Math.PI + 0.35} />
        <Boot position={[-0.99, 0, 0.02]} rotation={Math.PI - 0.12} />
        <TrailMap />
      </Hotspot>
      <Lantern />
    </>
  );
}
