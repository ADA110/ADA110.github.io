"use client";

import { RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { deskWood, felt } from "@/lib/textures";
import { Cable } from "./helpers";

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

function Keyboard() {
  const U = 0.019;
  const keys = useMemo(() => {
    const out: { x: number; z: number; w: number; mod: boolean }[] = [];
    ROWS.forEach((row, r) => {
      let x = 0;
      const z = r * U + (r === 0 ? -0.004 : 0);
      row.forEach((w, i) => {
        if (w < 0.6 && r === 0 && i > 0) {
          x += w * U;
          return;
        }
        out.push({ x: x + (w * U) / 2, z, w, mod: w > 1.2 || (r === 0 && i === 0) || (r === 5) });
        x += w * U;
      });
    });
    return out;
  }, []);
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

function Notebook() {
  return (
    <group position={[-0.56, DESK.top, 0.02]} rotation={[0, 0.28, 0]}>
      <RoundedBox args={[0.148, 0.014, 0.21]} radius={0.004} position={[0, 0.007, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#20324a" roughness={0.8} />
      </RoundedBox>
      {/* page edges */}
      <mesh position={[0.002, 0.007, 0]}>
        <boxGeometry args={[0.144, 0.01, 0.204]} />
        <meshStandardMaterial color="#f1ece0" roughness={0.9} />
      </mesh>
      {/* elastic band */}
      <mesh position={[0.05, 0.007, 0]}>
        <boxGeometry args={[0.006, 0.0152, 0.2105]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
      {/* pen */}
      <group position={[0.1, 0.006, -0.01]} rotation={[0, 0.15, Math.PI / 2]}>
        <mesh rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.0045, 0.0045, 0.13, 16]} />
          <meshStandardMaterial color="#111" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.07, 0]} castShadow>
          <coneGeometry args={[0.0045, 0.014, 16]} />
          <meshStandardMaterial color="#c9a45c" roughness={0.25} metalness={1} />
        </mesh>
        <mesh position={[0.004, -0.03, 0]} castShadow>
          <boxGeometry args={[0.002, 0.04, 0.003]} />
          <meshStandardMaterial color="#c9a45c" roughness={0.25} metalness={1} />
        </mesh>
      </group>
    </group>
  );
}

export function Desk() {
  const wood = deskWood();
  const mat = felt("#2c2e33");
  const { top, width, depth, z, thickness } = DESK;
  return (
    <group>
      <RoundedBox args={[width, thickness, depth]} radius={0.006} smoothness={3} position={[0, top - thickness / 2, z]} castShadow receiveShadow>
        <meshPhysicalMaterial {...wood} roughness={1} clearcoat={0.35} clearcoatRoughness={0.35} normalScale={new THREE.Vector2(0.5, 0.5)} />
      </RoundedBox>
      <Legs />
      {/* desk mat */}
      <RoundedBox args={[0.92, 0.003, 0.4]} radius={0.0014} position={[0.02, top + 0.0015, 0.03]} receiveShadow>
        <meshStandardMaterial {...mat} roughness={1} />
      </RoundedBox>
      <Keyboard />
      <Mouse />
      <Notebook />
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
