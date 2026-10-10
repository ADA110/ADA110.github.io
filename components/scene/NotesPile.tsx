"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { site } from "@/content/site";
import { cssVar, paintedTexture } from "@/lib/textures";
import { Hotspot } from "./Hotspot";

// The 2019 CS 61A / 61B study notes: a wire wastebasket under the desk, overflowing,
// with a few printed pages sticking out and a clipped stack on the floor beside it.

const BIN = { x: 0.52, z: -0.24, r: 0.13, h: 0.3 };
const paperColor = "#efe9da"; // a little yellowed with age

/** A printed page of notes: course code, topic title, scribbled lines and a diagram box. */
function notePage(course: string, title: string, coffee = false) {
  return paintedTexture(256, 362, (ctx, w, h) => {
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, w, h);
    const sans = cssVar("--font-geist-sans", "sans-serif");
    ctx.fillStyle = "#8a7f6c";
    ctx.font = `600 11px ${sans}`;
    ctx.fillText(`${course} · TOPIC REVIEW`, 18, 26);
    ctx.fillStyle = "#2b2620";
    ctx.font = `700 19px ${sans}`;
    const words = title.split(" ");
    let line = "";
    let y = 52;
    for (const word of words) {
      if (ctx.measureText(line + " " + word).width > w - 36 && line) {
        ctx.fillText(line, 18, y);
        y += 22;
        line = word;
      } else line = line ? line + " " + word : word;
    }
    ctx.fillText(line, 18, y);
    y += 18;
    ctx.fillStyle = "#b9b0a0";
    for (let i = 0; i < 16; i++) {
      const ly = y + 8 + i * 15 + (i > 6 ? 70 : 0);
      if (ly > h - 16) break;
      ctx.fillRect(18 + (i % 5 === 0 ? 0 : 12), ly, w - 40 - ((i * 37) % 80), 4);
    }
    // a little box-and-pointer diagram
    ctx.strokeStyle = "#6e665a";
    ctx.lineWidth = 2;
    const by = y + 8 + 7 * 15;
    for (let i = 0; i < 3; i++) {
      ctx.strokeRect(30 + i * 62, by, 40, 22);
      ctx.beginPath();
      ctx.moveTo(30 + i * 62 + 30, by + 11);
      ctx.lineTo(30 + i * 62 + 62, by + 11);
      ctx.stroke();
    }
    if (coffee) {
      ctx.strokeStyle = "rgba(120, 72, 30, 0.35)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(w - 70, h - 90, 38, 0.3, Math.PI * 1.85);
      ctx.stroke();
    }
  });
}

/** Crumpled paper: an icosphere with its vertices pushed around, flat-shaded so the folds catch light. */
function crumpledGeometry(seed: number) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // Hash the position so shared corners move together and the ball stays closed.
    const k = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719 + seed * 4.1) * 43758.5453;
    const n = k - Math.floor(k);
    v.multiplyScalar(0.72 + n * 0.45);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function useWireTexture() {
  return useMemo(() => {
    const { tex } = paintedTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      for (let i = -h; i < w + h; i += 22) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h, h);
        ctx.moveTo(i + h, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
    });
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 1.6);
    return tex;
  }, []);
}

export function NotesPile() {
  const wire = useWireTexture();
  const [a, b] = site.notes.courses;
  const pages = useMemo(
    () => [
      notePage(a.code, a.topics[0].title, true),
      notePage(b.code, b.topics[5].title),
      notePage(a.code, a.topics[7].title),
      notePage(b.code, b.topics[2].title),
    ],
    [a, b],
  );
  const balls = useMemo(() => [1, 2, 3, 4, 5, 6, 7].map(crumpledGeometry), []);
  const paper = <meshStandardMaterial color={paperColor} roughness={0.92} flatShading />;

  // Crumpled balls: [x, y, z, size] relative to the bin; the last two spilled onto the floor.
  const ballSpots: [number, number, number, number][] = [
    [-0.04, 0.27, 0.02, 0.05],
    [0.05, 0.29, -0.03, 0.045],
    [0.0, 0.33, 0.05, 0.042],
    [-0.06, 0.31, -0.06, 0.04],
    [0.06, 0.25, 0.06, 0.045],
    [0.2, 0.035, 0.12, 0.036],
    [0.27, 0.03, -0.02, 0.032],
  ];

  return (
    <Hotspot id="notes" labelPosition={[BIN.x, BIN.h + 0.16, BIN.z]} lift={0}>
      <group position={[BIN.x, 0, BIN.z]}>
        {/* wire mesh wastebasket */}
        <mesh position={[0, BIN.h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[BIN.r, BIN.r * 0.82, BIN.h, 40, 1, true]} />
          <meshStandardMaterial color="#26272a" metalness={0.85} roughness={0.35} alphaMap={wire} alphaTest={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, BIN.h, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[BIN.r, 0.005, 8, 48]} />
          <meshStandardMaterial color="#26272a" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[BIN.r * 0.82, 40]} />
          <meshStandardMaterial color="#26272a" metalness={0.85} roughness={0.4} />
        </mesh>
        {/* pages sticking out of the bin */}
        {pages.slice(0, 3).map((pg, i) => (
          <mesh
            key={i}
            position={[(i - 1) * 0.045, 0.27, (i % 2 ? -0.03 : 0.02)]}
            rotation={[-0.25 + i * 0.12, (i - 1) * 0.5, (i - 1) * 0.18]}
            castShadow
          >
            <planeGeometry args={[0.15, 0.21]} />
            <meshStandardMaterial map={pg.tex} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {ballSpots.map(([x, y, z, s], i) => (
          <mesh key={i} geometry={balls[i]} position={[x, y, z]} scale={s} rotation={[i, i * 2, 0]} castShadow receiveShadow>
            {paper}
          </mesh>
        ))}
      </group>
      {/* a clipped stack of notes on the floor beside the bin */}
      <group position={[BIN.x - 0.29, 0, BIN.z + 0.1]} rotation={[0, 0.35, 0]}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[(i % 3) * 0.002, 0.002 + i * 0.0022, ((i * 7) % 3) * 0.002]} rotation={[0, (i % 4) * 0.03 - 0.04, 0]} receiveShadow castShadow={i === 8}>
            <boxGeometry args={[0.21, 0.0018, 0.297]} />
            <meshStandardMaterial color={i % 2 ? paperColor : "#f3eee2"} roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 0.0223, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.21, 0.297]} />
          <meshStandardMaterial map={pages[3].tex} roughness={0.9} />
        </mesh>
        {/* binder clip */}
        <mesh position={[0, 0.014, -0.145]} castShadow>
          <boxGeometry args={[0.04, 0.028, 0.02]} />
          <meshStandardMaterial color="#111" metalness={0.6} roughness={0.35} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.012, 0.032, -0.16]} rotation={[0.9, 0, 0]}>
            <torusGeometry args={[0.012, 0.0015, 6, 16, Math.PI]} />
            <meshStandardMaterial color="#c7c9cc" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </group>
    </Hotspot>
  );
}
