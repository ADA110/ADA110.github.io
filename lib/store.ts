import { create } from "zustand";
import type { SectionId } from "./sections";
import type { Condition, Weather } from "./weather";

export type Quality = "high" | "low";

type State = {
  section: SectionId | null;
  hovered: SectionId | "lamp" | "headphones" | null;
  lampOn: boolean;
  soundOn: boolean;
  /** Lofi beat playing (off until the visitor turns it on; the sound toggle silences it too). */
  musicOn: boolean;
  /** Someone's at the desk wearing headphones (clicking them toggles the music). */
  listening: boolean;
  /** Intro finished: the lamp has clicked on and labels may show. */
  introDone: boolean;
  sceneReady: boolean;
  paletteOpen: boolean;
  textMode: boolean;
  webgl: boolean;
  quality: Quality;
  reducedMotion: boolean;
  touch: boolean;
  /** Bumped each time the printer should print a page. */
  printJob: number;
  /** Live Palo Alto weather (null until loaded or if unavailable). */
  weather: Weather | null;
  /** Visitor-chosen sky preview; null fields mean "live". */
  preview: { condition: Condition | null; hour: number | null };
  /** Briefly show every object's label after the intro. */
  labelHint: boolean;
  /** Navigate to a section (null = back to the desk). Wired up by <Experience>. */
  go: (id: SectionId | null) => void;

  set: (partial: Partial<State>) => void;
  toggleLamp: () => void;
  toggleMusic: () => void;
};

export const useStore = create<State>((set) => ({
  section: null,
  hovered: null,
  lampOn: false,
  soundOn: true,
  musicOn: false,
  listening: false,
  introDone: false,
  sceneReady: false,
  paletteOpen: false,
  textMode: false,
  webgl: true,
  quality: "high",
  reducedMotion: false,
  touch: false,
  printJob: 0,
  labelHint: false,
  weather: null,
  preview: { condition: null, hour: null },
  go: () => {},

  set: (partial) => set(partial),
  toggleLamp: () => set((s) => ({ lampOn: !s.lampOn })),
  // turning music on also unmutes; turning it off leaves the sound effects alone
  toggleMusic: () => set((s) => (s.musicOn && s.soundOn ? { musicOn: false } : { musicOn: true, soundOn: true })),
}));
