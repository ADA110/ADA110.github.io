"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { site } from "@/content/site";
import { drawIcon } from "@/lib/icons";
import { useStore } from "@/lib/store";
import { cssVar, paintedTexture, roundRect, wrapText } from "@/lib/textures";
import { DESK } from "./Desk";
import { Cable } from "./helpers";
import { Hotspot } from "./Hotspot";

export const MONITOR = { x: 0, y: 1.065, z: -0.33, w: 0.6, h: 0.3375 };

// The code that "types itself" on screen while idle.
const CODE: [string, string][][] = [
  [["kw", "const "], ["var", "me"], ["op", " = {"]],
  [["key", "  name"], ["op", ": "], ["str", `"${site.name}"`], ["op", ","]],
  [["key", "  based"], ["op", ": "], ["str", `"${site.location}"`], ["op", ","]],
  [["key", "  loves"], ["op", ": ["], ["str", '"3D"'], ["op", ", "], ["str", '"systems"'], ["op", ", "], ["str", '"coffee"'], ["op", "],"]],
  [["key", "  status"], ["op", ": "], ["str", '"open to cool problems"'], ["op", ","]],
  [["op", "};"]],
  [],
  [["com", "// psst: click the things on the desk"]],
  [["kw", "export default "], ["fn", "render"], ["op", "("], ["var", "me"], ["op", ");"]],
];
const COLORS: Record<string, string> = {
  kw: "#c792ea",
  var: "#e6e6e6",
  op: "#89ddff",
  key: "#82aaff",
  str: "#c3e88d",
  com: "#697098",
  fn: "#ffcb6b",
};

function drawEditor(ctx: CanvasRenderingContext2D, w: number, h: number, chars: number, blink: boolean) {
  const mono = cssVar("--font-geist-mono", "monospace");
  ctx.fillStyle = "#0f1117";
  ctx.fillRect(0, 0, w, h);
  // title bar
  ctx.fillStyle = "#171a22";
  ctx.fillRect(0, 0, w, 44);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(26 + i * 22, 22, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#0f1117";
  roundRect(ctx, 110, 8, 150, 36, 8);
  ctx.fill();
  ctx.fillStyle = "#c9cdd8";
  ctx.font = `500 17px ${mono}`;
  ctx.fillText("about-me.ts", 128, 32);
  // sidebar
  ctx.fillStyle = "#13161d";
  ctx.fillRect(0, 44, 190, h - 44);
  ctx.font = `15px ${mono}`;
  const files = ["▾ src", "   about-me.ts", "   projects/", "   experience/", "   skills.json", "   contact.md", "  resume.pdf"];
  files.forEach((f, i) => {
    ctx.fillStyle = i === 1 ? "#e6e6e6" : "#7d8494";
    if (i === 1) {
      ctx.fillStyle = "#1f2430";
      ctx.fillRect(0, 62 + i * 28, 190, 26);
      ctx.fillStyle = "#e6e6e6";
    }
    ctx.fillText(f, 16, 80 + i * 28);
  });
  // code
  ctx.font = `20px ${mono}`;
  let remaining = chars;
  let cursor: [number, number] | null = null;
  CODE.forEach((line, i) => {
    const y = 92 + i * 34;
    ctx.fillStyle = "#3d4352";
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), 240, y);
    ctx.textAlign = "left";
    let x = 262;
    for (const [kind, text] of line) {
      if (remaining <= 0) break;
      const shown = text.slice(0, remaining);
      remaining -= text.length;
      ctx.fillStyle = COLORS[kind];
      ctx.fillText(shown, x, y);
      x += ctx.measureText(shown).width;
    }
    if (remaining > 0) remaining -= 1;
    else if (!cursor) cursor = [x, y];
  });
  if (cursor && blink) {
    ctx.fillStyle = "#e6e6e6";
    ctx.fillRect(cursor[0] + 1, cursor[1] - 18, 10, 23);
  }
  // status bar
  ctx.fillStyle = "#3b6cf6";
  ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = "#fff";
  ctx.font = `14px ${mono}`;
  ctx.fillText("● main    TypeScript    UTF-8", 14, h - 9);
}

function drawProjects(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sans = cssVar("--font-geist-sans", "sans-serif");
  ctx.fillStyle = "#f4f2ee";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111";
  ctx.font = `700 40px ${sans}`;
  ctx.fillText("Projects", 48, 76);
  ctx.fillStyle = "#777";
  ctx.font = `400 18px ${sans}`;
  ctx.fillText(`${site.projects.length} things I've built. Details in the panel →`, 50, 108);
  const cols = 2;
  const pad = 48;
  const gap = 24;
  const cw = (w - pad * 2 - gap) / cols;
  const ch = 185;
  site.projects.slice(0, 4).forEach((p, i) => {
    const x = pad + (i % cols) * (cw + gap);
    const y = 136 + Math.floor(i / cols) * (ch + gap);
    ctx.fillStyle = "#fff";
    roundRect(ctx, x, y, cw, ch, 14);
    ctx.fill();
    const grad = ctx.createLinearGradient(x, y, x + cw, y + 110);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, "#111");
    ctx.fillStyle = grad;
    roundRect(ctx, x + 10, y + 10, cw - 20, 100, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    drawIcon(ctx, p.icon, x + 24, y + 54, 44);
    ctx.fillStyle = "#111";
    ctx.font = `600 22px ${sans}`;
    ctx.fillText(p.title, x + 14, y + 142);
    ctx.fillStyle = "#888";
    ctx.font = `400 15px ${sans}`;
    wrapText(ctx, p.tags.join(" · "), x + 14, y + 168, cw - 28, 18, 1);
  });
}

export function Monitor() {
  const screen = useMemo(() => paintedTexture(1024, 576, (ctx, w, h) => drawEditor(ctx, w, h, 0, true)), []);
  const state = useRef({ chars: 0, acc: 0, blink: true, mode: "editor" as "editor" | "projects", hold: 0 });
  const total = useMemo(() => CODE.flat().reduce((n, [, t]) => n + t.length, 0) + CODE.length, []);
  const screenMat = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => () => screen.tex.dispose(), [screen]);

  useFrame((_, dt) => {
    const s = state.current;
    const { section, lampOn } = useStore.getState();
    const mode = section === "projects" ? "projects" : "editor";
    s.acc += dt;
    if (mode !== s.mode) {
      s.mode = mode;
      s.acc = 1;
    }
    if (s.acc < 0.09) return;
    const ticks = s.acc;
    s.acc = 0;
    if (mode === "projects") {
      screen.ctx.clearRect(0, 0, 1024, 576);
      drawProjects(screen.ctx, 1024, 576);
    } else {
      if (s.chars < total) s.chars += Math.max(1, Math.round(ticks * 22));
      else if ((s.hold += ticks) > 6) {
        s.chars = 0;
        s.hold = 0;
      }
      s.blink = Math.floor(performance.now() / 500) % 2 === 0;
      drawEditor(screen.ctx, 1024, 576, s.chars, s.blink);
    }
    screen.tex.needsUpdate = true;
    if (screenMat.current) screenMat.current.emissiveIntensity = lampOn ? 1.05 : 0.8;
  });

  const { x, y, z, w, h } = MONITOR;
  const note = useMemo(
    () =>
      paintedTexture(256, 256, (ctx, W, H) => {
        ctx.fillStyle = "#ffe066";
        ctx.fillRect(0, 0, W, H);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(0,0,0,0.07)");
        g.addColorStop(0.25, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#1d3b8f";
        ctx.font = `64px ${cssVar("--font-hand", "cursive")}`;
        ctx.textAlign = "center";
        ctx.fillText("ship it!", W / 2, H / 2 + 6);
        ctx.font = `44px ${cssVar("--font-hand", "cursive")}`;
        ctx.fillText(":)", W / 2, H / 2 + 70);
      }),
    [],
  );

  return (
    <Hotspot id="projects" labelPosition={[x, y + h / 2 + 0.06, z]}>
      <group position={[x, y, z]} rotation={[-0.04, 0, 0]}>
        {/* body */}
        <RoundedBox args={[w + 0.016, h + 0.03, 0.02]} radius={0.004} castShadow receiveShadow position={[0, -0.006, 0]}>
          <meshStandardMaterial color="#121214" roughness={0.4} metalness={0.3} />
        </RoundedBox>
        {/* rear housing */}
        <RoundedBox args={[0.38, 0.24, 0.03]} radius={0.012} position={[0, -0.02, -0.018]} castShadow>
          <meshStandardMaterial color="#c9cbcf" roughness={0.35} metalness={0.9} />
        </RoundedBox>
        {/* screen */}
        <mesh position={[0, 0.003, 0.0102]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            ref={screenMat}
            color="#000"
            roughness={0.12}
            metalness={0}
            emissive="#ffffff"
            emissiveMap={screen.tex}
            emissiveIntensity={1}
            toneMapped
          />
        </mesh>
        {/* sticky note on the bezel */}
        <mesh position={[w / 2 - 0.03, -h / 2 + 0.005, 0.0115]} rotation={[0, 0, 0.12]}>
          <planeGeometry args={[0.055, 0.055]} />
          <meshStandardMaterial map={note.tex} roughness={0.9} />
        </mesh>
        {/* logo dot on chin */}
        <mesh position={[0, -h / 2 - 0.006, 0.0102]}>
          <circleGeometry args={[0.0025, 16]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* stand */}
      <group position={[x, DESK.top, z - 0.04]}>
        <RoundedBox args={[0.24, 0.008, 0.18]} radius={0.003} position={[0, 0.004, 0.02]} castShadow receiveShadow>
          <meshStandardMaterial color="#c9cbcf" roughness={0.3} metalness={1} />
        </RoundedBox>
        <RoundedBox args={[0.06, 0.29, 0.012]} radius={0.004} position={[0, 0.15, -0.035]} rotation={[-0.12, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#c9cbcf" roughness={0.3} metalness={1} />
        </RoundedBox>
      </group>
      <Cable
        points={[
          [x + 0.05, y - 0.06, z - 0.045],
          [x + 0.08, y - 0.22, z - 0.1],
          [x + 0.1, DESK.top + 0.01, -0.5],
          [x + 0.11, DESK.top - 0.1, -0.53],
          [x + 0.12, 0.2, -0.54],
        ]}
      />
    </Hotspot>
  );
}
