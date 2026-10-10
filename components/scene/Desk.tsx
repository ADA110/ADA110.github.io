"use client";

import { RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cssVar, paintedTexture } from "@/lib/textures";
import { Cable } from "./helpers";
import { useModel, useScanned } from "./pbr";

export const DESK = { top: 0.75, width: 1.6, depth: 0.75, z: -0.16, thickness: 0.035 };

const steel = { color: "#1b1b1d", roughness: 0.42, metalness: 0.85 } as const;

function Legs() {
  const { width, depth, z, top, thickness } = DESK;
  const h = top - thickness;
  const xs = [-width / 2 + 0.06, width / 2 - 0.06];
  return (
    <group>
      {xs.map((x) => (
        <group key={x} position={[x, 0, z]}>
          {/* sled frame: two uprights, top + foot rails */}
          {[-depth / 2 + 0.08, depth / 2 - 0.08].map((dz) => (
            <mesh key={dz} position={[0, h / 2, dz]} castShadow receiveShadow>
              <boxGeometry args={[0.04, h, 0.04]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          ))}
          <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.024, depth - 0.1]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.04, depth - 0.1]} />
            <meshStandardMaterial {...steel} />
          </mesh>
        </group>
      ))}
      {/* back stretcher */}
      <mesh position={[0, h - 0.06, z - depth / 2 + 0.08]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.12, 0.05, 0.02]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
  );
}

// Keyboard rows: widths in key units. 0 = small gap.
const ROWS: number[][] = [
  [1, 0.5, 1, 1, 1, 1, 0.25, 1, 1, 1, 1, 0.25, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
];

// Printed legends, one per key (gaps in the function row are skipped).
const LEGENDS: string[][] = [
  ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
  ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
  ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"],
  ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"],
  ["ctrl", "opt", "cmd", "", "cmd", "opt", "fn", "ctrl"],
];

function Keyboard() {
  const U = 0.019;
  const keys = useMemo(() => {
    const out: { x: number; z: number; w: number; mod: boolean; label: string }[] = [];
    ROWS.forEach((row, r) => {
      let x = 0;
      let n = 0;
      const z = r * U + (r === 0 ? -0.004 : 0);
      row.forEach((w, i) => {
        if (w < 0.6 && r === 0 && i > 0) {
          x += w * U;
          return;
        }
        out.push({ x: x + (w * U) / 2, z, w, mod: w > 1.2 || (r === 0 && i === 0) || r === 5, label: LEGENDS[r][n++] ?? "" });
        x += w * U;
      });
    });
    return out;
  }, []);
  // Legends are painted onto one transparent sheet laid exactly over the key tops.
  const sheet = useMemo(() => {
    const W = 15 * U + 0.004;
    const zMin = -2.5 * U - 0.004 - U / 2;
    const D = 6 * U + 0.006;
    const px = 2048 / W;
    const py = 1024 / D; // power-of-two canvas; text is squashed back to square below
    const t = paintedTexture(2048, 1024, (ctx) => {
      const sans = cssVar("--font-geist-sans", "sans-serif");
      ctx.textBaseline = "top";
      for (const k of keys) {
        if (!k.label) continue;
        const kx = (k.x - (15 * U) / 2 + W / 2 - (k.w * U) / 2 + 0.0034) * px;
        const kz = (k.z - 2.5 * U - zMin - U / 2 + 0.003) * py;
        const single = k.label.length === 1;
        ctx.save();
        ctx.translate(kx, kz);
        ctx.scale(1, py / px);
        ctx.font = `600 ${single ? 56 : 30}px ${sans}`;
        ctx.fillStyle = k.mod ? "rgba(250,250,250,0.95)" : "rgba(30,30,34,0.95)";
        ctx.fillText(k.label, 0, 0);
        ctx.restore();
      }
    });
    return { tex: t.tex, W, D, zc: zMin + D / 2 };
  }, [keys]);
  const rowWidth = 15 * U;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.18), []);

  useLayoutEffect(() => {
    const m = mesh.current!;
    const o = new THREE.Object3D();
    const light = new THREE.Color("#ebe7df");
    const mod = new THREE.Color("#8d9097");
    const accent = new THREE.Color("#d9643a");
    keys.forEach((k, i) => {
      o.position.set(k.x - rowWidth / 2, 0, k.z - 2.5 * U);
      o.scale.set(k.w * U - 0.0028, 0.008, U - 0.0028);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, i === 0 ? accent : k.mod ? mod : light);
    });
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
  }, [keys, rowWidth]);

  return (
    <group position={[-0.03, DESK.top, 0.04]} rotation={[0, 0.02, 0]}>
      {/* case, tilted slightly toward the user */}
      <group rotation={[0.05, 0, 0]}>
        <RoundedBox args={[rowWidth + 0.022, 0.016, 6 * U + 0.02]} radius={0.005} position={[0, 0.009, -0.002]} castShadow receiveShadow>
          <meshStandardMaterial color="#3a3d43" roughness={0.38} metalness={0.7} />
        </RoundedBox>
        <instancedMesh ref={mesh} args={[geometry, undefined, keys.length]} position={[0, 0.021, 0]} castShadow receiveShadow>
          <meshStandardMaterial roughness={0.62} />
        </instancedMesh>
        <mesh position={[0, 0.0252, sheet.zc]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
          <planeGeometry args={[sheet.W, sheet.D]} />
          <meshStandardMaterial map={sheet.tex} transparent depthWrite={false} roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      </group>
    </group>
  );
}

function Mouse() {
  const shape = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(0.032, 0.019, 0.058);
    return g;
  }, []);
  return (
    <group position={[0.33, DESK.top + 0.003, 0.07]} rotation={[0, -0.12, 0]}>
      <mesh geometry={shape} castShadow receiveShadow>
        <meshPhysicalMaterial color="#e8e6e1" roughness={0.35} clearcoat={0.4} clearcoatRoughness={0.3} />
      </mesh>
      {/* button split */}
      <mesh position={[0, 0.0175, -0.03]} rotation={[-Math.PI / 2 + 0.35, 0, 0]}>
        <planeGeometry args={[0.0008, 0.035]} />
        <meshBasicMaterial color="#9a9893" />
      </mesh>
      <mesh position={[0, 0.016, -0.028]} rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.003, 0.006, 4, 12]} />
        <meshStandardMaterial color="#6d6f73" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** A scanned object's child node, re-centred on its own bounding box so it can be placed directly. */
function useNode(scene: THREE.Object3D, name: string) {
  return useMemo(() => {
    const src = scene.getObjectByName(name);
    const obj = (src ?? new THREE.Group()).clone(true);
    obj.position.set(0, 0, 0);
    obj.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c);
    const g = new THREE.Group();
    g.add(obj);
    return { object: g, size: box.getSize(new THREE.Vector3()) };
  }, [scene, name]);
}

/** Leather notebook + a pen (Poly Haven "binder_notebook" / "stationery_supplies"). */
function Notebook() {
  const { scene } = useModel("binder_notebook");
  const book = useNode(scene, "binder_notebook_closed");
  const { scene: st } = useModel("stationery_supplies");
  const pen = useNode(st, "stationery_supplies_pen_fancy");
  return (
    <group>
      <primitive object={book.object} position={[-0.56, DESK.top + book.size.y / 2, 0.02]} rotation={[0, 0.28 + Math.PI / 2, 0]} />
      <primitive object={pen.object} position={[-0.445, DESK.top + pen.size.y / 2, 0.0]} rotation={[0, 1.35, 0]} />
    </group>
  );
}

/** Metal pencil cup with a few pens and pencils standing in it. */
function PenCup() {
  const { scene } = useModel("stationery_supplies");
  const cup = useNode(scene, "stationery_supplies_pencilcup");
  const pens = [
    useNode(scene, "stationery_supplies_pencil_new_a"),
    useNode(scene, "stationery_supplies_pen_blue"),
    useNode(scene, "stationery_supplies_pen_red"),
    useNode(scene, "stationery_supplies_pencil_used"),
  ];
  // [x, z, lean about x, lean about z]
  const slots: [number, number, number, number][] = [
    [-0.012, -0.01, -0.12, 0.1],
    [0.013, -0.008, -0.08, -0.14],
    [0.0, 0.014, 0.14, 0.05],
    [-0.01, 0.01, 0.1, 0.16],
  ];
  return (
    <group position={[-0.69, DESK.top, -0.2]}>
      <primitive object={cup.object} position={[0, cup.size.y / 2, 0]} />
      {pens.map((p, i) => {
        const [x, z, rx, rz] = slots[i];
        const len = p.size.x;
        return (
          <group key={i} position={[x, 0.006, z]} rotation={[rx, i * 1.3, rz]}>
            <primitive object={p.object} position={[0, len / 2, 0]} rotation={[0, 0, Math.PI / 2]} />
          </group>
        );
      })}
    </group>
  );
}

export function Desk() {
  const wood = useScanned("walnut_veneer", [1, 0.47], Math.PI / 2);
  const { top, width, depth, z, thickness } = DESK;
  return (
    <group>
      <RoundedBox args={[width, thickness, depth]} radius={0.006} smoothness={3} position={[0, top - thickness / 2, z]} castShadow receiveShadow>
        <meshPhysicalMaterial {...wood} color="#9c7458" clearcoat={0.4} clearcoatRoughness={0.3} />
      </RoundedBox>
      <Legs />
      {/* desk mat */}
      <RoundedBox args={[0.92, 0.003, 0.4]} radius={0.0014} position={[0.02, top + 0.0015, 0.03]} receiveShadow>
        <meshStandardMaterial color="#2f3136" />
      </RoundedBox>
      <Keyboard />
      <Mouse />
      <Notebook />
      <PenCup />
      {/* keyboard cable to the back */}
      <Cable
        points={[
          [-0.03, top + 0.012, -0.03],
          [-0.05, top + 0.004, -0.1],
          [-0.1, top + 0.004, -0.22],
          [-0.08, top + 0.006, -0.36],
          [-0.05, top + 0.02, -0.4],
        ]}
        radius={0.0022}
      />
    </group>
  );
}
