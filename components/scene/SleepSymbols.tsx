"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { NO_INK_LAYER } from "./style/ink";

/** Camera-facing sleep marks float gently above the cat, including in the wide room view. */
export function SleepSymbols({ position = [-0.105, 0.155, 0.065] }: { position?: [number, number, number] }) {
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "italic bold 92px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#665a68";
    ctx.strokeText("Z", 61, 68);
    ctx.fillStyle = "#fff1d5";
    ctx.fillText("Z", 61, 68);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ clock }) => {
    const still = useStore.getState().reducedMotion;
    sprites.current.forEach((sprite, i) => {
      if (!sprite) return;
      const u = still ? (i + 0.5) / 3 : (clock.elapsedTime / 4.8 + i / 3) % 1;
      sprite.position.set(position[0] - u * 0.095, position[1] + u * 0.27, position[2]);
      sprite.scale.setScalar(0.046 + u * 0.038);
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = still ? 0.7 : 0.9 * Math.sin(Math.PI * u) ** 0.6;
      material.rotation = -0.1 + 0.17 * u;
    });
  });
  return <group>{[0, 1, 2].map((i) => (
    <sprite key={i} ref={(sprite) => { sprites.current[i] = sprite; sprite?.layers.set(NO_INK_LAYER); }}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  ))}</group>;
}

