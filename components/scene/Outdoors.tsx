"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { cssVar, paintedTexture } from "@/lib/textures";
import { Hotspot } from "./Hotspot";
import { cloneScanned, useModel, useScanned, useShadowClone, withArtwork } from "./pbr";
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
  const wool = useScanned("caban", [1.5, 2]);
  const shell = { ...wool, color: "#e07a4f" } as const;
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
  const hide = useScanned("brown_leather", [0.6, 0.6]);
  const leather = { ...hide } as const;
  const suede = { ...hide, color: "#b08a66" } as const;
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

// ---------------- painted Seattle skyline on the wall (Kerry Park view: Space Needle, downtown, Rainier) ----------------

function SeattlePrint() {
  const map = useMemo(
    () =>
      // The frame's artwork UVs only use u 0.165 to 0.835, so the canvas is wider than the print
      // and the 420×622 painting is centred in the part that shows.
      paintedTexture(626, 622, (ctx, W, h) => {
        const w = 420;
        ctx.save(); // redrawn once fonts load, so the offset must not accumulate
        ctx.translate((W - w) / 2, 0);
        const horizon = 432;
        const art = h - 74;
        // sky
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "#7fa9d6");
        sky.addColorStop(0.55, "#b9cfe6");
        sky.addColorStop(1, "#f4d9bd");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon);
        // soft cumulus
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        for (const [cx, cy, r] of [
          [60, 92, 26], [92, 80, 32], [128, 94, 24], [300, 60, 22], [330, 50, 30], [366, 62, 22], [250, 150, 16], [272, 144, 20],
        ]) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Mount Rainier
        ctx.fillStyle = "#a9b4d4";
        ctx.beginPath();
        ctx.moveTo(110, horizon);
        ctx.bezierCurveTo(200, 360, 250, 260, 296, 246);
        ctx.bezierCurveTo(334, 258, 390, 350, 470, horizon);
        ctx.fill();
        ctx.fillStyle = "#f7f6fb";
        ctx.beginPath();
        ctx.moveTo(240, 300);
        ctx.bezierCurveTo(262, 270, 280, 252, 296, 246);
        ctx.bezierCurveTo(318, 254, 340, 280, 356, 306);
        ctx.lineTo(340, 300);
        ctx.lineTo(326, 316);
        ctx.lineTo(310, 298);
        ctx.lineTo(294, 318);
        ctx.lineTo(278, 300);
        ctx.lineTo(262, 314);
        ctx.closePath();
        ctx.fill();
        // downtown towers
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const towers: [number, number, number, string][] = [
          [150, 22, 372, "#6f7fa3"], [170, 18, 352, "#61719a"], [186, 26, 330, "#7486ab"], [210, 20, 300, "#566690"],
          [228, 30, 268, "#4b5a82"], [256, 22, 316, "#6a7aa1"], [276, 26, 290, "#5d6d96"], [300, 20, 338, "#7383a8"],
          [318, 28, 306, "#56658e"], [344, 22, 350, "#6c7ca2"], [364, 30, 366, "#5f6f97"], [392, 28, 384, "#7081a6"],
        ];
        for (const [x, bw, top, c] of towers) {
          ctx.fillStyle = c;
          ctx.fillRect(x, top, bw, horizon - top);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(x, top, bw * 0.35, horizon - top);
          ctx.fillStyle = "rgba(255,236,180,0.75)";
          for (let wy = top + 8; wy < horizon - 6; wy += 9)
            for (let wx = x + 4; wx < x + bw - 4; wx += 6) if (rand() < 0.22) ctx.fillRect(wx, wy, 2.5, 3.5);
        }
        // Space Needle
        const nx = 104;
        ctx.fillStyle = "#c8c2b8";
        ctx.beginPath();
        ctx.moveTo(nx - 38, horizon + 4);
        ctx.quadraticCurveTo(nx - 6, 300, nx - 18, 190);
        ctx.lineTo(nx + 18, 190);
        ctx.quadraticCurveTo(nx + 6, 300, nx + 38, horizon + 4);
        ctx.lineTo(nx + 22, horizon + 4);
        ctx.quadraticCurveTo(nx + 2, 320, nx, 300);
        ctx.quadraticCurveTo(nx - 2, 320, nx - 22, horizon + 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#eee9e0";
        ctx.fillRect(nx - 3, 190, 6, horizon - 186);
        // elevator core highlight and the halo ring
        ctx.strokeStyle = "#eee9e0";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(nx, 318, 12, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        // saucer: observation deck, roof, spire
        ctx.fillStyle = "#d9d2c6";
        ctx.beginPath();
        ctx.ellipse(nx, 182, 50, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4efe6";
        ctx.beginPath();
        ctx.ellipse(nx, 176, 46, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e3a548";
        ctx.beginPath();
        ctx.moveTo(nx - 40, 172);
        ctx.quadraticCurveTo(nx, 146, nx + 40, 172);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#d9d2c6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(nx, 156);
        ctx.lineTo(nx, 74);
        ctx.stroke();
        // Elliott Bay
        const bay = ctx.createLinearGradient(0, horizon, 0, art);
        bay.addColorStop(0, "#7e9fc4");
        bay.addColorStop(1, "#3e5d86");
        ctx.fillStyle = bay;
        ctx.fillRect(0, horizon, w, art - horizon);
        ctx.fillStyle = "rgba(255,240,210,0.45)";
        for (let i = 0; i < 26; i++) ctx.fillRect(140 + rand() * 260, horizon + 6 + rand() * 90, 10 + rand() * 26, 2);
        // Kerry Park evergreens framing the bottom corners
        ctx.fillStyle = "#2f4a3a";
        for (const [tx, ty, tw] of [[-10, 470, 60], [30, 500, 48], [370, 480, 56], [404, 456, 50]]) {
          ctx.beginPath();
          ctx.moveTo(tx, art);
          ctx.lineTo(tx + tw / 2, ty);
          ctx.lineTo(tx + tw, art);
          ctx.fill();
        }
        // title block
        ctx.fillStyle = "rgba(241,234,216,0.94)";
        ctx.fillRect(0, art, w, 74);
        ctx.fillStyle = "#3a2a1e";
        ctx.font = `400 34px ${cssVar("--font-serif", "serif")}`;
        ctx.fillText("Seattle", 22, h - 32);
        ctx.font = `500 13px ${cssVar("--font-geist-mono", "monospace")}`;
        ctx.fillStyle = "#7a6650";
        ctx.fillText("47.62° N · 122.35° W", 22, h - 12);
        ctx.textAlign = "right";
        ctx.fillText("HOMETOWN", w - 22, h - 12);
        ctx.restore();
      }),
    [],
  );
  const { scene } = useModel("hanging_picture_frame_01");
  const frame = useMemo(() => {
    map.tex.flipY = false; // glTF UV convention
    return cloneScanned(scene, (mesh) => (mesh.material = withArtwork(mesh.material, "hanging_picture_frame_01_artwork", map.tex)));
  }, [scene, map]);
  return <primitive object={frame} position={[0.64, 1.6, WALL + 0.001]} scale={0.62} />;
}

// ---------------- Cal + Stanford: a small framed print under the Seattle one ----------------

/** Two school panels side by side, drawn in school colours (not the official marks). */
function SchoolsPrint() {
  const art = useMemo(
    () =>
      paintedTexture(640, 300, (ctx, w, h) => {
        const serif = cssVar("--font-serif", "serif");
        const hand = cssVar("--font-hand", "cursive");
        ctx.fillStyle = "#efe7d6"; // mat
        ctx.fillRect(0, 0, w, h);
        const pw = (w - 3 * 22) / 2;
        const ph = h - 44;
        // Cal: gold script on Berkeley blue
        ctx.fillStyle = "#0f2f57";
        ctx.fillRect(22, 22, pw, ph);
        ctx.fillStyle = "#f2b632";
        ctx.textAlign = "center";
        ctx.font = `700 132px ${hand}`;
        ctx.fillText("Cal", 22 + pw / 2, 22 + ph * 0.62);
        ctx.font = `600 22px ${serif}`;
        ctx.fillText("B E R K E L E Y", 22 + pw / 2, 22 + ph * 0.86);
        // Stanford: a little redwood over the name, white on cardinal
        const x0 = 44 + pw;
        ctx.fillStyle = "#8c1d1d";
        ctx.fillRect(x0, 22, pw, ph);
        const cx = x0 + pw / 2;
        ctx.fillStyle = "#2f6b3f";
        for (let k = 0; k < 4; k++) {
          const top = 40 + k * 22;
          const half = 22 + k * 11;
          ctx.beginPath();
          ctx.moveTo(cx, top);
          ctx.lineTo(cx + half, top + 46);
          ctx.lineTo(cx - half, top + 46);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "#5a3a22";
        ctx.fillRect(cx - 5, 150, 10, 16);
        ctx.fillStyle = "#fbf7ef";
        ctx.font = `400 58px ${serif}`;
        ctx.fillText("Stanford", cx, 22 + ph * 0.86);
      }),
    [],
  );
  const W = 0.34;
  const H = (W * 300) / 640;
  return (
    <group position={[0.64, 1.24, WALL + 0.012]}>
      <RoundedBox args={[W + 0.03, H + 0.03, 0.02]} radius={0.004} castShadow receiveShadow>
        <meshStandardMaterial color="#3b2a1d" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0105]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={art.tex} roughness={0.85} />
      </mesh>
    </group>
  );
}

// ---------------- brass hurricane lantern on the windowsill (glows when the lamp is off) ----------------

function Lantern() {
  const { scene } = useModel("Lantern_01");
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.MeshStandardMaterial>(null);
  const level = useRef(0);
  const lantern = useShadowClone(scene);
  useFrame((s, dt) => {
    const goal = useStore.getState().lampOn ? 0.12 : 1;
    level.current += (goal - level.current) * (1 - Math.exp(-3 * dt));
    const flicker = 0.9 + 0.1 * Math.sin(s.clock.elapsedTime * 13) * Math.sin(s.clock.elapsedTime * 7.3);
    if (flame.current) flame.current.emissiveIntensity = level.current * 8 * flicker;
    if (light.current) light.current.intensity = level.current * 0.4 * flicker;
  });
  return (
    <group position={[-1.53, ROOM.window.y0 + 0.003, 0.58]} rotation={[0, 0.8, 0]} scale={0.8}>
      <primitive object={lantern} />
      {/* wick flame */}
      <mesh position={[0, 0.1, 0]} scale={[1, 1.8, 1]}>
        <sphereGeometry args={[0.008, 16, 12]} />
        <meshStandardMaterial ref={flame} color="#ffcf8a" emissive="#ffa23c" emissiveIntensity={0} />
      </mesh>
      <pointLight ref={light} position={[0, 0.11, 0.04]} color="#ffb35c" intensity={0} distance={2.5} decay={2} />
    </group>
  );
}

export function Outdoors() {
  return (
    <>
      <Hotspot id="outdoors" labelPosition={[-1.12, 0.9, -0.3]} lift={0}>
        <Paddle />
        <Backpack />
        <Boot position={[-1.17, 0, -0.14]} rotation={Math.PI + 0.35} />
        <Boot position={[-0.99, 0, -0.1]} rotation={Math.PI - 0.12} />
        <SeattlePrint />
      </Hotspot>
      <SchoolsPrint />
      <Lantern />
    </>
  );
}
