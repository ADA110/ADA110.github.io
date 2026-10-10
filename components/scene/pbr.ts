"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { ALL_TEXTURE_URLS, MODEL_NAMES, materialUrl, modelUrl, type ScannedMaterial } from "@/lib/assets";

export type { ScannedMaterial };

/** A scanned material's colour map, tiled `repeat` times (cloned so surfaces can tile differently). */
export function useScanned(name: ScannedMaterial, repeat: [number, number] = [1, 1], rotation = 0) {
  const diff = useTexture(materialUrl(name));
  return useMemo(() => {
    const map = diff.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat[0], repeat[1]);
    map.rotation = rotation;
    map.anisotropy = 8;
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
    return { map };
  }, [diff, repeat[0], repeat[1], rotation]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Scanned 3D models (meshopt-compressed GLB). The decoder ships with three, no CDN needed. */
export function useModel(name: string) {
  return useGLTF(modelUrl(name), false, true);
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

// Start every download as soon as this module loads, all in parallel (no per-component waterfall).
MODEL_NAMES.forEach((m) => useGLTF.preload(modelUrl(m), false, true));
useTexture.preload(ALL_TEXTURE_URLS);
