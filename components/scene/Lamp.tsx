"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { playClick } from "@/lib/sound";
import { DESK } from "./Desk";
import { Cable, Segment, useLathe } from "./helpers";
import { Hotspot } from "./Hotspot";

type V3 = [number, number, number];

const BASE: V3 = [-0.66, DESK.top, -0.34];
const SHOULDER: V3 = [-0.66, DESK.top + 0.045, -0.34];
const ELBOW: V3 = [-0.6, 1.17, -0.27];
const HEAD: V3 = [-0.37, 1.255, -0.1];
const AIM: V3 = [-0.2, DESK.top, 0.06];

const black = { color: "#151516", roughness: 0.5, metalness: 0.6 } as const;
const brass = { color: "#b8914f", roughness: 0.28, metalness: 1 } as const;

/** Intensity multiplier while the lamp is switching on: a quick fluorescent-ish stutter. */
function flicker(t: number) {
  if (t > 0.45) return 1;
  const steps = [0, 0.9, 0.15, 1, 0.4, 1];
  return steps[Math.min(steps.length - 1, Math.floor(t / 0.075))];
}

export function Lamp() {
  const lampOn = useStore((s) => s.lampOn);
  const spot = useRef<THREE.SpotLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.MeshStandardMaterial>(null);
  const inner = useRef<THREE.MeshStandardMaterial>(null);
  const button = useRef<THREE.Mesh>(null);
  const level = useRef(0);
  const onAt = useRef(-10);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...AIM);
    return o;
  }, []);

  const dir = useMemo(() => new THREE.Vector3(...AIM).sub(new THREE.Vector3(...HEAD)).normalize(), []);
  const headQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir), [dir]);
  const bulbPos = useMemo(() => new THREE.Vector3(...HEAD).addScaledVector(dir, 0.075).toArray() as V3, [dir]);

  const shade = useLathe([
    [0.0, 0.012],
    [0.022, 0.01],
    [0.032, -0.02],
    [0.042, -0.05],
    [0.07, -0.12],
    [0.074, -0.135],
  ]);

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
    if (spot.current) spot.current.intensity = 7 * l;
    if (fill.current) fill.current.intensity = 0.55 * l;
    if (bulb.current) bulb.current.emissiveIntensity = 0.2 + 14 * l;
    if (inner.current) inner.current.emissiveIntensity = 0.9 * l;
    if (button.current) button.current.position.y += ((lampOn ? 0.028 : 0.031) - button.current.position.y) * 0.3;
  });

  const toggle = () => {
    playClick();
    useStore.getState().toggleLamp();
  };

  return (
    <Hotspot id="lamp" labelPosition={[HEAD[0], HEAD[1] + 0.09, HEAD[2]]} onActivate={toggle} lift={0}>
      {/* weighted base */}
      <group position={BASE}>
        <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.072, 0.078, 0.024, 48]} />
          <meshStandardMaterial {...black} />
        </mesh>
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.068, 0.072, 0.003, 48]} />
          <meshStandardMaterial {...brass} />
        </mesh>
        {/* the switch */}
        <mesh ref={button} position={[0.038, 0.03, 0.035]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, 0.012, 24]} />
          <meshStandardMaterial color="#e9e4da" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.016, 0.022, 24]} />
          <meshStandardMaterial {...black} />
        </mesh>
      </group>
      {/* arms: twin parallel rods like a real architect lamp */}
      {[-0.008, 0.008].map((o) => (
        <group key={o}>
          <Segment from={[SHOULDER[0] + o, SHOULDER[1], SHOULDER[2]]} to={[ELBOW[0] + o, ELBOW[1], ELBOW[2]]} radius={0.0045}>
            <meshStandardMaterial {...black} />
          </Segment>
          <Segment from={[ELBOW[0] + o, ELBOW[1], ELBOW[2]]} to={[HEAD[0] + o, HEAD[1], HEAD[2]]} radius={0.004}>
            <meshStandardMaterial {...black} />
          </Segment>
        </group>
      ))}
      {/* tension springs */}
      <Segment from={[SHOULDER[0] - 0.02, SHOULDER[1] + 0.03, SHOULDER[2] - 0.01]} to={[ELBOW[0] - 0.02, ELBOW[1] - 0.12, ELBOW[2] - 0.02]} radius={0.0035}>
        <meshStandardMaterial {...brass} />
      </Segment>
      {/* joints */}
      {[SHOULDER, ELBOW, HEAD].map((p, i) => (
        <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.03, 24]} />
          <meshStandardMaterial {...brass} />
        </mesh>
      ))}
      {/* head */}
      <group position={HEAD} quaternion={headQuat}>
        <mesh geometry={shade} castShadow>
          <meshStandardMaterial {...black} side={THREE.BackSide} />
        </mesh>
        <mesh geometry={shade} scale={0.985}>
          <meshStandardMaterial ref={inner} color="#e8e2d6" roughness={0.6} side={THREE.FrontSide} emissive="#ffdcb0" emissiveIntensity={0} />
        </mesh>
      </group>
      <mesh position={bulbPos}>
        <sphereGeometry args={[0.02, 24, 16]} />
        <meshStandardMaterial ref={bulb} color="#fff8ee" emissive="#ffcf94" emissiveIntensity={0.2} roughness={0.2} />
      </mesh>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={bulbPos}
        target={target}
        angle={0.95}
        penumbra={0.85}
        decay={2}
        distance={0}
        color="#ffcf9a"
        intensity={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.01}
        shadow-camera-near={0.02}
        shadow-camera-far={4}
      />
      <pointLight ref={fill} position={[HEAD[0], HEAD[1] + 0.05, HEAD[2]]} color="#ffcf9a" intensity={0} decay={2} distance={0} />
      <Cable
        points={[
          [BASE[0] - 0.05, DESK.top + 0.008, BASE[2] - 0.05],
          [BASE[0] - 0.08, DESK.top + 0.004, -0.48],
          [BASE[0] - 0.09, DESK.top + 0.004, -0.52],
          [BASE[0] - 0.1, DESK.top - 0.12, -0.545],
          [BASE[0] - 0.12, 0.3, -0.545],
        ]}
      />
    </Hotspot>
  );
}
