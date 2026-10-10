"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { useLathe } from "./helpers";
import { useModel, useScanned } from "./pbr";

export const DOG_BED = { x: -1.05, z: 0.64, r: 0.52 };

/**
 * Sleeping dog: a photogrammetry scan ("Sleeping dog 01" by thuberchs, CC BY 4.0), cut out of the
 * ground it was scanned on (scripts/extract-scan.mjs). It breathes: the back and ribs swell gently
 * along their normals, more the higher up the body they are, about every 3.4 seconds.
 */
function SleepingDog() {
  const { scene } = useModel("sleeping_dog");
  const breath = useMemo(() => ({ value: 0 }), []);
  const dog = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const m = (mesh.material as THREE.MeshStandardMaterial).clone();
      m.roughness = 0.85;
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uBreath = breath;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uBreath;")
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\n  transformed += normal * uBreath * smoothstep(0.03, 0.24, position.y);",
          );
      };
      mesh.material = m;
    });
    return c;
  }, [scene, breath]);

  useFrame((s) => {
    if (useStore.getState().reducedMotion) return (breath.value = 0);
    // Slow inhale, slightly quicker exhale, a short pause.
    const t = (s.clock.elapsedTime % 3.4) / 3.4;
    const wave = t < 0.45 ? Math.sin((t / 0.45) * Math.PI * 0.5) : t < 0.8 ? Math.cos(((t - 0.45) / 0.35) * Math.PI * 0.5) : 0;
    breath.value = 0.0045 * wave * wave;
  });

  // Sunk into the cushion so the cut edge of the scan is hidden, like a dog's weight in a soft bed.
  return <primitive object={dog} position={[0, 0.012, 0.02]} rotation={[0, 2.4, 0]} />;
}

/** A large round, plush bolster bed on the floor under the window, with the dog asleep in it. */
export function DogBed() {
  const wool = useScanned("poly_wool_herringbone", [4, 1]);
  const cushionWool = useScanned("poly_wool_herringbone", [3, 3]);
  const R = DOG_BED.r;
  // Soft-edged base: flat bottom, rounded rim, slightly dished top where the dog lies.
  const base = useLathe(
    [
      [0, 0.05],
      [R * 0.5, 0.046],
      [R * 0.8, 0.055],
      [R * 0.84, 0.053],
      [R * 0.85, 0.035],
      [R * 0.84, 0.01],
      [R * 0.82, 0],
      [0, 0],
    ],
    72,
  );
  const bolster = useMemo(() => new THREE.TorusGeometry(R - 0.1, 0.11, 32, 96), [R]);
  return (
    <group position={[DOG_BED.x, 0, DOG_BED.z]}>
      <mesh geometry={base} castShadow receiveShadow>
        <meshStandardMaterial normalMap={cushionWool.normalMap} roughnessMap={cushionWool.roughnessMap} color="#d6c9b4" side={THREE.DoubleSide} />
      </mesh>
      {/* plush bolster ring, a little squashed like a well-used bed */}
      <mesh geometry={bolster} position={[0, 0.085, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.75]} castShadow receiveShadow>
        <meshStandardMaterial normalMap={wool.normalMap} roughnessMap={wool.roughnessMap} color="#a89884" />
      </mesh>
      <SleepingDog />
    </group>
  );
}
