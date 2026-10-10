"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { HOME_CAMERA } from "@/lib/sections";
import { useStore } from "@/lib/store";
import { AnimeMaterials } from "./anime/AnimeMaterials";
import { CameraRig } from "./CameraRig";
import { Desk } from "./Desk";
import { Dust } from "./Dust";
import { Effects } from "./Effects";
import { LabelProjector } from "./Hotspot";
import { Lamp } from "./Lamp";
import { Lights } from "./Lights";
import { Monitor } from "./Monitor";
import { NotesPile } from "./NotesPile";
import { Outdoors } from "./Outdoors";
import { Props } from "./Props";
import { Room } from "./Room";
import { WallDecor } from "./Wall";
import { WeatherClock } from "./WeatherClock";

/** Flags the scene as ready once a few frames have rendered (shaders compiled, textures uploaded). */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 3) useStore.getState().set({ sceneReady: true });
  });
  return null;
}

export default function Scene() {
  const quality = useStore((s) => s.quality);
  const sceneReady = useStore((s) => s.sceneReady);
  return (
    <Canvas
      className="scene-canvas"
      shadows
      flat
      dpr={quality === "high" ? [1, 1.75] : [1, 1.2]}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 40, near: 0.03, far: 30, position: HOME_CAMERA.position }}
      onPointerMissed={() => {
        const { section, go } = useStore.getState();
        if (section) go(null);
      }}
    >
      {/* Only judge frame rate once loading is over — startup work would read as a slow device. */}
      {sceneReady && <PerformanceMonitor onDecline={() => useStore.getState().set({ quality: "low" })} />}
      <Suspense fallback={null}>
        <Room />
        <Desk />
        <Monitor />
        <Lamp />
        <Props />
        <WallDecor />
        <WeatherClock />
        <Outdoors />
        <NotesPile />
        <Dust />
        <Lights />
        <CameraRig />
        <LabelProjector />
        <AnimeMaterials />
        <Effects />
        <ReadySignal />
      </Suspense>
    </Canvas>
  );
}
