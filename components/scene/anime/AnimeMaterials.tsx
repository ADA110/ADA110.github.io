"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";

/** Four soft light bands, like cel-shaded anime backgrounds (shadows stay fairly bright). */
function useGradient() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([135, 185, 228, 255]), 4, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, []);
}

type Pair = { original: THREE.MeshStandardMaterial; toon: THREE.MeshToonMaterial };

/**
 * Anime art style: swaps every lit (PBR) material for a cel-shaded toon material and back.
 * Photo textures are sampled at a blurrier mip level so they read as painted, while drawn
 * textures (screens, cards, notes) stay crisp. Components keep animating their original
 * materials (lamp glow, screens); those changes are mirrored onto the toon copies every frame.
 */
export function AnimeMaterials() {
  const scene = useThree((s) => s.scene);
  const anime = useStore((s) => s.artStyle === "anime");
  const gradientMap = useGradient();
  const pairs = useRef(new Map<THREE.Material, Pair>());
  const sinceScan = useRef(1);

  const toonFor = (m: THREE.MeshStandardMaterial) => {
    let pair = pairs.current.get(m);
    if (!pair) {
      const toon = new THREE.MeshToonMaterial({
        name: m.name,
        color: m.color,
        map: m.map,
        alphaMap: m.alphaMap,
        emissive: m.emissive,
        emissiveMap: m.emissiveMap,
        emissiveIntensity: m.emissiveIntensity,
        transparent: m.transparent,
        opacity: m.opacity,
        alphaTest: m.alphaTest,
        side: m.side,
        depthWrite: m.depthWrite,
        gradientMap,
      });
      if (m.map && !(m.map as THREE.CanvasTexture).isCanvasTexture) {
        // Painted look: read photo textures a couple of mip levels softer.
        toon.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            "#ifdef USE_MAP\n  vec4 sampledDiffuseColor = texture2D( map, vMapUv, 1.6 );\n  diffuseColor *= sampledDiffuseColor;\n#endif",
          );
        };
        toon.customProgramCacheKey = () => "anime-soft-map";
      }
      pair = { original: m, toon };
      pairs.current.set(m, pair);
    }
    return pair.toon;
  };

  const apply = (toAnime: boolean) => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const swap = (m: THREE.Material): THREE.Material => {
        if (toAnime) return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial ? toonFor(m as THREE.MeshStandardMaterial) : m;
        const original = [...pairs.current.values()].find((p) => p.toon === m)?.original;
        return original ?? m;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
  };

  useEffect(() => {
    apply(anime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anime]);

  useFrame((_, dt) => {
    if (!anime) return;
    // New meshes (or React re-attaching a material) get converted too.
    if ((sinceScan.current += dt) > 0.5) {
      sinceScan.current = 0;
      apply(true);
    }
    for (const { original, toon } of pairs.current.values()) {
      toon.emissiveIntensity = original.emissiveIntensity;
      toon.opacity = original.opacity;
      toon.visible = original.visible;
      if (toon.map !== original.map) {
        toon.map = original.map;
        toon.needsUpdate = true;
      }
    }
  });

  return null;
}
