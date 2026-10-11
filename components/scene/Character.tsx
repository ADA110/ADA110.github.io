"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useStore } from "@/lib/store";
import { DESK } from "./Desk";
import { MUG_REST, MUG_YAW, mugRef } from "./Props";

// Abhi at the desk, lofi style: back to the camera, typing, and every so often reaching for
// the coffee. The figure is a CC0 VRoid model (pixiv's VRoid Project, via OpenGameArt),
// recoloured to look like Abhi and posed every frame through its own skeleton: two-bone IK
// for the arms, hand-set curls for every finger.

const T = DESK.top;
const MODEL = "/models/character_hair.glb";
/** Where the chair sits; the model's hips land just above the seat. */
const ROOT = new THREE.Vector3(-0.03, 0, 0.5);
const STANDING_HIPS = 1.008;
const SEAT_HIPS = 0.52;

const TYPE_TIME = 7;
const SIP_TIME = 4;

const SKIN = new THREE.Color("#c4906f");
const HAIR = new THREE.Color("#2b211c");
const HOODIE = new THREE.Color("#4a5d86");
const PANTS = new THREE.Color("#5a5a62");

const KEYS = [new THREE.Vector3(-0.115, T + 0.045, 0.165), new THREE.Vector3(0.075, T + 0.045, 0.165)];
const POLE = [new THREE.Vector3(-0.7, -1, 0.4).normalize(), new THREE.Vector3(0.7, -1, 0.4).normalize()];
/** Where the hand holds the mug, in the mug's own frame (on the handle), and the handle's outward direction. */
const GRIP = new THREE.Vector3(0.064, 0.05, 0);
const HANDLE_OUT = new THREE.Vector3(1, 0, 0);
const MUG_LIP = 0.0975;

const ease = (x: number) => {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
};

// scratch
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const q3 = new THREE.Quaternion();
const euler = new THREE.Euler();

/** Swing `bone` so the direction to `child` points along world `dir`. */
function aim(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3) {
  bone.updateWorldMatrix(true, true);
  const from = bone.getWorldPosition(v1);
  const cur = child.getWorldPosition(v2).sub(from);
  if (cur.lengthSq() < 1e-12 || dir.lengthSq() < 1e-12) return;
  q1.setFromUnitVectors(cur.normalize(), v3.copy(dir).normalize());
  bone.getWorldQuaternion(q2).premultiply(q1);
  bone.parent!.getWorldQuaternion(q3).invert();
  bone.quaternion.copy(q3.multiply(q2));
}

/** Twist `bone` about a world axis by `angle`. */
function twist(bone: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  bone.updateWorldMatrix(true, false);
  q1.setFromAxisAngle(axis, angle);
  bone.getWorldQuaternion(q2).premultiply(q1);
  bone.parent!.getWorldQuaternion(q3).invert();
  bone.quaternion.copy(q3.multiply(q2));
}

/** Two-bone IK: elbow position for a shoulder reaching a target, bending toward `pole`. */
function solveElbow(s: THREE.Vector3, target: THREE.Vector3, a: number, b: number, pole: THREE.Vector3, out: THREE.Vector3) {
  const dir = v2.subVectors(target, s);
  const d = THREE.MathUtils.clamp(dir.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  dir.normalize();
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(a * a - x * x, 0));
  const perp = v3.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
  return out.copy(s).addScaledVector(dir, x).addScaledVector(perp, h);
}

/** Paints a short, dark beard and moustache onto the face texture. */
function bearded(map: THREE.Texture) {
  const img = map.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const s = c.width / 1024;
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(38, 28, 22, 0.9)";
  ctx.filter = "blur(6px)";
  // jaw, chin and sideburns: everything below the cheek line, leaving the lips clear
  ctx.beginPath();
  ctx.moveTo(40, 470);
  ctx.bezierCurveTo(60, 620, 160, 700, 300, 720);
  ctx.bezierCurveTo(380, 735, 430, 735, 470, 760);
  ctx.lineTo(554, 760);
  ctx.bezierCurveTo(594, 735, 644, 735, 724, 720);
  ctx.bezierCurveTo(864, 700, 964, 620, 984, 470);
  ctx.lineTo(1024, 470);
  ctx.lineTo(1024, 1024);
  ctx.lineTo(0, 1024);
  ctx.lineTo(0, 470);
  ctx.closePath();
  ctx.fill();
  // moustache
  ctx.beginPath();
  ctx.ellipse(512, 752, 92, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // keep the lips
  ctx.filter = "blur(2px)";
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.ellipse(512, 778, 52, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // put the original lips back under the cut-out
  ctx.globalCompositeOperation = "destination-over";
  ctx.drawImage(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = map.flipY;
  tex.colorSpace = map.colorSpace;
  tex.channel = map.channel;
  return tex;
}

/** Unlit VRoid materials → lit standard materials (the site turns them into toon), recoloured. */
function restyle(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const swap = (m: THREE.Material) => {
      const src = m as THREE.MeshBasicMaterial;
      const out = new THREE.MeshStandardMaterial({
        name: src.name,
        map: src.map,
        color: src.color.clone(),
        transparent: src.transparent,
        alphaTest: src.alphaTest,
        opacity: src.opacity,
        side: src.side,
        depthWrite: src.depthWrite,
        roughness: 0.9,
      });
      const n = src.name;
      if (/_SKIN/.test(n)) out.color.copy(SKIN);
      if (/Face_00_SKIN/.test(n) && src.map) out.map = bearded(src.map);
      if (/HAIR|FaceBrow/.test(n)) out.color.copy(HAIR);
      if (/Tops/.test(n)) out.color.copy(HOODIE);
      if (/Bottoms/.test(n)) out.color.copy(PANTS);
      return out;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
}

function Glasses() {
  const frame = <meshStandardMaterial color="#1b1c20" roughness={0.4} />;
  return (
    <group position={[0, 0.062, -0.082]}>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.034, 0, 0]} scale={[1, 0.8, 1]}>
            <torusGeometry args={[0.022, 0.0028, 8, 32]} />
            {frame}
          </mesh>
          <mesh position={[s * 0.066, 0.004, 0.045]} rotation={[0, s * 0.12, 0]}>
            <boxGeometry args={[0.003, 0.004, 0.09]} />
            {frame}
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.006, 0]}>
        <boxGeometry args={[0.024, 0.003, 0.003]} />
        {frame}
      </mesh>
    </group>
  );
}

function Chair() {
  const fabric = <meshStandardMaterial color="#3a3b41" roughness={0.85} />;
  const metal = <meshStandardMaterial color="#2a2a2e" roughness={0.4} metalness={0.6} />;
  return (
    <group position={ROOT.toArray()}>
      <RoundedBox args={[0.5, 0.07, 0.48]} radius={0.025} position={[0, 0.44, 0.1]} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      <RoundedBox args={[0.44, 0.42, 0.05]} radius={0.022} position={[0, 0.76, 0.34]} rotation={[0.12, 0, 0]} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      <mesh position={[0, 0.51, 0.33]} castShadow>
        <boxGeometry args={[0.05, 0.14, 0.02]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.25, 0.1]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.34, 16]} />
        {metal}
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} position={[0, 0.07, 0.1]} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <mesh position={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.03, 0.04]} />
            {metal}
          </mesh>
          <mesh position={[0.29, -0.035, 0]}>
            <sphereGeometry args={[0.025, 12, 10]} />
            {metal}
          </mesh>
        </group>
      ))}
    </group>
  );
}

const FINGERS = ["Index", "Middle", "Ring", "Little"] as const;

export function Character() {
  const { scene } = useGLTF(MODEL, false, true);
  const body = useRef<THREE.Group>(null);

  const rig = useMemo(() => {
    const model = cloneSkinned(scene);
    restyle(model);
    const bone = (n: string) => model.getObjectByName(n)!;
    const side = (s: "L" | "R") => ({
      upper: bone(`J_Bip_${s}_UpperArm`),
      lower: bone(`J_Bip_${s}_LowerArm`),
      hand: bone(`J_Bip_${s}_Hand`),
      middle1: bone(`J_Bip_${s}_Middle1`),
      fingers: FINGERS.map((f) => [1, 2, 3].map((k) => bone(`J_Bip_${s}_${f}${k}`))),
      thumb: [1, 2, 3].map((k) => bone(`J_Bip_${s}_Thumb${k}`)),
      upLeg: bone(`J_Bip_${s}_UpperLeg`),
      lowLeg: bone(`J_Bip_${s}_LowerLeg`),
      foot: bone(`J_Bip_${s}_Foot`),
      toe: bone(`J_Bip_${s}_ToeBase`),
    });
    const arms = [side("L"), side("R")];
    const head = bone("J_Bip_C_Head");
    const glasses = new THREE.Group();
    head.add(glasses);
    const lengths = arms.map((a) => [a.lower.position.length(), a.hand.position.length()]);
    const rest = new Map<THREE.Object3D, THREE.Quaternion>();
    model.traverse((o) => rest.set(o, o.quaternion.clone()));
    return {
      model,
      arms,
      lengths,
      rest,
      glasses,
      spine: bone("J_Bip_C_Spine"),
      chest: bone("J_Bip_C_Chest"),
      neck: bone("J_Bip_C_Neck"),
      head,
    };
  }, [scene]);

  const tmp = useMemo(
    () => ({
      mugPos: new THREE.Vector3(),
      grip: new THREE.Vector3(),
      handleDir: new THREE.Vector3(),
      mouth: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      wrist: new THREE.Vector3(),
      shoulder: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      fore: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const section = useStore.getState().section;
    if (body.current) body.current.visible = !(section === "projects" || section === "about" || section === "contact" || section === "notes");
    const r = rig;
    const { mugPos, grip, handleDir, mouth, elbow, wrist, shoulder, dir, fore } = tmp;
    r.rest.forEach((q, o) => o.quaternion.copy(q));

    // The type → sip loop.
    const cycle = (t + 2) % (TYPE_TIME + SIP_TIME);
    const u = cycle - TYPE_TIME; // < 0 while typing
    const reach = u < 0 ? 0 : ease(u / 0.8) - ease((u - 3.1) / 0.8);
    const lift = u < 0 ? 0 : ease((u - 0.8) / 0.8) - ease((u - 2.4) / 0.7);
    const tilt = lift * (0.6 + 0.4 * ease((u - 1.5) / 0.5) - 0.4 * ease((u - 2.1) / 0.4));

    // Seated torso: a slight forward lean, breathing, head toward the screen (tipping back to sip).
    const breath = Math.sin(t * 1.6);
    r.spine.rotation.x = -0.1 + breath * 0.01;
    r.chest.rotation.x = -0.06 + breath * 0.008;
    r.neck.rotation.x = 0.05;
    r.head.rotation.set(-0.1 + Math.sin(t * 1.1) * 0.015 + lift * 0.42, Math.sin(t * 0.37) * 0.05 - lift * 0.1, 0);

    // Legs: thighs forward along the seat, shins down, feet flat on the floor.
    r.arms.forEach((a, i) => {
      const s = i === 0 ? -1 : 1;
      aim(a.upLeg, a.lowLeg, dir.set(s * 0.06, -0.04, -1));
      aim(a.lowLeg, a.foot, dir.set(s * 0.03, -1, 0.08));
      aim(a.foot, a.toe, dir.set(0, -0.35, -1));
    });

    // Mug follows the right hand while it's held.
    r.head.updateWorldMatrix(true, false);
    r.head.localToWorld(mouth.set(0, 0.0, -0.1));
    v1.set(0, MUG_LIP * Math.cos(tilt), MUG_LIP * Math.sin(tilt));
    v2.copy(mouth).sub(v1).add(v3.set(0.012, 0, -0.035));
    mugPos.copy(MUG_REST).lerp(v2, lift);
    const mug = mugRef.current;
    if (mug) {
      mug.position.copy(mugPos);
      mug.rotation.set(tilt, MUG_YAW, 0, "XYZ");
    }
    euler.set(tilt, MUG_YAW, 0, "XYZ");
    grip.copy(GRIP).applyEuler(euler).add(mugPos);
    handleDir.copy(HANDLE_OUT).applyEuler(euler);

    r.arms.forEach((a, i) => {
      const [la, lb] = r.lengths[i];
      // Typing target: a wandering hand with quick strikes.
      const strike = Math.max(0, Math.sin(t * 9 + i * 2.1 + Math.sin(t * 2.7 + i) * 2));
      wrist.copy(KEYS[i]).add(v1.set(Math.sin(t * 0.9 + i * 2) * 0.016, 0.008 - strike ** 4 * 0.008, Math.sin(t * 1.3 + i) * 0.008));
      // Holding the mug: wrist just outside the handle, fingers pointing back through it.
      const hold = i === 1 ? reach : 0;
      if (hold > 0) wrist.lerp(v1.copy(grip).addScaledVector(handleDir, 0.075).add(v2.set(0, -0.01, 0)), hold);

      a.upper.updateWorldMatrix(true, false);
      a.upper.getWorldPosition(shoulder);
      solveElbow(shoulder, wrist, la, lb, POLE[i], elbow);
      aim(a.upper, a.lower, dir.subVectors(elbow, shoulder));
      aim(a.lower, a.hand, dir.subVectors(wrist, elbow));

      // Hand: flat over the keys, palm down; around the mug, turned on its side through the handle.
      fore.subVectors(wrist, elbow).normalize();
      dir.set(fore.x * 0.6, -0.35, fore.z).normalize();
      if (hold > 0) dir.lerp(v2.copy(handleDir).negate(), hold).normalize();
      aim(a.hand, a.middle1, dir);
      if (hold > 0) twist(a.hand, dir, -hold * 1.45);

      // Fingers: relaxed curl with individual key taps; a full curl around the handle.
      const sign = i === 0 ? 1 : -1; // curl direction about each finger's local z
      a.fingers.forEach((chain, f) => {
        const tap = Math.max(0, Math.sin(t * (7 + f * 1.3) + f * 1.9 + i * 0.8)) ** 10;
        const relaxed = [0.35 - tap * 0.3 + f * 0.05, 0.55 + tap * 0.2, 0.3];
        const held = [1.25, 1.35, 0.9];
        chain.forEach((b, k) => b.rotateZ(sign * THREE.MathUtils.lerp(relaxed[k], held[k], hold)));
      });
      a.thumb.forEach((b, k) => b.rotateY(-sign * (k === 0 ? 0.25 + hold * 0.4 : 0.2 + hold * 0.3)));
    });
  });

  return (
    <group ref={body}>
      <Chair />
      <group position={[ROOT.x, SEAT_HIPS - STANDING_HIPS, ROOT.z + 0.06]}>
        <primitive object={rig.model} />
      </group>
      {createPortal(<Glasses />, rig.glasses)}
    </group>
  );
}

useGLTF.preload(MODEL, false, true);
