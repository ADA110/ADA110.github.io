"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { HOME_CAMERA, HOME_CAMERA_PORTRAIT, sectionById } from "@/lib/sections";
import { useStore } from "@/lib/store";

/** Panel sizes must match globals.css (.panel). */
const PANEL_WIDTH = 460;
const SHEET_FRACTION = 0.56;
export const DESKTOP_MIN = 820;

/** `?cam=x,y,z,tx,ty,tz` overrides the overview camera — handy for framing and close-up checks. */
function debugCamera() {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("cam")?.split(",").map(Number);
  return v?.length === 6 && v.every(Number.isFinite)
    ? { position: v.slice(0, 3) as [number, number, number], target: v.slice(3) as [number, number, number] }
    : null;
}

const intro = new THREE.Vector3(...HOME_CAMERA.position).add(new THREE.Vector3(0.9, 0.35, 1.3));

/**
 * Flies the camera between the desk overview and each object, adds a gentle
 * mouse parallax, and shifts the lens so the object stays centred beside the open panel.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const pos = useRef(intro.clone());
  const tgt = useRef(new THREE.Vector3(...HOME_CAMERA.target));
  const shift = useRef({ x: 0, y: 0 });
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTgt = useRef(new THREE.Vector3());
  const debug = useRef(debugCamera());

  useFrame((state, dt) => {
    const { section, reducedMotion, touch, sceneReady } = useStore.getState();
    const s = sectionById(section);
    const { width, height } = state.size;
    const aspect = width / height;
    const portrait = aspect < 0.8;
    const pose = s ? s.camera : (debug.current ?? (portrait ? HOME_CAMERA_PORTRAIT : HOME_CAMERA));
    const desktop = width >= DESKTOP_MIN;

    desiredTgt.current.set(...pose.target);
    desiredPos.current.set(...pose.position);
    // Tall screens: widen the lens; narrow-ish screens: back the camera off along its view line.
    const fov = portrait ? 60 : 40;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (aspect < 1.25 && (s || !portrait)) {
      const pull = 1 + (1.25 - aspect) * (portrait ? 0.3 : s ? 0.75 : 1.05);
      desiredPos.current.sub(desiredTgt.current).multiplyScalar(pull).add(desiredTgt.current);
    }
    if (!touch && !reducedMotion) {
      const amt = s ? 0.02 : 0.09;
      desiredPos.current.x += state.pointer.x * amt;
      desiredPos.current.y += state.pointer.y * amt * 0.5;
    }
    if (!sceneReady) {
      camera.position.copy(pos.current);
      camera.lookAt(tgt.current);
      return;
    }

    const k = reducedMotion ? 1 : 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    pos.current.lerp(desiredPos.current, k);
    tgt.current.lerp(desiredTgt.current, k);
    camera.position.copy(pos.current);
    camera.lookAt(tgt.current);

    // Lens shift: keep the subject centred in the area not covered by the panel.
    const goalX = s && desktop ? PANEL_WIDTH / 2 : 0;
    const goalY = s && !desktop ? (height * SHEET_FRACTION) / 2 : 0;
    const ks = reducedMotion ? 1 : 1 - Math.exp(-5 * Math.min(dt, 0.05));
    shift.current.x += (goalX - shift.current.x) * ks;
    shift.current.y += (goalY - shift.current.y) * ks;
    if (Math.abs(shift.current.x) < 0.5 && Math.abs(shift.current.y) < 0.5 && !s) {
      if (camera.view) camera.clearViewOffset();
    } else {
      camera.setViewOffset(width, height, shift.current.x, shift.current.y, width, height);
    }
  });

  return null;
}
