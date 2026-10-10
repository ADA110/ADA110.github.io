"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import type { SectionId } from "@/lib/sections";

export type HotspotId = SectionId | "lamp";

/** World-space anchor for each object's floating label (drawn by <Labels /> in the DOM). */
const anchors = new Map<HotspotId, THREE.Vector3>();

type Props = {
  id: HotspotId;
  labelPosition: [number, number, number];
  children: ReactNode;
  /** Defaults to opening the section with this id. */
  onActivate?: () => void;
  /** How far the object lifts on hover (m). */
  lift?: number;
};

/** Makes a group of meshes hoverable + clickable. */
export function Hotspot({ id, labelPosition, children, onActivate, lift = 0.006 }: Props) {
  const group = useRef<THREE.Group>(null);
  const [lx, ly, lz] = labelPosition;

  useEffect(() => {
    anchors.set(id, new THREE.Vector3(lx, ly, lz));
    return () => {
      anchors.delete(id);
    };
  }, [id, lx, ly, lz]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const { hovered, section } = useStore.getState();
    const target = hovered === id && section !== id ? lift : 0;
    group.current.position.y += (target - group.current.position.y) * (1 - Math.exp(-12 * dt));
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useStore.getState().set({ hovered: id });
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    if (useStore.getState().hovered === id) useStore.getState().set({ hovered: null });
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (onActivate) onActivate();
    else useStore.getState().go(id as SectionId);
  };

  return (
    <group ref={group} onPointerOver={over} onPointerOut={out} onClick={click}>
      {children}
    </group>
  );
}

/** Projects every label anchor to screen space each frame and moves the DOM labels there. */
export function LabelProjector() {
  const camera = useThree((s) => s.camera);
  const v = useRef(new THREE.Vector3());
  useFrame((state) => {
    const { width, height } = state.size;
    for (const [id, anchor] of anchors) {
      const el = document.getElementById(`label-${id}`);
      if (!el) continue;
      v.current.copy(anchor).project(camera);
      const behind = v.current.z > 1;
      const x = (v.current.x * 0.5 + 0.5) * width;
      const y = (-v.current.y * 0.5 + 0.5) * height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.visibility = behind ? "hidden" : "";
    }
  });
  return null;
}
