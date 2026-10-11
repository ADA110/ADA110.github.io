"use client";

import { RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useStore } from "@/lib/store";
import { typing } from "@/lib/typing";
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

/** Things he does between bursts of typing, how long each takes, and how often (sips are the favourite). */
type Action = "type" | "sip" | "stretch" | "leanBack" | "think" | "window" | "neck";
const DURATION: Record<Exclude<Action, "type">, number> = { sip: 4, stretch: 4.4, leanBack: 5, think: 5, window: 4, neck: 3.2 };
const WEIGHTS: [Exclude<Action, "type">, number][] = [
  ["sip", 3],
  ["stretch", 1],
  ["leanBack", 1],
  ["think", 1.2],
  ["window", 1.4],
  ["neck", 0.8],
];
let lastAction: Action = "type";
function pickAction(): Action {
  const options = WEIGHTS.filter(([a]) => a !== lastAction); // never the same thing twice in a row
  let roll = Math.random() * options.reduce((n, [, w]) => n + w, 0);
  for (const [a, w] of options) if ((roll -= w) <= 0) return (lastAction = a);
  return (lastAction = "sip");
}

const poseOut = {
  wrist: new THREE.Vector3(),
  /** Optional waypoint the hand curves through on its way in and out (around the head, not through it). */
  via: null as THREE.Vector3 | null,
  viaPoint: new THREE.Vector3(),
  pole: new THREE.Vector3(),
  dir: new THREE.Vector3(),
  palm: new THREE.Vector3(),
  curl: [0, 0, 0],
};

/**
 * Where one hand goes for a non-typing action (world space), or null if it stays on the keys.
 * `s` is -1 for the left hand, +1 for the right.
 */
function armPose(action: Action, i: number, s: number, u: number, headPos: THREE.Vector3, head: THREE.Object3D) {
  const o = poseOut;
  o.via = null;
  switch (action) {
    case "stretch": // both arms up and out in a wide V (clear of the headphones), fingers open, a little sway
      o.wrist.set(headPos.x + s * (0.35 + Math.sin(u * 2.5) * 0.012), headPos.y + 0.32 + Math.sin(u * 2.5 + s) * 0.015, headPos.z + 0.03);
      o.pole.set(s, 0.1, 0.35).normalize();
      o.dir.set(s * 0.3, 1, 0).normalize();
      o.palm.set(-s * 0.5, 0, -1).normalize();
      o.curl = [0.06, 0.05, 0.04];
      return o;
    case "leanBack": {
      // Hands cupping the back of his head, outside the hood (its back is ~0.14 behind the head bone at
      // this height): palms toward the head, fingers curving round to meet in the middle, elbows out.
      head.localToWorld(o.wrist.set(s * 0.115, 0.125, 0.172));
      // swing up and out past the headphones, then in behind the head
      o.via = head.localToWorld(o.viaPoint.set(s * 0.34, 0.08, 0.07));
      o.pole.set(s, 0.35, -0.25).normalize();
      o.dir.set(-s, 0.12, 0.28).normalize().transformDirection(head.matrixWorld);
      o.palm.set(s * 0.15, 0.05, -1).normalize().transformDirection(head.matrixWorld);
      o.curl = [0.45, 0.5, 0.3];
      return o;
    }
    case "think": {
      // right fist under his chin, elbow down toward the desk; the left hand rests on the keys
      if (i === 0) return null;
      head.localToWorld(o.wrist.set(0.02, -0.15, -0.035));
      o.pole.set(0.35, -1, 0.15).normalize();
      o.dir.set(-0.15, 0.85, -0.5).normalize();
      o.palm.set(-1, 0, 0.2).normalize();
      o.curl = [1.25, 1.35, 0.95];
      return o;
    }
    default:
      return null;
  }
}

const SKIN = new THREE.Color("#c4906f");
const HAIR = new THREE.Color("#1b1513");
const HOODIE = new THREE.Color("#b3302b"); // red
const HOODIE_INSIDE = new THREE.Color("#6e1c19");
const PANTS = new THREE.Color("#5a5a62");

/** Wrists hover a few cm above the keys so the curled fingertips rest on the keytops. */
const KEYS = [new THREE.Vector3(-0.115, T + 0.072, 0.16), new THREE.Vector3(0.075, T + 0.072, 0.16)];
const POLE = [new THREE.Vector3(-0.7, -1, 0.4).normalize(), new THREE.Vector3(0.7, -1, 0.4).normalize()];
/** Where the hand holds the mug, in the mug's own frame (on the handle), and the handle's outward direction. */
const GRIP = new THREE.Vector3(0.064, 0.05, 0);
const HANDLE_OUT = new THREE.Vector3(1, 0, 0);
const MUG_Z = new THREE.Vector3(0, 0, 1);
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

/**
 * The hoodie's fabric: its texture's fold shading (minus a lavender tint) dyed red.
 */
function hoodieFabric(map: THREE.Texture) {
  const img = map.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  const W = (c.width = img.width);
  const H = (c.height = img.height);
  const ctx = c.getContext("2d")!;
  ctx.filter = "grayscale(1) brightness(1.08)";
  ctx.drawImage(img, 0, 0);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `#${HOODIE.getHexString()}`;
  ctx.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = map.flipY;
  tex.colorSpace = map.colorSpace;
  tex.channel = map.channel;
  return tex;
}

/** Drops body skin that the hoodie covers (torso and arms to the wrists), so it can't poke through the fabric; neck and hands stay. */
function hideCovered(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const idx = g.index!.array;
  const keep: number[] = [];
  const covered = (i: number) => {
    v1.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
    const neck = v1.y > 1.42 && Math.abs(v1.x) < 0.075;
    return v1.y > 0.92 && v1.y < 1.5 && Math.abs(v1.x) < 0.6 && !neck;
  };
  for (let t = 0; t < idx.length; t += 3) {
    if (!(covered(idx[t]) && covered(idx[t + 1]) && covered(idx[t + 2]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  g.setIndex(keep);
}

/**
 * Tailors the hoodie: removes the model's lowered hood (its own block of the texture: the middle columns
 * of the upper half) so only the raised hood shows, and takes in the baggy body and sleeves a little.
 * Positions are adjusted in bind-pose model space through the mesh's bind matrices.
 */
function tailor(mesh: THREE.SkinnedMesh) {
  const g = mesh.geometry;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const idx = g.index!.array;
  const keep: number[] = [];
  const p = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) {
    const u = (uv.getX(idx[t]) + uv.getX(idx[t + 1]) + uv.getX(idx[t + 2])) / 3;
    const v = (uv.getY(idx[t]) + uv.getY(idx[t + 1]) + uv.getY(idx[t + 2])) / 3;
    p.set(0, 0, 0);
    for (let k = 0; k < 3; k++) p.add(v1.fromBufferAttribute(pos, idx[t + k]).applyMatrix4(mesh.bindMatrix));
    p.divideScalar(3);
    // the hood block, but only behind the neck: its front pieces double as the hoodie's collar
    const hood = u > 0.3 && u < 0.7 && v < 0.5 && p.z > -0.02;
    if (!hood) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  g.setIndex(keep);

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix);
    if (p.y > 0.9 && p.y < 1.34 && Math.abs(p.x) < 0.22) {
      // body below the shoulders: a slimmer fit around the spine, easing back to full width at the shoulders
      const ease = smooth(p.y, 1.34, 1.24);
      p.x *= 1 - 0.07 * ease;
      p.z = -0.01 + (p.z + 0.01) * (1 - 0.1 * ease);
    } else if (Math.abs(p.x) >= 0.22 && p.y > 1.2) {
      // sleeves (arms out along x in the rest pose): closer around each arm
      p.y = 1.4 + (p.y - 1.4) * 0.88;
      p.z = -0.01 + (p.z + 0.01) * 0.88;
    }
    p.applyMatrix4(mesh.bindMatrixInverse);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
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
        out.color.set("#ffffff"); // the red is baked into the texture
        if (src.map) out.map = hoodieFabric(src.map);
      }
      if (/Bottoms/.test(n)) out.color.copy(PANTS);
      return out;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    if (/Body_00_SKIN/.test((mesh.material as THREE.Material).name) && mesh.isSkinnedMesh) {
      mesh.geometry = mesh.geometry.clone();
      hideCovered(mesh);
    }
    if (/Tops/.test((mesh.material as THREE.Material).name) && mesh.isSkinnedMesh) {
      mesh.geometry = mesh.geometry.clone(); // the loaded geometry is shared with the cached model
      tailor(mesh);
    }
  });
}


/** Sharp crease ridges: flat most of the way, peaking once per half-period. */
const ridge = (x: number) => (1 - Math.abs(Math.sin(x))) ** 3;

const smooth = (x: number, a: number, b: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * The hood, worn up: a snug shell just off the head that frames the face and drapes onto the shoulders
 * and upper back. Built in the model's rest pose and skinned to the same skeleton: the top follows the
 * head, the bottom stays with the chest, blending through the neck. (The model's own lowered hood is
 * removed in `tailor`.) Returns the outside and a darker inside.
 */
function makeHood(head: THREE.Bone, chest: THREE.Bone, fabric: THREE.Material) {
  // Its own two-bone skeleton, bound at the rest pose in model space (the file's bind data is in
  // compressed mesh space, so it can't be reused for plain geometry).
  const skeleton = new THREE.Skeleton([head, chest], [head.matrixWorld.clone().invert(), chest.matrixWorld.clone().invert()]);
  // meridian profile (distance from the head's vertical axis, height), crown to shoulders
  const profile = new THREE.SplineCurve(
    [
      [0.0, 1.776],
      [0.072, 1.764],
      [0.116, 1.722],
      [0.131, 1.65],
      [0.127, 1.575],
      [0.106, 1.51],
      [0.096, 1.47],
      [0.11, 1.43],
      [0.135, 1.397],
      [0.152, 1.37],
      [0.162, 1.35],
      [0.166, 1.332],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
  );
  const rows = 34;
  const cols = 72;
  const hi = 0;
  const ci = 1;
  const pos: number[] = [];
  const skinIndex: number[] = [];
  const skinWeight: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let k = 0; k <= rows; k++) {
    const pt = profile.getPoint(k / rows);
    const y = pt.y;
    // face opening: closed over the crown, widest around the eyes, narrowing to the zip at the neck
    // (wide enough at the temples that the glasses and a few curls show from the side)
    const open = 1.0 * smooth(y, 1.745, 1.68) * (1 - 0.8 * smooth(y, 1.52, 1.46));
    const lower = smooth(y, 1.6, 1.42); // drapes back and wider toward the shoulders
    for (let i = 0; i <= cols; i++) {
      // Columns sit at fixed angles all the way round (so the back is one smooth surface); inside the face
      // opening they're pulled to its edge, leaving the front open without bunching the mesh elsewhere.
      const raw = (i / cols) * Math.PI * 2; // 0 = straight ahead
      const th = raw < open ? open : raw > Math.PI * 2 - open ? Math.PI * 2 - open : raw;
      const back = Math.max(0, -Math.cos(th)); // 1 directly behind
      // Creases: soft vertical folds where the fabric gathers into the neck and drapes on the shoulders,
      // a few rolls across the back of the neck, and a shallow centre seam over the crown.
      // (faded out near the face opening, where the columns are pinched together)
      const gather = smooth(y, 1.56, 1.44) * smooth(Math.min(th, Math.PI * 2 - th) - open, 0.05, 0.5);
      const folds =
        0.0055 * ridge(th * 4.5 + y * 14) * gather +
        0.003 * ridge(th * 8.5 + 1.3) * gather * gather +
        0.0045 * ridge((y - 1.47) * 65) * back * smooth(y, 1.6, 1.53) * (1 - smooth(y, 1.47, 1.43)) +
        0.0025 * ridge(th * 2.5 + 0.6) * back * smooth(y, 1.62, 1.72) -
        0.0025 * Math.exp(-(((th - Math.PI) * 9) ** 2)) * smooth(y, 1.5, 1.6);
      const r = pt.x + folds;
      // the base settles onto the shoulders: wider side to side, shallower front to back
      const base = smooth(y, 1.43, 1.35);
      pos.push(Math.sin(th) * r * (0.95 + 0.3 * base), y, -Math.cos(th) * r * (1 - 0.32 * base) + 0.006 + 0.016 * back * lower);
      // UVs onto a plain patch of the hoodie's own fabric texture, so it shades exactly like the body
      uvs.push(0.42 + (i / cols) * 0.06, 0.64 + (k / rows) * 0.06);
      const w = smooth(y, 1.45, 1.57); // 1 → head, 0 → chest
      skinIndex.push(hi, ci, 0, 0);
      skinWeight.push(w, 1 - w, 0, 0);
    }
  }
  for (let k = 0; k < rows; k++)
    for (let i = 0; i < cols; i++) {
      const a = k * (cols + 1) + i;
      const b = a + cols + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b); // outward-facing, so the outline pass sees the hood
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  const make = (material: THREE.Material) => {
    const m = new THREE.SkinnedMesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.bind(skeleton, new THREE.Matrix4());
    return m;
  };
  // Outside: the hoodie's own material (same dye, texture and lighting response). Inside: darker.
  return [make(fabric), make(new THREE.MeshStandardMaterial({ color: HOODIE_INSIDE, roughness: 0.95, side: THREE.BackSide }))];
}

/** A few dark curls slipping out under the front of the hood, in head-bone space (face toward -z). */
function fringe() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const parts: THREE.BufferGeometry[] = [];
  const center = new THREE.Vector3(0, 0.08, 0.002);
  const radii = new THREE.Vector3(0.117, 0.128, 0.121);
  for (let i = 0; i < 40; i++) {
    const th = (rand() - 0.5) * 1.7;
    const y = 0.46 + rand() * 0.16;
    const ring = Math.sqrt(1 - y * y);
    const n = new THREE.Vector3(Math.sin(th) * ring, y, -Math.cos(th) * ring);
    const root = new THREE.Vector3(n.x * radii.x, n.y * radii.y, n.z * radii.z).multiplyScalar(1.02).add(center);
    const out = n.clone().multiplyScalar(0.6).add(new THREE.Vector3(0, -0.7, -0.35)).normalize();
    const tangent = new THREE.Vector3(1, 0, 0).cross(out).normalize();
    const side = new THREE.Vector3().crossVectors(out, tangent);
    const len = 0.022 + rand() * 0.014;
    const coil = 0.005 + rand() * 0.002;
    const turns = 0.8 + rand() * 0.7;
    const phase = rand() * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const f = k / 10;
      const w = phase + f * turns * Math.PI * 2;
      pts.push(root.clone().addScaledVector(out, f * len).addScaledVector(tangent, Math.cos(w) * coil * f).addScaledVector(side, Math.sin(w) * coil * f));
    }
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.0042 + rand() * 0.0012, 5, false));
  }
  const curls = new THREE.Mesh(mergeGeometries(parts)!, new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.85 }));
  curls.castShadow = true;
  return curls;
}

/**
 * Over-ear headphones worn over the hood, in head-bone space (face toward -z): a band arcing over the
 * top of the hood and cushioned cups resting on its sides. Sized to clear the hood's outer surface.
 */
function makeHeadphones() {
  const shell = new THREE.MeshStandardMaterial({ color: "#e9e2d6", roughness: 0.55 });
  const cushion = new THREE.MeshStandardMaterial({ color: "#2b2a2e", roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: "#b8b4ad", roughness: 0.35, metalness: 0.8 });
  const g = new THREE.Group();
  const cx = 0.149; // cup centre, just outside the hood at ear height
  const cy = 0.056;
  const cz = 0.008;
  // band: an arc around (0, 0.09) clearing the hood, from cup to cup
  const R = 0.157;
  const end = Math.asin(THREE.MathUtils.clamp((cy + 0.03 - 0.09) / R, -1, 1)); // where it meets the yokes
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 40; k++) {
    const a = THREE.MathUtils.lerp(Math.PI - end, end, k / 40); // left → over the top → right
    pts.push(new THREE.Vector3(Math.cos(a) * R, 0.09 + Math.sin(a) * R, cz));
  }
  const arc = new THREE.CatmullRomCurve3(pts);
  const band = new THREE.Mesh(new THREE.TubeGeometry(arc, 64, 0.0075, 10, false), shell);
  band.scale.set(1, 1, 1.4); // a flatter, wider band
  g.add(band);
  // padded underside along the top of the band
  const pad = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(9, 32).map((p) => new THREE.Vector3(p.x * 0.955, 0.09 + (p.y - 0.09) * 0.955, cz))), 32, 0.0068, 8, false),
    cushion,
  );
  pad.scale.set(1, 1, 1.5);
  g.add(pad);
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    side.position.set(s * cx, cy, cz);
    // yoke: a thin metal fork from the band down around the cup
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.0025, 6, 24, Math.PI), metal);
    yoke.rotation.set(0, Math.PI / 2, 0);
    yoke.position.set(s * 0.004, 0, 0);
    side.add(yoke);
    // cup: a rounded shell facing out, with a thick cushion against the hood
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.043, 0.026, 32), shell);
    cup.rotation.z = Math.PI / 2;
    side.add(cup);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.041, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    cap.rotation.z = -s * (Math.PI / 2);
    cap.scale.set(1, 0.32, 1);
    cap.position.x = s * 0.013;
    side.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0095, 12, 32), cushion);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = -s * 0.015;
    side.add(ring);
    g.add(side);
  }
  g.traverse((o) => (o.castShadow = true));
  return g;
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
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && /HAIR/.test((m.material as THREE.Material).name)) m.visible = false;
    });
    // Hood up: hide the model's hair; a few curls show under the front edge.
    head.add(fringe());
    model.updateMatrixWorld(true);
    let fabric: THREE.Material | null = null;
    model.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!fabric && mat && !Array.isArray(mat) && /Tops/.test(mat.name)) fabric = mat;
    });
    for (const m of makeHood(head as THREE.Bone, bone("J_Bip_C_UpperChest") as THREE.Bone, fabric!)) model.add(m);
    head.add(makeGlasses());
    head.add(makeHeadphones());
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
      handleSide: new THREE.Vector3(),
      mugUp: new THREE.Vector3(),
      palm: new THREE.Vector3(),
      headPos: new THREE.Vector3(),
      pole: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(
    () => () => {
      typing.present = false;
      typing.active = false;
    },
    [],
  );

  // What he's doing right now; typing in between every other action.
  const plan = useRef({ action: "type" as Action, start: -1.5, dur: 6 });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const section = useStore.getState().section;
    if (body.current) body.current.visible = !(section === "projects" || section === "about" || section === "notes");
    const r = rig;
    const { mugPos, grip, handleDir, handleSide, mugUp, mouth, elbow, wrist, shoulder, dir, fore, palm, headPos, pole } = tmp;
    r.rest.forEach((q, o) => o.quaternion.copy(q));

    // Pick the next thing to do when the current one ends.
    const P = plan.current;
    if (t - P.start > P.dur) {
      const next: Action = P.action === "type" ? pickAction() : "type";
      plan.current = { action: next, start: t, dur: next === "type" ? 5 + Math.random() * 4 : DURATION[next] };
    }
    const { action, start, dur } = plan.current;
    const u = t - start; // seconds into the current action
    typing.present = true;
    typing.active = action === "type"; // the monitor fills in only while his hands are on the keys
    // how far into a non-typing pose he is (eases in and back out)
    const k = action === "type" || action === "sip" ? 0 : ease(u / 0.9) - ease((u - (dur - 0.9)) / 0.9);

    // Sipping: reach for the mug, lift it to his lips, tip it, put it back.
    const su = action === "sip" ? u : -1;
    const reach = su < 0 ? 0 : ease(su / 0.8) - ease((su - 3.1) / 0.8);
    const lift = su < 0 ? 0 : ease((su - 0.8) / 0.8) - ease((su - 2.4) / 0.7);
    const tilt = lift * (0.6 + 0.4 * ease((su - 1.5) / 0.5) - 0.4 * ease((su - 2.1) / 0.4));

    // Whole-body pose for the action: spine lean (back is +), head pitch/yaw/roll.
    let spineX = 0;
    let spineY = 0;
    let headX = 0;
    let headY = 0;
    let headZ = 0;
    if (action === "stretch") {
      spineX = 0.2;
      headX = 0.32 + Math.sin(u * 2.5) * 0.03;
    } else if (action === "leanBack") {
      spineX = 0.26;
      headX = 0.12;
    } else if (action === "think") {
      spineX = -0.05;
      headX = 0.06;
      headZ = -0.1;
    } else if (action === "window") {
      spineY = 0.16;
      headY = 0.78;
      headX = 0.06;
    } else if (action === "neck") {
      headZ = Math.sin(u * 2.2) * 0.32;
      headX = 0.1 * Math.cos(u * 2.2);
    }

    // Seated torso: a slight forward lean, breathing, head toward the screen (tipping back to sip).
    const breath = Math.sin(t * 1.6);
    r.spine.rotation.set(-0.1 + breath * 0.01 + spineX * k, spineY * k, 0);
    r.chest.rotation.x = -0.06 + breath * 0.008 + spineX * 0.4 * k;
    r.neck.rotation.x = 0.05;
    r.head.rotation.set(
      -0.1 + Math.sin(t * 1.1) * 0.015 + lift * 0.42 + headX * k,
      Math.sin(t * 0.37) * 0.05 * (1 - k) - lift * 0.1 + headY * k,
      headZ * k,
    );

    // Legs: thighs forward along the seat, shins down, feet flat on the floor.
    r.arms.forEach((a, i) => {
      const s = i === 0 ? -1 : 1;
      aim(a.upLeg, a.lowLeg, dir.set(s * 0.06, -0.04, -1));
      aim(a.lowLeg, a.foot, dir.set(s * 0.03, -1, 0.08));
      aim(a.foot, a.toe, dir.set(0, -0.35, -1));
    });

    // Mug follows the right hand while it's held.
    r.head.updateWorldMatrix(true, false);
    r.head.getWorldPosition(headPos);
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
    handleSide.copy(MUG_Z).applyEuler(euler);
    mugUp.copy(UP).applyEuler(euler);

    r.arms.forEach((a, i) => {
      const s = i === 0 ? -1 : 1;
      const [la, lb] = r.lengths[i];
      // Typing target: a wandering hand with quick strikes (hands just rest on the keys between actions).
      const keys = action === "type" ? 1 : 0;
      const strike = Math.max(0, Math.sin(t * 9 + i * 2.1 + Math.sin(t * 2.7 + i) * 2)) * keys;
      wrist.copy(KEYS[i]).add(v1.set(Math.sin(t * 0.9 + i * 2) * 0.016 * keys, 0.008 - strike ** 4 * 0.008, Math.sin(t * 1.3 + i) * 0.008 * keys));
      // Holding the mug: a fist around the handle's outer bar, knuckles just past it, wrist out along the
      // handle, fingers wrapping through the loop and the thumb resting on top. The hand lifts in an arc.
      const hold = i === 1 ? reach : 0;
      if (hold > 0) {
        v1.copy(grip).addScaledVector(handleDir, 0.08).addScaledVector(handleSide, -0.022).addScaledVector(mugUp, 0.004);
        wrist.lerp(v1, hold);
        if (hold < 1) wrist.y += Math.sin(Math.PI * hold) * 0.035;
      }

      // Arm poses for the other actions (null: this hand stays on the keyboard).
      const pose = armPose(action, i, s, u, headPos, r.head);
      const w = pose ? k : 0;
      pole.copy(POLE[i]);
      if (pose) {
        if (pose.via) {
          // quadratic curve: keyboard → beside the head → behind it (and back the same way)
          const a0 = (1 - w) * (1 - w);
          const a1 = 2 * (1 - w) * w;
          wrist.multiplyScalar(a0).addScaledVector(pose.via, a1).addScaledVector(pose.wrist, w * w);
        } else wrist.lerp(pose.wrist, w);
        pole.lerp(pose.pole, w).normalize();
      }

      a.upper.updateWorldMatrix(true, false);
      a.upper.getWorldPosition(shoulder);
      solveElbow(shoulder, wrist, la, lb, pole, elbow);
      aim(a.upper, a.lower, dir.subVectors(elbow, shoulder));
      aim(a.lower, a.hand, dir.subVectors(wrist, elbow));
      fore.subVectors(wrist, elbow).normalize();

      // Hand direction: forward and down onto the keys; through the mug handle while holding it.
      dir.set(fore.x * 0.6, -0.24, fore.z).normalize();
      if (hold > 0) dir.lerp(v2.copy(handleDir).negate(), hold).normalize();
      // Palm: down on the keys; holding the mug it turns on its side (thumb up), facing the handle.
      palm.set(i === 0 ? 0.15 : -0.15, -1, 0).normalize();
      if (hold > 0) palm.lerp(v2.crossVectors(mugUp, dir).normalize(), hold).normalize();
      if (pose) {
        dir.lerp(pose.dir, w).normalize();
        palm.lerp(pose.palm, w).normalize();
      }
      // The forearm carries most of the roll, then the wrist finishes it.
      rollTo(a.lower, fore, PALM_LOCAL, palm);
      aim(a.hand, a.middle1, dir);
      rollTo(a.hand, dir, PALM_LOCAL, palm);

      // Fingers: relaxed curl with individual key taps; a full curl around the handle; posed otherwise.
      const sign = i === 0 ? 1 : -1; // curl toward the palm about each finger's local z
      a.fingers.forEach((chain, f) => {
        // a keystroke is a quick dip of the whole finger, never a flick upward
        const tap = Math.max(0, Math.sin(t * (7 + f * 1.3) + f * 1.9 + i * 0.8)) ** 12 * keys;
        const relaxed = [0.28 + f * 0.04 + tap * 0.18, 0.3 + f * 0.03, 0.14];
        const held = [1.4, 1.5, 1.0];
        chain.forEach((b, j) => {
          let c = THREE.MathUtils.lerp(relaxed[j], held[j], hold);
          if (pose) c = THREE.MathUtils.lerp(c, pose.curl[j], w);
          b.rotateZ(sign * c);
        });
      });
      // Thumb: tucked in beside the index finger (resting over the handle when holding), lightly bent.
      a.thumb.forEach((b, j) => {
        if (j === 0) b.rotateY(sign * (0.5 + hold * 0.35));
        b.rotateZ(sign * (j === 0 ? 0.2 + hold * 0.1 : 0.18 + hold * 0.15));
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
