"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { playClick } from "@/lib/sound";
import { DESK } from "./Desk";
import { Cable } from "./helpers";
import { Hotspot } from "./Hotspot";
import { useModel, useShadowClone } from "./pbr";

type V3 = [number, number, number];

// Scanned clamp-on architect lamp (Poly Haven "desk_lamp_arm_01"), clamped to the desk's back edge.
const ORIGIN: V3 = [-0.66, DESK.top, DESK.z - DESK.depth / 2 + 0.03];
const YAW = Math.PI + 0.55; // the arm reaches toward the middle of the desk
const SCALE = 0.82;
// Measured in the model's own space: bulb centre and the direction the shade opens.
const BULB_LOCAL = new THREE.Vector3(-0.0045, 0.6955, -0.1765);
const AIM_LOCAL = new THREE.Vector3(-0.22, -0.5, -0.84).normalize();

/** Intensity multiplier while the lamp is switching on: a quick fluorescent-ish stutter. */
function flicker(t: number) {
  if (t > 0.45) return 1;
  const steps = [0, 0.9, 0.15, 1, 0.4, 1];
  return steps[Math.min(steps.length - 1, Math.floor(t / 0.075))];
}

export function Lamp() {
  const lampOn = useStore((s) => s.lampOn);
  const { scene } = useModel("desk_lamp_arm_01");
  const lamp = useShadowClone(scene);
  const spot = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const level = useRef(0);
  const onAt = useRef(-10);

  const { bulb, aim, bulbMat } = useMemo(() => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
    const bulbW = BULB_LOCAL.clone().multiplyScalar(SCALE).applyQuaternion(q).add(new THREE.Vector3(...ORIGIN));
    const aimW = bulbW.clone().addScaledVector(AIM_LOCAL.clone().applyQuaternion(q), 1.2);
    let mat: THREE.MeshStandardMaterial | null = null;
    lamp.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.name === "desk_lamp_arm_01_light") {
        m.emissive = new THREE.Color("#ffd29a");
        mat = m;
        (o as THREE.Mesh).castShadow = false; // the bulb shouldn't shadow its own light
      }
    });
    return { bulb: bulbW.toArray() as V3, aim: aimW, bulbMat: mat as THREE.MeshStandardMaterial | null };
  }, [lamp]);

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.copy(aim);
    return o;
  }, [aim]);

  useEffect(() => {
    if (lampOn) onAt.current = performance.now() / 1000;
  }, [lampOn]);

  useFrame((_, dt) => {
    const now = performance.now() / 1000;
    const goal = lampOn ? flicker(now - onAt.current) : 0;
    const reduced = useStore.getState().reducedMotion;
    level.current = lampOn && now - onAt.current < 0.45 && !reduced ? goal : level.current + (goal - level.current) * (1 - Math.exp(-14 * dt));
    if (reduced) level.current = lampOn ? 1 : 0;
    const l = level.current;
    if (spot.current) spot.current.intensity = 9 * l;
    if (fill.current) fill.current.intensity = 0.5 * l;
    if (bulbMat) bulbMat.emissiveIntensity = 0.05 + 12 * l;
  });

  const toggle = () => {
    playClick();
    useStore.getState().toggleLamp();
  };

  // Spotlight sits just inside the shade so the shade itself casts the light cone's edge.
  const spotPos: V3 = [bulb[0], bulb[1] - 0.01, bulb[2]];

  return (
    <Hotspot id="lamp" labelPosition={[bulb[0], bulb[1] + 0.14, bulb[2]]} onActivate={toggle} lift={0}>
      <primitive object={lamp} position={ORIGIN} rotation={[0, YAW, 0]} scale={SCALE} />
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={spotPos}
        target={target}
        angle={0.85}
        penumbra={0.8}
        decay={2}
        distance={0}
        color="#ffcf9a"
        intensity={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
        shadow-camera-near={0.03}
        shadow-camera-far={4}
      />
      <pointLight ref={fill} position={[bulb[0], bulb[1] + 0.08, bulb[2]]} color="#ffcf9a" intensity={0} decay={2} distance={0} />
      <Cable
        points={[
          [ORIGIN[0] - 0.01, DESK.top - 0.05, ORIGIN[2] - 0.01],
          [ORIGIN[0] - 0.03, DESK.top - 0.15, ORIGIN[2] - 0.02],
          [ORIGIN[0] - 0.06, 0.3, -0.545],
          [ORIGIN[0] - 0.08, 0.02, -0.54],
        ]}
      />
    </Hotspot>
  );
}
