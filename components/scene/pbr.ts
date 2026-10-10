"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

/** Photo-scanned CC0 materials from Poly Haven, compressed into public/textures/<name>/{diff,nor,rough}.webp. */
export type ScannedMaterial =
  | "walnut_veneer"
  | "wood_floor"
  | "plastered_wall_04"
  | "poly_wool_herringbone"
  | "brown_leather"
  | "caban"
  | "white_oak_veneer"
  | "rough_linen";

const paths = (name: ScannedMaterial) => ["diff", "nor", "rough"].map((m) => `/textures/${name}/${m}.webp`);

/**
 * Albedo / normal / roughness maps for a scanned material, tiled `repeat` times.
 * Textures are cloned per call so different surfaces can tile differently.
 */
export function useScanned(name: ScannedMaterial, repeat: [number, number] = [1, 1], rotation = 0) {
  const [diff, nor, rough] = useTexture(paths(name));
  return useMemo(() => {
    const set = (t: THREE.Texture, srgb: boolean) => {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(repeat[0], repeat[1]);
      c.rotation = rotation;
      c.anisotropy = 8;
      c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      c.needsUpdate = true;
      return c;
    };
    return { map: set(diff, true), normalMap: set(nor, false), roughnessMap: set(rough, false) };
  }, [diff, nor, rough, repeat[0], repeat[1], rotation]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Scanned 3D models (meshopt-compressed GLB) — the decoder ships with three, no CDN needed. */
export function useModel(name: string) {
  return useGLTF(`/models/${name}.glb`, false, true);
}

/**
 * Scanned glass uses KHR transmission, which needs an extra render pass we don't run (it renders black).
 * Swap it for thin, faintly reflective clear glass.
 */
export function plainGlass(material: THREE.Material | THREE.Material[]) {
  const swap = (m: THREE.Material) =>
    (m as THREE.MeshPhysicalMaterial).transmission > 0 || /glass/i.test(m.name)
      ? new THREE.MeshPhysicalMaterial({ name: m.name, color: "#ffffff", transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, depthWrite: false })
      : m;
  return Array.isArray(material) ? material.map(swap) : swap(material);
}

/** Clone a loaded scene so it can be placed more than once, with shadows on every mesh and plain glass. */
export function cloneScanned(scene: THREE.Object3D, edit?: (mesh: THREE.Mesh) => void) {
  const c = scene.clone(true);
  c.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.material = plainGlass(mesh.material);
    if (/glass/i.test((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name)) mesh.castShadow = false;
    edit?.(mesh);
  });
  return c;
}

export function useShadowClone(scene: THREE.Object3D) {
  return useMemo(() => cloneScanned(scene), [scene]);
}

/** Swap the picture inside a scanned frame: clones the named artwork material with a new map. */
export function withArtwork<M extends THREE.Material | THREE.Material[]>(material: M, artworkName: string, map: THREE.Texture): M {
  const swap = (m: THREE.Material) => {
    if (m.name !== artworkName) return m;
    const art = (m as THREE.MeshStandardMaterial).clone();
    art.map = map;
    return art;
  };
  return (Array.isArray(material) ? material.map(swap) : swap(material)) as M;
}

export const MODELS = [
  "desk_lamp_arm_01",
  "potted_plant_04",
  "standing_picture_frame_01",
  "hanging_picture_frame_01",
  "Lantern_01",
  "stationery_supplies",
  "binder_notebook",
  "sleeping_dog",
];
MODELS.forEach((m) => useGLTF.preload(`/models/${m}.glb`, false, true));
