"use client";

import { EffectComposerContext } from "@react-three/postprocessing";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { useContext, useMemo } from "react";
import * as THREE from "three";

// ---------------- ink outlines ----------------
// Line art drawn from the scene itself: edges where depth jumps (silhouettes) or the surface
// turns sharply (creases). Lines take a darkened version of the local colour, like anime
// background art, and fade out with distance.
const inkFrag = /* glsl */ `
uniform sampler2D tNormal;
uniform float uThickness;
uniform float uStrength;

float viewDist(const in vec2 uv) { return -getViewZ(readDepth(uv)); }
vec3 nrm(const in vec2 uv) { return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  vec2 o = texelSize * uThickness;
  float dc = viewDist(uv);
  float dl = viewDist(uv - vec2(o.x, 0.0));
  float dr = viewDist(uv + vec2(o.x, 0.0));
  float du = viewDist(uv + vec2(0.0, o.y));
  float dd = viewDist(uv - vec2(0.0, o.y));
  float depthEdge = abs(dl + dr + du + dd - 4.0 * dc) / max(dc, 0.001);

  vec3 nc = nrm(uv);
  float creases = max(
    max(1.0 - dot(nc, nrm(uv - vec2(o.x, 0.0))), 1.0 - dot(nc, nrm(uv + vec2(o.x, 0.0)))),
    max(1.0 - dot(nc, nrm(uv + vec2(0.0, o.y))), 1.0 - dot(nc, nrm(uv - vec2(0.0, o.y))))
  );

  float edge = max(smoothstep(0.015, 0.05, depthEdge), smoothstep(0.3, 0.7, creases));
  edge *= smoothstep(9.0, 2.5, dc);
  vec3 ink = inputColor.rgb * vec3(0.22, 0.18, 0.27);
  outputColor = vec4(mix(inputColor.rgb, ink, edge * uStrength), inputColor.a);
}
`;

class InkEffect extends Effect {
  constructor(normalTexture: THREE.Texture | null) {
    super("InkEffect", inkFrag, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["tNormal", new THREE.Uniform(normalTexture)],
        ["uThickness", new THREE.Uniform(1.35)],
        ["uStrength", new THREE.Uniform(1.0)],
      ]),
    });
  }
}

export function Ink() {
  const { normalPass } = useContext(EffectComposerContext);
  const effect = useMemo(() => new InkEffect(normalPass?.texture ?? null), [normalPass]);
  return <primitive object={effect} dispose={null} />;
}

// ---------------- anime colour grade ----------------
// Richer saturation, cool lavender shadows and warm highlights (applied in linear light, before tone mapping).
const gradeFrag = /* glsl */ `
uniform float uSaturation;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  // Lift the shadows toward lavender (anime backgrounds rarely go dark), warm the highlights.
  c += vec3(0.018, 0.016, 0.032) * (1.0 - smoothstep(0.0, 0.25, l));
  c *= mix(vec3(0.88, 0.9, 1.16), vec3(1.06, 1.0, 0.9), smoothstep(0.03, 0.55, l));
  outputColor = vec4(c, inputColor.a);
}
`;

class GradeEffect extends Effect {
  constructor() {
    super("AnimeGrade", gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([["uSaturation", new THREE.Uniform(1.28)]]),
    });
  }
}

export function AnimeGrade() {
  const effect = useMemo(() => new GradeEffect(), []);
  return <primitive object={effect} dispose={null} />;
}
