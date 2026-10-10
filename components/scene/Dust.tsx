"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";

const vert = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aSeed;
varying float vTwinkle;
void main() {
  vec3 p = position;
  float t = uTime * 0.06 + aSeed * 50.0;
  p.x += sin(t * 1.3 + aSeed * 9.0) * 0.05;
  p.y += mod(t * 0.25 + aSeed, 1.0) * 0.12 - 0.06 + sin(t * 2.1) * 0.02;
  p.z += cos(t * 1.1 + aSeed * 4.0) * 0.05;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.6 + aSeed * 1.2) * uPixelRatio * (1.0 / -mv.z);
  vTwinkle = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 20.0);
}
`;
const frag = /* glsl */ `
uniform float uOpacity;
varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * uOpacity * (0.35 + 0.65 * vTwinkle);
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * 2.0, a);
}
`;

/** Dust motes drifting through the lamp's light cone. */
export function Dust({ count = 110 }) {
  const level = useRef(0);
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // inside a rough cone under the lamp head
      const h = Math.random();
      const r = Math.sqrt(Math.random()) * (0.03 + h * 0.17);
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = -0.53 + Math.cos(a) * r + h * 0.4;
      pos[i * 3 + 1] = 1.4 - h * 0.62;
      pos[i * 3 + 2] = -0.32 + Math.sin(a) * r + h * 0.38;
      seed[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
    });
    return { geometry: g, material: m };
  }, [count]);

  useFrame((state, dt) => {
    const { lampOn, reducedMotion } = useStore.getState();
    level.current += ((lampOn ? 1 : 0) - level.current) * (1 - Math.exp(-3 * dt));
    material.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
    material.uniforms.uOpacity.value = level.current * 0.35;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio() * 4;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
