"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "@/content/site";
import { useStore } from "@/lib/store";
import { playPrinter } from "@/lib/sound";
import { cork, cssVar, paint, paintedTexture, wrapText } from "@/lib/textures";
import { Cable } from "./helpers";
import { Hotspot } from "./Hotspot";
import { useScanned } from "./pbr";
import { ROOM } from "./Room";

const WALL = ROOM.back;

// ---------------- Corkboard (experience) ----------------

const CARD_COLORS = ["#fffdf6", "#fff6c9", "#e7f1ff", "#ffe9e1"];
const PIN_COLORS = ["#d9443a", "#2f6fdf", "#e0a526", "#2a9d6f"];

export const CORKBOARD = { x: -0.38, y: 1.64, w: 0.86, h: 0.56 };

function Corkboard() {
  const tex = cork();
  const { x, y, w, h } = CORKBOARD;
  const jobs = site.experience.slice(0, 4);
  const cards = useMemo(
    () =>
      jobs.map((job, i) =>
        paintedTexture(360, 260, (ctx, W, H) => {
          ctx.fillStyle = CARD_COLORS[i % CARD_COLORS.length];
          ctx.fillRect(0, 0, W, H);
          // ruled lines
          ctx.strokeStyle = "rgba(60,110,200,0.18)";
          ctx.lineWidth = 2;
          for (let ly = 92; ly < H; ly += 34) {
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.lineTo(W, ly);
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(220,60,60,0.3)";
          ctx.beginPath();
          ctx.moveTo(0, 58);
          ctx.lineTo(W, 58);
          ctx.stroke();
          const hand = cssVar("--font-hand", "cursive");
          ctx.fillStyle = "#1c2a4a";
          ctx.font = `700 34px ${hand}`;
          wrapText(ctx, job.short ?? job.company, 18, 44, W - 36, 34, 1);
          ctx.font = `30px ${hand}`;
          const yy = wrapText(ctx, job.role, 18, 120, W - 36, 34, 2);
          ctx.fillStyle = "#b03a2e";
          ctx.font = `26px ${hand}`;
          ctx.fillText(job.dates ?? job.location ?? "", 18, Math.min(yy + 8, H - 20));
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // Card layout on the board (local coords, meters).
  const spots: [number, number, number][] = [
    [-0.26, 0.11, -0.05],
    [0.04, 0.13, 0.04],
    [-0.12, -0.12, 0.03],
    [0.24, -0.08, -0.06],
  ];
  const pins = spots.map(([cx, cy]) => [cx, cy + 0.055] as [number, number]);
  const frame = { color: "#5a3b22", roughness: 0.6 } as const;
  return (
    <Hotspot id="experience" labelPosition={[x, y, WALL + 0.05]}>
      <group position={[x, y, WALL + 0.012]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[w, h, 0.012]} />
          <meshStandardMaterial {...tex} roughness={1} />
        </mesh>
        {[
          [0, h / 2 + 0.012, w + 0.048, 0.024],
          [0, -h / 2 - 0.012, w + 0.048, 0.024],
          [w / 2 + 0.012, 0, 0.024, h],
          [-w / 2 - 0.012, 0, 0.024, h],
        ].map(([fx, fy, fw, fh], i) => (
          <RoundedBox key={i} args={[fw, fh, 0.026]} radius={0.004} position={[fx, fy, 0.006]} castShadow receiveShadow>
            <meshStandardMaterial {...frame} />
          </RoundedBox>
        ))}
        {spots.slice(0, jobs.length).map(([cx, cy, rot], i) => (
          <group key={i} position={[cx, cy, 0.008 + i * 0.0006]} rotation={[0, 0, rot]}>
            <mesh castShadow receiveShadow>
              <planeGeometry args={[0.2, 0.145]} />
              <meshStandardMaterial map={cards[i].tex} roughness={0.85} />
            </mesh>
          </group>
        ))}
        {/* push pins */}
        {pins.slice(0, jobs.length).map(([px, py], i) => (
          <group key={i} position={[px, py, 0.014]}>
            <mesh castShadow>
              <sphereGeometry args={[0.009, 20, 14]} />
              <meshPhysicalMaterial color={PIN_COLORS[i % PIN_COLORS.length]} roughness={0.15} clearcoat={1} />
            </mesh>
            <mesh position={[0, 0, -0.006]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0055, 0.007, 0.006, 16]} />
              <meshPhysicalMaterial color={PIN_COLORS[i % PIN_COLORS.length]} roughness={0.15} clearcoat={1} />
            </mesh>
          </group>
        ))}
        {/* red string connecting the timeline */}
        {jobs.length > 1 && (
          <Cable
            points={pins.slice(0, jobs.length).map(([px, py]) => [px, py, 0.016] as [number, number, number])}
            radius={0.0012}
            color="#b3261e"
          />
        )}
      </group>
    </Hotspot>
  );
}

// ---------------- Bookshelf (skills) ----------------

export const SHELF = { x: 1.72, w: 0.82, d: 0.3, h: 1.86 };
const SHELF_YS = [0.06, 0.42, 0.78, 1.14, 1.5, SHELF.h - 0.011];

const BOOK_COLORS = ["#1f3a5f", "#8c2f2b", "#2e5e4e", "#c9a227", "#3c3c3c", "#6b4c9a", "#d8cfc0", "#b5562e", "#24524f", "#9c7a54"];

function Book({ title, color, width, height, depth, position, tilt = 0 }: { title: string; color: string; width: number; height: number; depth: number; position: [number, number, number]; tilt?: number }) {
  const ref = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const spine = useMemo(
    () =>
      paintedTexture(96, 512, (ctx, W, H) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, H);
        const light = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
        ctx.fillStyle = light ? "#2a2a2a" : "rgba(255,255,255,0.88)";
        ctx.fillRect(0, 26, W, 3);
        ctx.fillRect(0, H - 30, W, 3);
        ctx.save();
        ctx.translate(W / 2 + 10, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.font = `600 ${title.length > 10 ? 30 : 36}px ${cssVar("--font-serif", "serif")}`;
        ctx.fillText(title, 0, 0, H - 80);
        ctx.restore();
      }),
    [title, color],
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    const goal = hover.current ? 0.045 : 0;
    ref.current.position.z += (goal - ref.current.position.z) * (1 - Math.exp(-10 * dt));
  });
  const mats = useMemo(() => {
    const cover = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const pages = new THREE.MeshStandardMaterial({ color: "#efe8d8", roughness: 0.95 });
    const spineMat = new THREE.MeshStandardMaterial({ map: spine.tex, roughness: 0.65 });
    // box faces: +x, -x, +y, -y, +z (spine, facing room), -z
    return [cover, cover, pages, pages, spineMat, pages];
  }, [color, spine]);
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh
          material={mats}
          position={[0, height / 2, 0]}
          rotation={[0, 0, tilt]}
          castShadow
          receiveShadow
          onPointerOver={() => (hover.current = true)}
          onPointerOut={() => (hover.current = false)}
        >
          <boxGeometry args={[width, height, depth]} />
        </mesh>
      </group>
    </group>
  );
}

function Bookshelf() {
  const { x, w, d, h } = SHELF;
  const oak = useScanned("white_oak_veneer", [1, 2], Math.PI / 2);
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ ...oak }), [oak]);
  const z = WALL + d / 2;
  const t = 0.022;
  const shelfYs = SHELF_YS;
  // One shelf per skill group (shelves 1–4), books left to right; a lying stack fills the right end.
  const books = useMemo(() => {
    const out: { title: string; color: string; width: number; height: number; depth: number; pos: [number, number, number]; tilt: number }[] = [];
    let n = 0;
    site.skills.slice(0, 4).forEach((group, gi) => {
      let cursor = -w / 2 + t + 0.015;
      group.items.forEach((title) => {
        const width = 0.034 + ((n * 13) % 5) * 0.005;
        const height = 0.23 + ((n * 7) % 6) * 0.015;
        out.push({
          title,
          color: BOOK_COLORS[(n * 3) % BOOK_COLORS.length],
          width,
          height,
          depth: 0.17 + ((n * 5) % 3) * 0.015,
          pos: [cursor + width / 2, shelfYs[gi + 1] + t / 2, 0.03],
          tilt: 0,
        });
        cursor += width + 0.003;
        n++;
      });
    });
    return out;
  }, [w, t, shelfYs]);

  return (
    <Hotspot id="skills" labelPosition={[x, h + 0.08, z]} lift={0}>
      <group position={[x, 0, z]}>
        {/* carcass */}
        <mesh material={woodMat} position={[-w / 2 + t / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d]} />
        </mesh>
        <mesh material={woodMat} position={[w / 2 - t / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, h, d]} />
        </mesh>
        <mesh material={woodMat} position={[0, h / 2, -d / 2 + 0.005]} receiveShadow>
          <boxGeometry args={[w, h, 0.01]} />
        </mesh>
        {shelfYs.map((sy) => (
          <mesh key={sy} material={woodMat} position={[0, sy, 0]} castShadow receiveShadow>
            <boxGeometry args={[w - t * 2, t, d]} />
          </mesh>
        ))}
        {books.map((b, i) => (
          <Book key={i} title={b.title} color={b.color} width={b.width} height={b.height} depth={b.depth} position={b.pos} tilt={b.tilt} />
        ))}
        {/* lying stacks at the right end of each skill shelf */}
        {[1, 2, 3, 4].map((si) => (
          <group key={si} position={[w / 2 - t - 0.13, shelfYs[si] + t / 2, 0.02]}>
            {[0, 1, 2].slice(0, 2 + (si % 2)).map((i) => (
              <RoundedBox key={i} args={[0.2 - i * 0.02, 0.032, 0.15 - i * 0.01]} radius={0.003} position={[0, 0.016 + i * 0.032, 0]} rotation={[0, (i - 1) * 0.1 + si * 0.05, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={BOOK_COLORS[(i + si * 2 + 4) % BOOK_COLORS.length]} roughness={0.7} />
              </RoundedBox>
            ))}
          </group>
        ))}
        {/* vase on top, storage box + ball on the bottom shelf */}
        <mesh position={[-0.2, h + 0.09, 0.02]} castShadow receiveShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.18, 40]} />
          <meshPhysicalMaterial color="#20302c" roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh position={[0.2, shelfYs[0] + t / 2 + 0.12, 0.01]} castShadow receiveShadow>
          <boxGeometry args={[0.32, 0.24, 0.24]} />
          <meshStandardMaterial color="#b9a68a" roughness={0.95} />
        </mesh>
        <mesh position={[-0.18, shelfYs[0] + t / 2 + 0.05, 0.02]} castShadow receiveShadow>
          <sphereGeometry args={[0.05, 32, 20]} />
          <meshStandardMaterial color="#c4552d" roughness={0.6} />
        </mesh>
      </group>
    </Hotspot>
  );
}

// ---------------- Printer + cabinet (resume) ----------------

export const PRINTER = { x: 1.08, cabinetH: 0.62 };

function Printer() {
  const paper = useRef<THREE.Group>(null);
  const job = useStore((s) => s.printJob);
  const startedAt = useRef<number | null>(null);
  const lastJob = useRef(job);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const page = useMemo(
    () =>
      paintedTexture(420, 560, (ctx, W, H) => {
        ctx.fillStyle = "#fbfaf7";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#111";
        ctx.font = `700 30px ${cssVar("--font-geist-sans", "sans-serif")}`;
        ctx.fillText(site.name, 34, 60);
        ctx.fillStyle = "#666";
        ctx.font = `400 16px ${cssVar("--font-geist-sans", "sans-serif")}`;
        ctx.fillText(site.emails[0], 34, 86);
        ctx.fillStyle = "#ccc";
        for (let i = 0; i < 14; i++) {
          const y = 128 + i * 28 + Math.floor(i / 4) * 16;
          ctx.fillRect(34, y, i % 4 === 0 ? 120 : W - 68 - ((i * 37) % 90), i % 4 === 0 ? 9 : 6);
        }
      }),
    [],
  );
  const { x, cabinetH } = PRINTER;
  const z = WALL + 0.26;
  const body = paint("#ecebe7");
  const cab = paint("#2f3134");

  useFrame((_, dt) => {
    if (job !== lastJob.current) {
      lastJob.current = job;
      startedAt.current = 0;
      playPrinter();
    }
    if (!paper.current) return;
    if (startedAt.current !== null) {
      startedAt.current += dt;
      const t = Math.min(1, Math.max(0, (startedAt.current - 0.2) / 1.6));
      paper.current.position.z = -0.12 + t * 0.2;
      paper.current.visible = true;
      if (led.current) led.current.emissiveIntensity = Math.sin(startedAt.current * 18) > 0 && t < 1 ? 4 : 1.5;
      if (startedAt.current > 9) startedAt.current = null;
    } else {
      paper.current.visible = paper.current.position.z > -0.11;
      if (led.current) led.current.emissiveIntensity = 1.5;
    }
  });

  return (
    <Hotspot id="resume" labelPosition={[x, cabinetH + 0.3, z]}>
      {/* cabinet */}
      <group position={[x, 0, z]}>
        <RoundedBox args={[0.46, cabinetH, 0.44]} radius={0.008} position={[0, cabinetH / 2 + 0.03, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...cab} roughness={1} />
        </RoundedBox>
        {[0.2, 0.44].map((dy) => (
          <group key={dy}>
            <mesh position={[0, dy + 0.03, 0.2205]}>
              <boxGeometry args={[0.44, 0.002, 0.002]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0, dy + 0.13, 0.226]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.005, 0.005, 0.14, 12]} />
              <meshStandardMaterial color="#b8914f" metalness={1} roughness={0.3} />
            </mesh>
          </group>
        ))}
        {/* feet */}
        {[-0.19, 0.19].map((fx) =>
          [-0.18, 0.18].map((fz) => (
            <mesh key={`${fx}${fz}`} position={[fx, 0.015, fz]}>
              <cylinderGeometry args={[0.012, 0.01, 0.03, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          )),
        )}
      </group>
      {/* printer */}
      <group position={[x, cabinetH + 0.03, z - 0.01]}>
        <RoundedBox args={[0.42, 0.15, 0.32]} radius={0.018} smoothness={4} position={[0, 0.075, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...body} roughness={1} />
        </RoundedBox>
        <RoundedBox args={[0.4, 0.02, 0.3]} radius={0.008} position={[0, 0.157, -0.004]} castShadow receiveShadow>
          <meshStandardMaterial color="#d9d8d3" roughness={0.45} />
        </RoundedBox>
        {/* output slot + tray */}
        <mesh position={[0, 0.05, 0.161]}>
          <boxGeometry args={[0.3, 0.012, 0.004]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.03, 0.2]} rotation={[0.08, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.006, 0.09]} />
          <meshStandardMaterial color="#c9c8c3" roughness={0.5} />
        </mesh>
        {/* control panel */}
        <mesh position={[0.15, 0.12, 0.161]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.07, 0.035]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.2} />
        </mesh>
        <mesh position={[0.11, 0.12, 0.1615]}>
          <circleGeometry args={[0.004, 16]} />
          <meshStandardMaterial ref={led} color="#1fd17a" emissive="#1fd17a" emissiveIntensity={1.5} />
        </mesh>
        {/* paper feed at back */}
        <mesh position={[0, 0.2, -0.17]} rotation={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.16, 0.006]} />
          <meshStandardMaterial color="#f7f6f2" roughness={0.9} />
        </mesh>
        {/* the printed page */}
        <group ref={paper} position={[0, 0.052, -0.12]} visible={false}>
          <mesh position={[0, 0, 0.14]} rotation={[-Math.PI / 2 + 0.06, 0, 0]} castShadow>
            <planeGeometry args={[0.21, 0.28]} />
            <meshStandardMaterial map={page.tex} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </Hotspot>
  );
}

export function WallDecor() {
  return (
    <>
      <Corkboard />
      <Bookshelf />
      <Printer />
    </>
  );
}
