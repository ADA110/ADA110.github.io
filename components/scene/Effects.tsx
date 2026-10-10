"use client";

import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useStore } from "@/lib/store";
import { Ink, PaintGrade } from "./style/ink";

/** Hand-painted anime look: soft coloured line art, a warm glow, a gentle colour grade. */
export function Effects() {
  const high = useStore((s) => s.quality) === "high";
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass>
      <Ink />
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.75} luminanceSmoothing={0.35} radius={0.85} />
      <PaintGrade />
      <Vignette offset={0.32} darkness={0.3} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}
