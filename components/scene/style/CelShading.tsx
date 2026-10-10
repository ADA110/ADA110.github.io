"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Four soft light bands, like cel-shaded anime backgrounds (shadows stay fairly bright). */
function useGradient() {
  return useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([150, 196, 232, 255]), 4, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }, []);
}

/**
 * Gives every lit (PBR) material in the scene a cel-shaded toon twin. Photo textures are sampled at a
 * softer mip level so they read as painted, while drawn textures (screens, cards, notes) stay crisp.
 * Components keep animating their original materials (lamp glow, screens, lantern); those changes are
 * mirrored onto the toon twins every frame.
 */
export function CelShading() {
  const scene = useThree((s) => s.scene);
  const gradientMap = useGradient();
  const twins = useRef(new Map<THREE.MeshStandardMaterial, THREE.MeshToonMaterial>());
  const sinceScan = useRef(1);

  const twin = (m: THREE.MeshStandardMaterial) => {
    let toon = twins.current.get(m);
    if (!toon) {
      toon = new THREE.MeshToonMaterial({
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
        toon.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            "#ifdef USE_MAP\n  vec4 sampledDiffuseColor = texture2D( map, vMapUv, 1.8 );\n  diffuseColor *= sampledDiffuseColor;\n#endif",
          );
        };
        toon.customProgramCacheKey = () => "painted-map";
      }
      twins.current.set(m, toon);
    }
    return toon;
  };

  const convert = () => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const swap = (m: THREE.Material) =>
        (m as THREE.MeshStandardMaterial).isMeshStandardMaterial ? twin(m as THREE.MeshStandardMaterial) : m;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    });
  };

  useFrame((_, dt) => {
    // New meshes (or React re-attaching a material) get converted too.
    if ((sinceScan.current += dt) > 0.5) {
      sinceScan.current = 0;
      convert();
    }
    for (const [original, toon] of twins.current) {
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
