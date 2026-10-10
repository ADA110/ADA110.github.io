"use client";

import { SECTIONS } from "@/lib/sections";
import { useStore } from "@/lib/store";

const OBJECT_LABELS: Record<string, string> = {
  about: "About me",
  projects: "Projects",
  experience: "Experience",
  skills: "Skills",
  contact: "Contact",
  resume: "Resume",
  music: "Now playing",
  outdoors: "Outdoors",
  weather: "Where I live",
  notes: "Old CS notes",
};

/** Floating name tags over the desk objects. Positioned every frame by <LabelProjector />. */
export function Labels() {
  const hovered = useStore((s) => s.hovered);
  const section = useStore((s) => s.section);
  const lampOn = useStore((s) => s.lampOn);
  const showAll = useStore((s) => (s.labelHint || (s.touch && s.introDone)) && !s.section);
  const ids = [...SECTIONS.map((s) => s.id), "lamp"] as const;

  return (
    <div className="labels" aria-hidden>
      {ids.map((id) => {
        const text = id === "lamp" ? (lampOn ? "Lamp · lights off" : "Lamp · lights on") : OBJECT_LABELS[id];
        const visible = (hovered === id || (showAll && id !== "lamp")) && section !== id;
        return (
          <div key={id} id={`label-${id}`} className="label-anchor">
            <div className={`hotspot-label${visible ? " show" : ""}`}>{text}</div>
          </div>
        );
      })}
    </div>
  );
}
