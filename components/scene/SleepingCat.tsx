"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { ROOM } from "./Room";
import { SleepSymbols } from "./SleepSymbols";

type Vec3 = [number, number, number];
const FUR = "#c28b52";
const CREAM = "#f1d9b5";
const STRIPE = "#865332";

function SoftShape({ position, scale, color = FUR }: { position: Vec3; scale: Vec3; color?: string }) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[1, 32, 20]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Curve({ points, radius, color }: { points: Vec3[]; radius: number; color: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 36, radius, 8, false,
  ), [points, radius]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={1} /></mesh>;
}

function Ear({ side }: { side: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.022, 0);
    shape.quadraticCurveTo(-0.024, 0.024, -0.017, 0.047);
    shape.quadraticCurveTo(-0.013, 0.053, -0.007, 0.045);
    shape.lineTo(0.022, 0);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 3, steps: 1 });
  }, []);
  return (
    <group position={[side * 0.035, 0.033, -0.008]} rotation={[0.08, 0, -side * 0.22]} scale={[side, 1, 1]}>
      <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={FUR} roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geometry} position={[0, 0.009, 0.012]} scale={[0.56, 0.62, 0.3]}>
        <meshStandardMaterial color="#d7a18b" roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Painted tabby bands follow the curved back instead of floating above the fur. */
function BackStripes() {
  const geometry = useMemo(() => {
    const vertices: number[] = [], indices: number[] = [];
    for (const x of [-0.025, 0.025, 0.073, 0.116]) {
      const offset = vertices.length / 3;
      for (let j = 0; j <= 20; j++) {
        const t = j / 20;
        const phi = -0.8 + t * 2.45;
        const width = 0.0045 * Math.sin(Math.PI * t) ** 0.5;
        for (const sign of [-1, 1]) {
          const px = x + Math.sin(phi * 1.5) * 0.009 + sign * width;
          const ring = Math.sqrt(Math.max(0, 1 - ((px - 0.025) / 0.156) ** 2));
          vertices.push(px, 0.077 + Math.cos(phi) * 0.0755 * ring, -0.012 + Math.sin(phi) * 0.0865 * ring);
        }
      }
      for (let j = 0; j < 20; j++) {
        const a = offset + j * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geometry}><meshStandardMaterial color={STRIPE} roughness={1} side={THREE.DoubleSide} /></mesh>;
}

/** A quiet windowsill companion; the room's existing cel shading and sunlight light the fur. */
export function SleepingCat() {
  const sleeping = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!sleeping.current) return;
    const breath = useStore.getState().reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.35);
    sleeping.current.scale.y = 1 + breath * 0.055;
    sleeping.current.scale.z = 1 + breath * 0.012;
  });

  return (
    <group name="Sleeping windowsill cat" position={[ROOM.left + 0.047, ROOM.window.y0 + 0.003, 0.015]} rotation={[0, Math.PI / 2, 0]}>
      <SleepSymbols />
      <group ref={sleeping}>
        <SoftShape position={[0.025, 0.077, -0.012]} scale={[0.156, 0.075, 0.086]} />
        <BackStripes />
        {/* Tucked hind leg and two cream front paws rest directly on the sill. */}
        <SoftShape position={[0.108, 0.038, 0.04]} scale={[0.063, 0.038, 0.046]} />
        <SoftShape position={[-0.09, 0.02, 0.073]} scale={[0.043, 0.02, 0.025]} color={CREAM} />
        <SoftShape position={[-0.135, 0.018, 0.05]} scale={[0.033, 0.018, 0.025]} color={CREAM} />
        <Curve points={[[0.127, 0.052, -0.043], [0.178, 0.035, 0.005], [0.148, 0.023, 0.073], [0.072, 0.023, 0.091], [0.005, 0.025, 0.08], [-0.026, 0.028, 0.064]]} radius={0.018} color={FUR} />
        <SoftShape position={[-0.026, 0.028, 0.064]} scale={[0.02, 0.018, 0.019]} color={CREAM} />
        {/* Cheek resting on the paws; closed eyelids make the sleeping pose legible. */}
        <group position={[-0.105, 0.072, 0.032]} rotation={[0.12, -0.18, -0.22]}>
          <SoftShape position={[0, 0, 0]} scale={[0.062, 0.054, 0.052]} />
          <Ear side={-1} /><Ear side={1} />
          <SoftShape position={[-0.014, -0.016, 0.044]} scale={[0.024, 0.018, 0.014]} color={CREAM} />
          <SoftShape position={[0.014, -0.016, 0.044]} scale={[0.024, 0.018, 0.014]} color={CREAM} />
          <SoftShape position={[0, -0.008, 0.058]} scale={[0.007, 0.0045, 0.0035]} color="#9a625e" />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Curve points={[[side * 0.012, 0.009, 0.05], [side * 0.024, 0.003, 0.048], [side * 0.036, 0.008, 0.042]]} radius={0.0018} color="#51382c" />
              <Curve points={[[side * 0.011, 0.04, 0.032], [side * 0.015, 0.029, 0.044], [side * 0.019, 0.023, 0.047]]} radius={0.003} color={STRIPE} />
              {[-1, 1].map((tilt) => <Curve key={tilt} points={[[side * 0.027, -0.016, 0.054], [side * 0.05, -0.014 + tilt * 0.007, 0.057], [side * 0.071, -0.014 + tilt * 0.012, 0.052]]} radius={0.0006} color="#eed3b2" />)}
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
