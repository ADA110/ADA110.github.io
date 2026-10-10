"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { lightning, skyState } from "@/lib/sky";
import { useStore } from "@/lib/store";
import { placeHour, withCondition } from "@/lib/weather";
import { MONITOR } from "./Monitor";
import { ROOM } from "./Room";

RectAreaLightUniformsLib.init();

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
  const screen = useRef<THREE.RectAreaLight>(null);
  const lampLevel = useRef(0);
  const scene = useThree((s) => s.scene);

  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0.1, 0.6, 0);
    return o;
  }, []);

  useEffect(() => {
    screen.current?.lookAt(MONITOR.x, MONITOR.y - 0.05, 2);
  }, []);

  useFrame((_, dt) => {
    const lampOn = useStore.getState().lampOn;
    lampLevel.current += ((lampOn ? 1 : 0) - lampLevel.current) * (1 - Math.exp(-6 * dt));
    const l = lampLevel.current;
    if (hemi.current) hemi.current.intensity = sky.ambient + l * 0.22 + lightning.value * 1.6;
    // Reflections dim with the room: brighter by day and with the lamp on.
    scene.environmentIntensity = 0.12 + sky.day * 0.45 + l * 0.3;
  });

  // Sun (or moon) comes in through the window on the left wall.
  const elev = Math.max(0.15, sky.elev);
  const sunPos: [number, number, number] = [ROOM.left - 3.2, 0.9 + elev * 2.6, 1.3 - sky.golden * 0.6];

  return (
    <>
      <hemisphereLight ref={hemi} args={["#dfe6ff", "#6b5440", sky.ambient]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        position={sunPos}
        target={target}
        color={sky.sunColor}
        intensity={sky.sunIntensity}
        castShadow
        shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
        shadow-camera-near={0.5}
        shadow-camera-far={10}
      />
      {/* glow from the monitor onto the keyboard and desk */}
      <rectAreaLight
        ref={screen}
        position={[MONITOR.x, MONITOR.y, MONITOR.z + 0.02]}
        width={MONITOR.w}
        height={MONITOR.h}
        color="#b9c6ff"
        intensity={2.2}
      />
      {/* Studio-free environment for reflections: built from soft panels, no HDRI download. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#1c1a18"]} />
        <Lightformer form="rect" intensity={2.2} color="#ffe2c0" position={[0, 3, 0]} rotation-x={Math.PI / 2} scale={[4, 4, 1]} />
        <Lightformer form="rect" intensity={3} color="#dce8ff" position={[-4, 1.6, 0.2]} rotation-y={Math.PI / 2} scale={[1.5, 1.6, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#f2e6d8" position={[0, 1.4, -3]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#f2e6d8" position={[0, 1.4, 4]} rotation-y={Math.PI} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#d8cbb8" position={[4, 1.4, 0]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
    </>
  );
}
