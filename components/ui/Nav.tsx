"use client";

import Link from "next/link";
import { site } from "@/content/site";
import { SECTIONS, type SectionId } from "@/lib/sections";
import { playClick } from "@/lib/sound";
import { useStore } from "@/lib/store";

const NAV = SECTIONS.filter((s) => s.inNav);

export function BulbIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"
        fill={on ? "currentColor" : "none"}
        fillOpacity={on ? 0.25 : 0}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      {on ? (
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <path d="M17 9.5l5 5M22 9.5l-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function Nav({ section }: { section: SectionId | null }) {
  const lampOn = useStore((s) => s.lampOn);
  const soundOn = useStore((s) => s.soundOn);
  const set = useStore((s) => s.set);

  return (
    <header className="nav">
      <Link href="/" scroll={false} className="brand" aria-label={`${site.name}, back to the desk`}>
        <span className="brand-name">{site.name}</span>
      </Link>

      <nav className="nav-links" aria-label="Sections">
        {NAV.map((s) => (
          <Link key={s.id} href={`/${s.id}`} scroll={false} className={section === s.id ? "active" : undefined} aria-current={section === s.id ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
      </nav>

      <div className="nav-actions">
        <button className="kbd-btn" onClick={() => set({ paletteOpen: true })} aria-label="Open menu (Command K)">
          <span className="only-desktop">Jump to</span>
          <span className="only-mobile">Menu</span>
          <kbd className="only-desktop">⌘K</kbd>
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            playClick();
            useStore.getState().toggleLamp();
          }}
          aria-label={lampOn ? "Turn the lamp off (dark mode)" : "Turn the lamp on (light mode)"}
          aria-pressed={lampOn}
          title="Lamp: light / dark"
        >
          <BulbIcon on={lampOn} />
        </button>
        <button className="icon-btn" onClick={() => set({ soundOn: !soundOn })} aria-label={soundOn ? "Mute sounds" : "Unmute sounds"} aria-pressed={soundOn} title="Sound">
          <SoundIcon on={soundOn} />
        </button>
      </div>
    </header>
  );
}
