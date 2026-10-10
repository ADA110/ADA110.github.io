"use client";

import { Bloom, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { useStore } from "@/lib/store";
import { AnimeGrade, Ink } from "./anime/effects";

export function Effects() {
  const quality = useStore((s) => s.quality);
  const anime = useStore((s) => s.artStyle === "anime");
  const high = quality === "high";
  if (anime) {
    return (
      <EffectComposer multisampling={high ? 4 : 0} enableNormalPass>
        <Ink />
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.72} luminanceSmoothing={0.3} radius={0.8} />
        <AnimeGrade />
        <Vignette offset={0.3} darkness={0.35} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      {high ? (
        <N8AO aoRadius={0.18} distanceFalloff={0.6} intensity={2.4} halfRes quality="medium" />
      ) : (
        <></>
      )}
      <Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.7} />
      <Vignette offset={0.28} darkness={0.5} />
      <Noise opacity={0.028} blendFunction={BlendFunction.OVERLAY} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  );
}
