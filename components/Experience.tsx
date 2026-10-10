"use client";

import { useProgress } from "@react-three/drei";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SECTIONS, sectionFromPath } from "@/lib/sections";
import { playClick, playWhoosh } from "@/lib/sound";
import { useStore } from "@/lib/store";
import { applyWeatherOverride, fetchWeather } from "@/lib/weather";
import { CommandPalette } from "./ui/CommandPalette";
import { Labels } from "./ui/Labels";
import { Nav } from "./ui/Nav";
import { Panel } from "./ui/Panel";
import { TextVersion } from "./ui/TextVersion";

const loadScene = () => import("./scene/Scene");
// Fetch the 3D code as soon as this module runs, rather than waiting for the first render.
if (typeof window !== "undefined") void loadScene();
const Scene = dynamic(loadScene, { ssr: false });
const NAV = SECTIONS.filter((s) => s.inNav);

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Full-screen intro shown while the scanned models and textures download. */
function Loader({ done }: { done: boolean }) {
  const { progress, active } = useProgress();
  const pct = active ? Math.round(progress) : done ? 100 : Math.max(5, Math.round(progress));
  return (
    <div className={`loader${done ? " done" : ""}`} aria-hidden={done}>
      <div className="loader-inner">
        <p className="loader-name">Setting up the desk</p>
        <div className="loader-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="loader-pct">{pct}%</p>
      </div>
    </div>
  );
}

export function Experience() {
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionFromPath(pathname)?.id ?? null;

  const set = useStore((s) => s.set);
  const textMode = useStore((s) => s.textMode);
  const sceneReady = useStore((s) => s.sceneReady);
  const introDone = useStore((s) => s.introDone);
  const lampOn = useStore((s) => s.lampOn);
  const soundOn = useStore((s) => s.soundOn);
  const touch = useStore((s) => s.touch);
  const previewing = useStore((s) => s.preview.condition !== null || s.preview.hour !== null);

  // Navigation lives in the URL so every section has a shareable link.
  useEffect(() => {
    set({ go: (id) => router.push(id ? `/${id}` : "/", { scroll: false }) });
  }, [router, set]);

  const prev = useRef(section);
  useEffect(() => {
    set({ section });
    if (prev.current !== section) {
      playWhoosh();
      prev.current = section;
    }
  }, [section, set]);

  // Opening the resume prints a page.
  useEffect(() => {
    if (section === "resume" && introDone) set({ printJob: useStore.getState().printJob + 1 });
  }, [section, introDone, set]);

  // Live Palo Alto weather drives the window, the room light and the wall display.
  useEffect(() => {
    let alive = true;
    const load = () => fetchWeather().then((w) => alive && set({ weather: applyWeatherOverride(w) }));
    load();
    const id = setInterval(load, 10 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [set]);

  // Detect device capabilities and restore preferences.
  useEffect(() => {
    const c = document.createElement("canvas");
    const webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    set({
      webgl,
      textMode: !webgl,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      touch: matchMedia("(pointer: coarse)").matches,
      soundOn: read("desk:sound") !== "off",
      introDone: !webgl,
      lampOn: !webgl ? read("desk:lamp") !== "off" : false,
    });
  }, [set]);

  // Intro: the room fades in dark, then the lamp clicks on.
  useEffect(() => {
    if (!sceneReady) return;
    const reduced = useStore.getState().reducedMotion;
    const timers = [
      setTimeout(() => set({ lampOn: read("desk:lamp") !== "off" }), reduced ? 0 : 450),
      setTimeout(() => set({ introDone: true, labelHint: true }), reduced ? 0 : 900),
      setTimeout(() => set({ labelHint: false }), reduced ? 4000 : 4400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [sceneReady, set]);

  // The lamp *is* the theme switch.
  useEffect(() => {
    document.documentElement.dataset.theme = lampOn ? "light" : "dark";
    if (introDone) write("desk:lamp", lampOn ? "on" : "off");
  }, [lampOn, introDone]);
  useEffect(() => write("desk:sound", soundOn ? "on" : "off"), [soundOn]);

  // Keyboard: ⌘K palette, Esc back, ←/→ between sections, L for the lamp.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.set({ paletteOpen: !s.paletteOpen });
        return;
      }
      if (s.paletteOpen || s.textMode) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape" && s.section) s.go(null);
      else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && s.section) {
        const i = NAV.findIndex((n) => n.id === s.section);
        const next = NAV[(i + (e.key === "ArrowRight" ? 1 : -1) + NAV.length) % NAV.length];
        s.go(next.id);
      } else if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey) {
        playClick();
        s.toggleLamp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (textMode) {
    return (
      <>
        <TextVersion />
        <CommandPalette />
      </>
    );
  }

  return (
    <div className={`experience${section ? " has-panel" : ""}`}>
      <div className="stage" aria-hidden>
        <Scene />
      </div>
      <Labels />
      <Loader done={sceneReady} />
      <Nav section={section} />
      <p className={`hint${introDone && !section ? " show" : ""}`}>
        {touch ? "Tap anything on the desk — or open the menu" : "Click anything on the desk · press ⌘K to jump anywhere"}
      </p>
      <Panel section={section} />
      {previewing && section !== "weather" && (
        <button className="preview-chip" onClick={() => set({ preview: { condition: null, hour: null } })}>
          <span className="dot" aria-hidden /> Previewing the sky · <strong>Back to live</strong>
        </button>
      )}
      <CommandPalette />
      {/* Screen-reader & no-JS friendly link list (visually hidden) */}
      <nav className="sr-only" aria-label="All sections">
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`/${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
