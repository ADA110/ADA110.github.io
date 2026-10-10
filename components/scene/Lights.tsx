"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { lightning, skyState, sunZ } from "@/lib/sky";
import { useStore } from "@/lib/store";
import { placeHour, withCondition } from "@/lib/weather";
import { MONITOR } from "./Monitor";
import { ROOM } from "./Room";

export function Lights() {
  // Palo Alto time, re-read every minute; lighting also follows the live weather.
  const [liveHour, setLiveHour] = useState(placeHour);
  useEffect(() => {
    const id = setInterval(() => setLiveHour(placeHour()), 60_000);
    return () => clearInterval(id);
  }, []);
  const liveWeather = useStore((s) => s.weather);
  const preview = useStore((s) => s.preview);
  const hour = preview.hour ?? liveHour;
  const weather = useMemo(() => (preview.condition ? withCondition(liveWeather, preview.condition) : liveWeather), [liveWeather, preview.condition]);
  const sky = useMemo(() => skyState(hour, weather), [hour, weather]);
  const quality = useStore((s) => s.quality);

  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const lampLevel = useRef(0);

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0.1, 0.6, 0);
    return o;
  }, []);

  useFrame((_, dt) => {
    const lampOn = useStore.getState().lampOn;
    lampLevel.current += ((lampOn ? 1 : 0) - lampLevel.current) * (1 - Math.exp(-6 * dt));
    const l = lampLevel.current;
    // Generous, soft fill light: painted interiors rarely fall into deep shadow.
    if (hemi.current) hemi.current.intensity = (sky.ambient + l * 0.22) * 2.9 + lightning.value * 1.6;
  });

  // Sun (or moon) comes in through the window on the left wall, from the same place the sky draws it.
  const elev = Math.max(0.15, sky.elev);
  const sunPos: [number, number, number] = [ROOM.left - 3.2, 0.9 + elev * 2.6, sunZ(sky.golden)];

  return (
    <>
      {/* sky bounce from above, warm floor bounce from below */}
      <hemisphereLight ref={hemi} args={["#eef0ff", "#8a6a4c", sky.ambient]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        position={sunPos}
        target={target}
        color={sky.sunColor}
        intensity={sky.sunIntensity * 0.7}
        castShadow
        shadow-mapSize={quality === "high" ? [4096, 4096] : [2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        // The shadow camera covers the whole room, so sunlight only lands where the window lets it in.
        shadow-camera-left={-4.2}
        shadow-camera-right={4.2}
        shadow-camera-top={4.2}
        shadow-camera-bottom={-4.2}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
      />
      {/* cool glow from the monitor onto the keyboard and desk */}
      <pointLight position={[MONITOR.x, MONITOR.y - 0.05, MONITOR.z + 0.2]} color="#b9c6ff" intensity={0.12} distance={1.2} decay={2} />
    </>
  );
}
