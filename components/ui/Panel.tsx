"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS, type SectionId } from "@/lib/sections";
import { useStore } from "@/lib/store";
import { SECTION_INTRO, SectionContent } from "./SectionContent";

const NAV = SECTIONS.filter((s) => s.inNav);

/** The reading panel: slides in from the right (desktop) or up as a sheet (mobile). */
export function Panel({ section }: { section: SectionId | null }) {
  // Keep the last section rendered while the panel animates out.
  const [shown, setShown] = useState(section);
  if (section && section !== shown) setShown(section);
  const go = useStore((s) => s.go);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [section]);

  const idx = NAV.findIndex((s) => s.id === shown);
  const prev = idx > 0 ? NAV[idx - 1] : null;
  const next = idx >= 0 && idx < NAV.length - 1 ? NAV[idx + 1] : null;
  const intro = shown ? SECTION_INTRO[shown] : null;

  return (
    <aside className={`panel${section ? " open" : ""}`} aria-hidden={!section} aria-label={intro?.title} inert={!section}>
      {shown && intro && (
        <>
          <header className="panel-head">
            <div>
              <p className="eyebrow">{intro.kicker}</p>
              <h2>{intro.title}</h2>
            </div>
            <button className="icon-btn" onClick={() => go(null)} aria-label="Back to the desk (Esc)">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="panel-body" ref={scroller}>
            <SectionContent id={shown} />
          </div>
          <footer className="panel-foot">
            {prev ? (
              <button className="text-btn" onClick={() => go(prev.id)}>
                ← {prev.label}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button className="text-btn" onClick={() => go(next.id)}>
                {next.label} →
              </button>
            ) : (
              <button className="text-btn" onClick={() => go(null)}>
                Back to desk
              </button>
            )}
          </footer>
        </>
      )}
    </aside>
  );
}
