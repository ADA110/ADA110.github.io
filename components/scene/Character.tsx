"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { DESK } from "./Desk";
import { MUG_REST, MUG_YAW, mugRef } from "./Props";

// Abhi at the desk, lofi style: back to the camera, typing, and every so often reaching
// for the coffee. Built from simple shapes so the cel shading and ink lines make it read
// as a painted character; the arms are posed every frame with two-bone IK.

const T = DESK.top;
const ROOT = new THREE.Vector3(-0.03, 0, 0.55);

const SKIN = "#c69372";
const HAIR = "#1d1613";
const SWEATER = "#34466b";
const PANTS = "#2f2e35";
const SHOE = "#ece7de";
const CHAIR = "#3a3b41";

const UPPER = 0.28;
const FORE = 0.26;
const TYPE_TIME = 7;
const SIP_TIME = 4;

const UP = new THREE.Vector3(0, 1, 0);
const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).add(ROOT);

const SHOULDER = [local(-0.16, 0.97, 0.0), local(0.16, 0.97, 0.0)];
const KEYS = [new THREE.Vector3(-0.12, T + 0.035, 0.11), new THREE.Vector3(0.07, T + 0.035, 0.11)];
const POLE = [new THREE.Vector3(-0.6, -1, 0.5).normalize(), new THREE.Vector3(0.6, -1, 0.5).normalize()];
const HEAD = local(0, 1.14, -0.05);
const MOUTH = HEAD.clone().add(new THREE.Vector3(0, -0.06, -0.1));
/** Where the hand holds the mug, in the mug's own frame (on the handle). */
const GRIP = new THREE.Vector3(0.064, 0.05, 0);
const MUG_LIP = 0.0975;

const ease = (x: number) => {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};

// scratch
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const euler = new THREE.Euler();
const quat = new THREE.Quaternion();

/** Stretch a unit-height mesh (cylinder) between two points. */
function span(mesh: THREE.Object3D | null, a: THREE.Vector3, b: THREE.Vector3) {
  if (!mesh) return;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  v1.subVectors(b, a);
  const len = v1.length();
  mesh.quaternion.setFromUnitVectors(UP, v1.divideScalar(len));
  mesh.scale.set(1, len, 1);
}

/** Two-bone IK: elbow position for a shoulder reaching a target, bending toward `pole`. */
function solveElbow(s: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3, out: THREE.Vector3) {
  const dir = v2.subVectors(target, s);
  const d = Math.min(dir.length(), UPPER + FORE - 1e-4);
  dir.normalize();
  const x = (UPPER * UPPER - FORE * FORE + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(UPPER * UPPER - x * x, 0));
  const perp = v3.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
  return out.copy(s).addScaledVector(dir, x).addScaledVector(perp, h);
}

/** Mug pose for a lift amount (0 on the desk, 1 at the lips) and tilt. */
function mugPose(lift: number, tilt: number, pos: THREE.Vector3) {
  const atLips = v1.set(0, MUG_LIP * Math.cos(tilt), MUG_LIP * Math.sin(tilt));
  const drink = v2.copy(MOUTH).sub(atLips).add(v3.set(0.01, 0, -0.03));
  return pos.copy(MUG_REST).lerp(drink, lift);
}

function Hair() {
  // Curly clumps over the top and back of the head, kept off the face.
  const clumps = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = [];
    let seed = 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const y = 1 - rand() * 1.4; // top down to the nape at the back
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (d.z < -0.25 && d.y < 0.45) continue; // face and forehead
      if (d.y < -0.05 && d.z < 0.35) continue; // jaw and ears
      out.push({ p: d.multiplyScalar(0.098).toArray() as [number, number, number], r: 0.027 + rand() * 0.012 });
    }
    return out;
  }, []);
  return (
    <group>
      {clumps.map((c, i) => (
        <mesh key={i} position={c.p} castShadow>
          <icosahedronGeometry args={[c.r, 1]} />
          <meshStandardMaterial color={HAIR} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Head() {
  return (
    <group>
      <mesh scale={[0.95, 1.05, 1]} castShadow>
        <sphereGeometry args={[0.1, 32, 24]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
      {/* ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.094, -0.005, 0.005]} scale={[0.4, 1, 0.7]}>
          <sphereGeometry args={[0.025, 16, 12]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
      ))}
      {/* beard along the jaw and chin */}
      <mesh scale={[0.98, 1.06, 1.03]}>
        <sphereGeometry args={[0.1, 32, 16, Math.PI - 0.35, Math.PI + 0.7, 1.72, 1.15]} />
        <meshStandardMaterial color={HAIR} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <Hair />
      {/* glasses: temples running back to the ears, and the frames */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.097, 0.018, -0.04]} rotation={[0, s * 0.06, 0]}>
            <boxGeometry args={[0.004, 0.005, 0.1]} />
            <meshStandardMaterial color="#202226" roughness={0.4} />
          </mesh>
          <mesh position={[s * 0.042, 0.016, -0.098]}>
            <torusGeometry args={[0.025, 0.0035, 8, 24]} />
            <meshStandardMaterial color="#202226" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Chair() {
  const fabric = <meshStandardMaterial color={CHAIR} roughness={0.85} />;
  const metal = <meshStandardMaterial color="#2a2a2e" roughness={0.4} metalness={0.6} />;
  return (
    <group position={ROOT.toArray()}>
      <RoundedBox args={[0.5, 0.07, 0.48]} radius={0.025} position={[0, 0.44, 0.08]} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      <RoundedBox args={[0.44, 0.4, 0.05]} radius={0.022} position={[0, 0.74, 0.31]} rotation={[0.12, 0, 0]} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      <mesh position={[0, 0.5, 0.3]} castShadow>
        <boxGeometry args={[0.05, 0.14, 0.02]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.25, 0.08]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.34, 16]} />
        {metal}
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[0, 0.07, 0.08]} rotation={[0, a, 0]}>
            <mesh position={[0.15, 0, 0]} castShadow>
              <boxGeometry args={[0.3, 0.03, 0.04]} />
              {metal}
            </mesh>
            <mesh position={[0.29, -0.035, 0]}>
              <sphereGeometry args={[0.025, 12, 10]} />
              {metal}
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Legs() {
  const pants = <meshStandardMaterial color={PANTS} roughness={0.85} />;
  return (
    <group position={ROOT.toArray()}>
      {[-1, 1].map((s) => {
        const hip = new THREE.Vector3(s * 0.095, 0.52, 0.05);
        const knee = new THREE.Vector3(s * 0.11, 0.53, -0.34);
        const ankle = new THREE.Vector3(s * 0.12, 0.1, -0.36);
        const thigh = hip.clone().add(knee).multiplyScalar(0.5);
        const shin = knee.clone().add(ankle).multiplyScalar(0.5);
        const qThigh = new THREE.Quaternion().setFromUnitVectors(UP, knee.clone().sub(hip).normalize());
        const qShin = new THREE.Quaternion().setFromUnitVectors(UP, ankle.clone().sub(knee).normalize());
        return (
          <group key={s}>
            <mesh position={thigh} quaternion={qThigh} castShadow>
              <capsuleGeometry args={[0.06, knee.distanceTo(hip), 6, 16]} />
              {pants}
            </mesh>
            <mesh position={shin} quaternion={qShin} castShadow>
              <capsuleGeometry args={[0.046, ankle.distanceTo(knee), 6, 16]} />
              {pants}
            </mesh>
            <RoundedBox args={[0.09, 0.07, 0.24]} radius={0.03} position={[s * 0.12, 0.04, -0.41]} castShadow receiveShadow>
              <meshStandardMaterial color={SHOE} roughness={0.7} />
            </RoundedBox>
          </group>
        );
      })}
    </group>
  );
}

export function Character() {
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const upper = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const fore = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const elbow = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const hand = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const body = useRef<THREE.Group>(null);
  const joints = useMemo(() => ({ elbow: [new THREE.Vector3(), new THREE.Vector3()], wrist: [new THREE.Vector3(), new THREE.Vector3()] }), []);
  const mugPos = useMemo(() => new THREE.Vector3(), []);
  const grip = useMemo(() => new THREE.Vector3(), []);

  const sweater = useMemo(() => new THREE.MeshStandardMaterial({ color: SWEATER, roughness: 0.9 }), []);
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.8 }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Close-ups of the monitor, frame, phone and notes would be blocked by his head, so he steps out of those.
    const section = useStore.getState().section;
    if (body.current) body.current.visible = !(section === "projects" || section === "about" || section === "contact" || section === "notes");

    // Where we are in the type → sip loop.
    const cycle = (t + 2) % (TYPE_TIME + SIP_TIME);
    const u = cycle - TYPE_TIME; // < 0 while typing
    const reach = u < 0 ? 0 : ease(u / 0.7) - ease((u - 3.2) / 0.7); // hand travels keyboard ↔ mug
    const lift = u < 0 ? 0 : ease((u - 0.7) / 0.8) - ease((u - 2.5) / 0.7); // mug desk ↔ lips
    const tilt = lift * (0.65 + 0.35 * ease((u - 1.5) / 0.6) - 0.35 * ease((u - 2.2) / 0.4));

    // Mug follows the right hand while it's held.
    mugPose(lift, tilt, mugPos);
    const mug = mugRef.current;
    if (mug) {
      mug.position.copy(mugPos);
      mug.rotation.set(tilt, MUG_YAW, 0, "XYZ");
      mug.updateMatrixWorld();
    }
    euler.set(tilt, MUG_YAW, 0, "XYZ");
    grip.copy(GRIP).applyEuler(euler).add(mugPos).add(v1.set(0.03, -0.012, 0.045)); // wrist sits just behind the handle

    // Breathing and a small bob with the typing rhythm.
    const breath = Math.sin(t * 1.6) * 0.5 + 0.5;
    if (torso.current) torso.current.scale.set(1 + breath * 0.012, 1 + breath * 0.008, 1 + breath * 0.02);
    if (head.current) {
      head.current.position.copy(HEAD).sub(ROOT);
      head.current.rotation.set(-0.12 + Math.sin(t * 1.1) * 0.015 + lift * 0.32, Math.sin(t * 0.37) * 0.05 - lift * 0.08, 0);
    }

    for (let i = 0; i < 2; i++) {
      // Typing: a wandering hand with quick, uneven key strikes.
      const strike = Math.max(0, Math.sin(t * 13 + i * 2.1 + Math.sin(t * 3.7 + i) * 2));
      const typing = v1.copy(KEYS[i]).add(
        v2.set(Math.sin(t * 0.9 + i * 2) * 0.018, 0.012 - strike * strike * 0.012, Math.sin(t * 1.3 + i) * 0.01),
      );
      if (i === 0 && u >= 0) typing.y = KEYS[0].y + 0.006; // left hand rests while sipping
      const wrist = joints.wrist[i].copy(typing);
      if (i === 1) wrist.lerp(grip, reach);

      const s = SHOULDER[i];
      const e = solveElbow(s, wrist, POLE[i], joints.elbow[i]);
      span(upper[i].current, s, e);
      span(fore[i].current, e, wrist);
      elbow[i].current?.position.copy(e);

      const h = hand[i].current;
      if (h) {
        // Hands lie flat over the keys; holding the mug they follow the forearm.
        const flat = i === 1 ? 1 - reach : 1;
        v3.subVectors(wrist, e).normalize();
        v3.y *= 1 - flat * 0.75;
        h.position.copy(wrist);
        h.lookAt(v2.copy(wrist).add(v3));
        quat.setFromAxisAngle(v1.set(0, 0, 1), i === 1 ? -0.25 * flat - reach * 1.2 : 0.25);
        h.quaternion.multiply(quat);
      }
    }
  });

  return (
    <group ref={body}>
      <Chair />
      <Legs />
      {/* torso: sweater over a slight forward lean */}
      <group ref={torso} position={local(0, 0.56, 0.05).toArray()} rotation={[-0.16, 0, 0]}>
        <mesh position={[0, 0.2, 0]} scale={[1.15, 1, 0.74]} material={sweater} castShadow>
          <capsuleGeometry args={[0.112, 0.26, 8, 24]} />
        </mesh>
        <mesh position={[0, 0.47, -0.012]} rotation={[0.16, 0, 0]} material={skin}>
          <cylinderGeometry args={[0.04, 0.045, 0.18, 16]} />
        </mesh>
        {/* collar */}
        <mesh position={[0, 0.39, -0.005]} rotation={[Math.PI / 2, 0, 0]} material={sweater}>
          <torusGeometry args={[0.052, 0.014, 8, 24]} />
        </mesh>
      </group>
      <group position={ROOT.toArray()}>
        <group ref={head}>
          <Head />
        </group>
      </group>
      {/* arms: shoulder ball, upper arm, elbow ball, forearm sleeve, hand */}
      {[0, 1].map((i) => (
        <group key={i}>
          <mesh position={SHOULDER[i]} material={sweater} castShadow>
            <sphereGeometry args={[0.046, 20, 16]} />
          </mesh>
          <mesh ref={upper[i]} material={sweater} castShadow>
            <cylinderGeometry args={[0.04, 0.037, 1, 16, 1, true]} />
          </mesh>
          <mesh ref={elbow[i]} material={sweater} castShadow>
            <sphereGeometry args={[0.037, 16, 12]} />
          </mesh>
          <mesh ref={fore[i]} material={sweater} castShadow>
            <cylinderGeometry args={[0.031, 0.036, 1, 16, 1, true]} />
          </mesh>
          <group ref={hand[i]}>
            <RoundedBox args={[0.058, 0.022, 0.075]} radius={0.01} position={[0, 0, 0.036]} material={skin} castShadow />
            <mesh position={[i === 0 ? 0.036 : -0.036, -0.004, 0.03]} rotation={[0.3, 0, 0]} material={skin}>
              <capsuleGeometry args={[0.011, 0.035, 4, 8]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
