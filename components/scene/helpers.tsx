"use client";

import { useMemo, type ReactNode } from "react";
import * as THREE from "three";

type V3 = [number, number, number];

/** A cylinder spanning two points (lamp arms, rods, legs). */
export function Segment({
  from,
  to,
  radius,
  children,
  radialSegments = 20,
  castShadow = true,
}: {
  from: V3;
  to: V3;
  radius: number;
  children: ReactNode;
  radialSegments?: number;
  castShadow?: boolean;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: a.add(b).multiplyScalar(0.5), quaternion: q, length: dir.length() };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[radius, radius, length, radialSegments]} />
      {children}
    </mesh>
  );
}

/** A soft rubber cable following a smooth curve through the given points. */
export function Cable({ points, radius = 0.0028, color = "#141414" }: { points: V3[]; radius?: number; color?: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.4);
    return new THREE.TubeGeometry(curve, Math.max(24, points.length * 16), radius, 8, false);
  }, [points, radius]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

/** Revolve a 2D profile (x = radius, y = height) into a solid — mugs, pots, shades. */
export function useLathe(profile: [number, number][], segments = 64) {
  const key = JSON.stringify(profile);
  return useMemo(
    () => new THREE.LatheGeometry((JSON.parse(key) as [number, number][]).map(([x, y]) => new THREE.Vector2(x, y)), segments),
    [key, segments],
  );
}
