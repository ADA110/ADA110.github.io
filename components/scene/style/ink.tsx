"use client";

import { EffectComposerContext } from "@react-three/postprocessing";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { useThree } from "@react-three/fiber";
import { useContext, useEffect, useMemo } from "react";
import * as THREE from "three";

// ---------------- line art ----------------
// Soft, coloured line work drawn from the scene itself: edges where depth jumps (silhouettes) or the
// surface turns sharply (creases). Like Ghibli background art, lines are a deeper shade of the local
// colour rather than black ink, and they fade with distance.
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

  float edge = max(smoothstep(0.018, 0.06, depthEdge), smoothstep(0.35, 0.75, creases));
  edge *= smoothstep(9.0, 2.5, dc);
  vec3 ink = inputColor.rgb * vec3(0.4, 0.33, 0.38);
  outputColor = vec4(mix(inputColor.rgb, ink, edge * uStrength), inputColor.a);
}
`;

class InkEffect extends Effect {
  constructor(normalTexture: THREE.Texture | null) {
    super("InkEffect", inkFrag, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["tNormal", new THREE.Uniform(normalTexture)],
        ["uThickness", new THREE.Uniform(1.1)],
        ["uStrength", new THREE.Uniform(0.8)],
      ]),
    });
  }
}

/** Objects on this layer are drawn but get no ink lines (soft things like steam, whose quads would outline). */
export const NO_INK_LAYER = 3;

export function Ink() {
  const { normalPass } = useContext(EffectComposerContext);
  const camera = useThree((s) => s.camera);
  const effect = useMemo(() => new InkEffect(normalPass?.texture ?? null), [normalPass]);
  // The normal pass (where edges come from) skips the no-ink layer; the main render still shows it.
  useEffect(() => {
    if (!normalPass) return;
    camera.layers.enable(NO_INK_LAYER);
    const render = normalPass.render;
    normalPass.render = function (...args: Parameters<typeof render>) {
      camera.layers.disable(NO_INK_LAYER);
      render.apply(this, args);
      camera.layers.enable(NO_INK_LAYER);
    };
    return () => {
      normalPass.render = render;
    };
  }, [normalPass, camera]);
  return <primitive object={effect} dispose={null} />;
}

// ---------------- painted colour grade ----------------
// Gently richer colour, soft lavender shadows and warm sunlit highlights (linear light, before tone mapping).
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
    super("PaintGrade", gradeFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([["uSaturation", new THREE.Uniform(1.2)]]),
    });
  }
}

export function PaintGrade() {
  const effect = useMemo(() => new GradeEffect(), []);
  return <primitive object={effect} dispose={null} />;
}
