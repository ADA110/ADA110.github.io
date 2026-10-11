"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
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
const MODEL = "/models/character.glb";
/** Where the chair sits; the model's hips land just above the seat. */
const ROOT = new THREE.Vector3(-0.03, 0, 0.5);
const STANDING_HIPS = 1.008;
const SEAT_HIPS = 0.52;

const TYPE_TIME = 7;
const SIP_TIME = 4;

const SKIN = new THREE.Color("#c4906f");
const HAIR = new THREE.Color("#1b1513");
const JACKET = new THREE.Color("#55604c"); // Patagonia-style fleece, heathered green
const CAP = new THREE.Color("#25304a"); // navy
const PANTS = new THREE.Color("#5a5a62");

/** Wrists hover a few cm above the keys so the curled fingertips rest on the keytops. */
const KEYS = [new THREE.Vector3(-0.115, T + 0.072, 0.16), new THREE.Vector3(0.075, T + 0.072, 0.16)];
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
const UP = new THREE.Vector3(0, 1, 0);
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

const PALM_LOCAL = new THREE.Vector3(0, -1, 0); // VRoid T-pose: palms face down
const v4 = new THREE.Vector3();
const v5 = new THREE.Vector3();

/** Roll `bone` about world `axis` until its local `normal` faces `want` (both projected off the axis). */
function rollTo(bone: THREE.Object3D, axis: THREE.Vector3, normal: THREE.Vector3, want: THREE.Vector3) {
  bone.updateWorldMatrix(true, false);
  const cur = v4.copy(normal).applyQuaternion(bone.getWorldQuaternion(q2));
  cur.addScaledVector(axis, -cur.dot(axis));
  const des = v5.copy(want).addScaledVector(axis, -want.dot(axis));
  if (cur.lengthSq() < 1e-8 || des.lengthSq() < 1e-8) return;
  cur.normalize();
  des.normalize();
  const angle = Math.atan2(axis.dot(v1.crossVectors(cur, des)), cur.dot(des));
  twist(bone, axis, angle);
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
  // a full, short beard like the photo: up the cheeks toward the cheekbones, into the sideburns
  ctx.moveTo(30, 430);
  ctx.bezierCurveTo(70, 560, 200, 615, 320, 645);
  ctx.bezierCurveTo(390, 662, 430, 700, 470, 752);
  ctx.lineTo(554, 752);
  ctx.bezierCurveTo(594, 700, 634, 662, 704, 645);
  ctx.bezierCurveTo(824, 615, 954, 560, 994, 430);
  ctx.lineTo(1024, 430);
  ctx.lineTo(1024, 1024);
  ctx.lineTo(0, 1024);
  ctx.lineTo(0, 430);
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

/** Heathered fleece: fine light/dark speckle that tiles over any UVs (tinted by the material colour). */
let fleeceTex: THREE.CanvasTexture | null = null;
function fleece() {
  if (fleeceTex) return fleeceTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#d8d8d8";
  ctx.fillRect(0, 0, 256, 256);
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    const v = 190 + Math.floor(rand() * 65);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2);
  }
  fleeceTex = new THREE.CanvasTexture(c);
  fleeceTex.wrapS = fleeceTex.wrapT = THREE.RepeatWrapping;
  fleeceTex.repeat.set(10, 10);
  fleeceTex.colorSpace = THREE.SRGBColorSpace;
  return fleeceTex;
}

const fleeceMaterial = () => new THREE.MeshStandardMaterial({ color: JACKET, map: fleece(), roughness: 1 });

/** A zip-neck stand collar (the fleece's), on the upper-chest bone so it moves with the torso. */
function makeCollar() {
  const g = new THREE.CylinderGeometry(0.06, 0.068, 0.06, 32, 1, true, Math.PI + 0.12, Math.PI * 2 - 0.24);
  const collar = new THREE.Mesh(g, fleeceMaterial());
  (collar.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  collar.position.set(0, 0.162, 0.006); // around the base of the neck
  collar.castShadow = true;
  return collar;
}

/** Long sleeves: regroup the body-skin mesh so arms (and torso under the top) use the fleece; neck and hands keep skin. */
function sleeves(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry;
  const idx = g.index!.array;
  const pos = g.attributes.position;
  const p = new THREE.Vector3();
  const neck: number[] = [];
  const cloth: number[] = [];
  const isNeck = (i: number) => {
    p.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
    return (p.y > 1.4 && Math.abs(p.x) < 0.075) || Math.abs(p.x) > 0.6; // neck, and hands past the wrists
  };
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]];
    (tri.every(isNeck) ? neck : cloth).push(...tri);
  }
  const geo = g.clone();
  geo.setIndex([...cloth, ...neck]);
  geo.clearGroups();
  geo.addGroup(0, cloth.length, 0);
  geo.addGroup(cloth.length, neck.length, 1);
  mesh.geometry = geo;
  const skin = mesh.material as THREE.MeshStandardMaterial;
  mesh.material = [fleeceMaterial(), skin];
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
      if (/Tops/.test(n)) {
        out.map = fleece();
        out.color.copy(JACKET);
        out.roughness = 1;
      }
      if (/Bottoms/.test(n)) out.color.copy(PANTS);
      return out;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    const name = (mesh.material as THREE.Material).name;
    if (/Accessory_Tie/.test(name)) mesh.visible = false;
    // The arms are bare under short sleeves: everything on the main body skin except the neck becomes jacket.
    if (/Body_00_SKIN/.test(name) && mesh.geometry.index && mesh.geometry.index.count > 6000) sleeves(mesh);
  });
}


/** Hairline height (unit-sphere y) around the head: high at the forehead, above the ears, low at the nape. */
const hairlineAt = (th: number) => {
  const f = Math.abs(th) / Math.PI;
  return f < 0.5 ? THREE.MathUtils.lerp(0.42, 0.02, f / 0.5) : THREE.MathUtils.lerp(0.02, -0.62, (f - 0.5) / 0.5);
};
/** Where the cap's crown ends: just above the brows at the front, a little lower behind. */
const capEdgeAt = (th: number) => THREE.MathUtils.lerp(0.36, 0.1, Math.abs(th) / Math.PI);

/** A smooth band of an ellipsoid between two heights (unit-sphere y) that vary around the head. */
function shell(center: THREE.Vector3, R: THREE.Vector3, top: (th: number) => number, bottom: (th: number) => number) {
  const cols = 96;
  const rows = 18;
  const verts: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= cols; i++) {
    const th = -Math.PI + (i / cols) * Math.PI * 2;
    const y0 = top(th);
    const y1 = Math.min(bottom(th), y0);
    for (let k = 0; k <= rows; k++) {
      // spread rows evenly in angle, not in height, so the band stays smooth near the crown
      const a0 = Math.acos(THREE.MathUtils.clamp(y0, -1, 1));
      const a1 = Math.acos(THREE.MathUtils.clamp(y1, -1, 1));
      const a = THREE.MathUtils.lerp(a0, a1, k / rows);
      const y = Math.cos(a);
      const ring = Math.sin(a);
      verts.push(center.x + Math.sin(th) * ring * R.x, center.y + y * R.y, center.z - Math.cos(th) * ring * R.z);
    }
  }
  for (let i = 0; i < cols; i++)
    for (let k = 0; k < rows; k++) {
      const a = i * (rows + 1) + k;
      const b = a + rows + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1); // outward-facing
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Short, close-cropped hair: hugs the head under the cap, showing only below its edge down to the hairline. */
function shortHair(center: THREE.Vector3, radii: THREE.Vector3) {
  return shell(center, radii.clone().multiplyScalar(1.008), (th) => capEdgeAt(th) + 0.08, hairlineAt);
}

/** A navy baseball cap, brim forward, built in head-bone space around the skull ellipsoid. */
function makeCap(center: THREE.Vector3, radii: THREE.Vector3) {
  const mat = new THREE.MeshStandardMaterial({ color: CAP, roughness: 0.8, side: THREE.DoubleSide });
  const cap = new THREE.Group();
  const R = radii.clone().multiplyScalar(1.055);
  // crown, with a clean bottom edge
  cap.add(new THREE.Mesh(shell(center, new THREE.Vector3(R.x, R.y * 0.96, R.z), () => 1, capEdgeAt), mat));
  // brim: a curved visor from the front edge of the crown, dipping slightly at the sides
  const cols = 28;
  const rows = 5;
  const verts: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= cols; i++) {
    const th = THREE.MathUtils.lerp(-1.2, 1.2, i / cols); // angle from straight ahead
    const e = capEdgeAt(th);
    const ring = Math.sqrt(1 - e * e);
    const inner = new THREE.Vector3(Math.sin(th) * ring * R.x, e * R.y * 0.96, -Math.cos(th) * ring * R.z).add(center);
    const len = 0.078 * Math.pow(Math.cos(th * 0.92), 0.8);
    const out = new THREE.Vector3(Math.sin(th) * 0.35, -0.18, -Math.cos(th)).normalize();
    for (let k = 0; k <= rows; k++) {
      const f = k / rows;
      const p = inner.clone().addScaledVector(out, f * len);
      p.y -= f * f * 0.006 + Math.sin(th) ** 2 * f * 0.012;
      verts.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < cols; i++)
    for (let k = 0; k < rows; k++) {
      const a = i * (rows + 1) + k;
      const b = a + rows + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const brim = new THREE.BufferGeometry();
  brim.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  brim.setIndex(index);
  brim.computeVertexNormals();
  cap.add(new THREE.Mesh(brim, mat));
  // button on top
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), mat);
  button.position.set(center.x, center.y + R.y * 0.96, center.z);
  cap.add(button);
  cap.traverse((o) => (o.castShadow = true));
  return cap;
}

/** Rectangular dark frames like the photo, built for the head bone (face toward -z). */
function makeGlasses() {
  const mat = new THREE.MeshStandardMaterial({ color: "#1b1c20", roughness: 0.4 });
  const g = new THREE.Group();
  g.position.set(0, 0.064, -0.108);
  const lens = new THREE.Shape();
  lens.moveTo(-0.021, -0.013);
  lens.lineTo(0.021, -0.013);
  lens.lineTo(0.022, 0.014);
  lens.lineTo(-0.022, 0.014);
  lens.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.018, -0.0105);
  hole.lineTo(0.018, -0.0105);
  hole.lineTo(0.0188, 0.0112);
  hole.lineTo(-0.0188, 0.0112);
  hole.closePath();
  lens.holes.push(hole);
  const rim = new THREE.ExtrudeGeometry(lens, { depth: 0.003, bevelEnabled: false });
  const temple = new THREE.BoxGeometry(0.003, 0.004, 0.1);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(rim, mat);
    r.position.set(s * 0.028, 0, 0);
    r.rotation.y = s * 0.18;
    const t = new THREE.Mesh(temple, mat);
    t.position.set(s * 0.053, 0.008, 0.05);
    t.rotation.y = s * 0.08;
    g.add(r, t);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.003, 0.003), mat);
  bridge.position.set(0, 0.006, 0.002);
  g.add(bridge);
  return g;
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
    // Swap the model's anime hair for short hair under a cap, around the skull (head-bone space, measured from the source model).
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && /HAIR/.test((m.material as THREE.Material).name)) m.visible = false;
    });
    const skullCenter = new THREE.Vector3(0, 0.08, 0.002);
    const skullRadii = new THREE.Vector3(0.117, 0.128, 0.121);
    head.add(new THREE.Mesh(shortHair(skullCenter, skullRadii), new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.9 })));
    head.add(makeCap(skullCenter, skullRadii));
    bone("J_Bip_C_UpperChest").add(makeCollar());
    head.add(makeGlasses());
    const lengths = arms.map((a) => [a.lower.position.length(), a.hand.position.length()]);
    const rest = new Map<THREE.Object3D, THREE.Quaternion>();
    model.traverse((o) => rest.set(o, o.quaternion.clone()));
    return {
      model,
      arms,
      lengths,
      rest,
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
      palm: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const section = useStore.getState().section;
    if (body.current) body.current.visible = !(section === "projects" || section === "about" || section === "contact" || section === "notes");
    const r = rig;
    const { mugPos, grip, handleDir, mouth, elbow, wrist, shoulder, dir, fore, palm } = tmp;
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
      fore.subVectors(wrist, elbow).normalize();

      // Hand direction: forward and down onto the keys; through the mug handle while holding it.
      dir.set(fore.x * 0.6, -0.24, fore.z).normalize();
      if (hold > 0) dir.lerp(v2.copy(handleDir).negate(), hold).normalize();
      // Palm: down on the keys; holding the mug it turns on its side (thumb up), facing the handle.
      palm.set(i === 0 ? 0.15 : -0.15, -1, 0).normalize();
      if (hold > 0) palm.lerp(v2.crossVectors(UP, dir).normalize(), hold).normalize();
      // The forearm carries most of the roll, then the wrist finishes it.
      rollTo(a.lower, fore, PALM_LOCAL, palm);
      aim(a.hand, a.middle1, dir);
      rollTo(a.hand, dir, PALM_LOCAL, palm);

      // Fingers: relaxed curl with individual key taps; a full curl around the handle.
      const sign = i === 0 ? 1 : -1; // curl toward the palm about each finger's local z
      a.fingers.forEach((chain, f) => {
        // a keystroke is a quick dip of the whole finger, never a flick upward
        const tap = Math.max(0, Math.sin(t * (7 + f * 1.3) + f * 1.9 + i * 0.8)) ** 12;
        const relaxed = [0.28 + f * 0.04 + tap * 0.18, 0.3 + f * 0.03, 0.14];
        const held = [1.25, 1.35, 0.9];
        chain.forEach((b, k) => b.rotateZ(sign * THREE.MathUtils.lerp(relaxed[k], held[k], hold)));
      });
      // Thumb: tucked in beside the index finger (resting over the handle when holding), lightly bent.
      a.thumb.forEach((b, k) => {
        if (k === 0) b.rotateY(sign * (0.5 + hold * 0.15));
        b.rotateZ(sign * (k === 0 ? 0.2 + hold * 0.2 : 0.18 + hold * 0.3));
      });
    });
  });

  return (
    <group ref={body}>
      <Chair />
      <group position={[ROOT.x, SEAT_HIPS - STANDING_HIPS, ROOT.z + 0.06]}>
        <primitive object={rig.model} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL, false, true);
