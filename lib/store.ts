import { create } from "zustand";
import type { SectionId } from "./sections";
import type { Condition, Weather } from "./weather";

export type Quality = "high" | "low";

type State = {
  section: SectionId | null;
  hovered: SectionId | "lamp" | null;
  lampOn: boolean;
  soundOn: boolean;
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
};

export const useStore = create<State>((set) => ({
  section: null,
  hovered: null,
  lampOn: false,
  soundOn: true,
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
}));
