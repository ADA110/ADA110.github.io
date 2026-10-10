"use client";

import { site } from "@/content/site";
import { SECTIONS } from "@/lib/sections";
import { useStore } from "@/lib/store";
import { SECTION_INTRO, SectionContent } from "./SectionContent";

/** Plain, fast, fully accessible version of the site. Also the fallback without WebGL. */
export function TextVersion() {
  const webgl = useStore((s) => s.webgl);
  const set = useStore((s) => s.set);
  return (
    <main className="text-version">
      <header>
        <h1>{site.name}</h1>
        <p className="lead">{site.tagline}</p>
        {webgl ? (
          <button className="btn" onClick={() => set({ textMode: false })}>
            ← Back to the 3D desk
          </button>
        ) : (
          <p className="muted small">Your browser can’t show the 3D desk, so here’s everything as plain text.</p>
        )}
      </header>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id}>
          <h2>{SECTION_INTRO[s.id].title}</h2>
          <SectionContent id={s.id} />
        </section>
      ))}
    </main>
  );
}
