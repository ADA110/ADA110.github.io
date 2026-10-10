"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { site } from "@/content/site";
import { SECTIONS } from "@/lib/sections";
import { playClick } from "@/lib/sound";
import { useStore } from "@/lib/store";

type Item = { id: string; label: string; hint: string; group: string; run: () => void };

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  // Mounting fresh each time resets the query and selection.
  return open ? <Palette /> : null;
}

function Palette() {
  const set = useStore((s) => s.set);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const { go } = useStore.getState();
    return [
      ...SECTIONS.map((s) => ({ id: s.id, label: s.label, hint: s.object, group: "Go to", run: () => go(s.id) })),
      { id: "home", label: "Back to the desk", hint: "Overview", group: "Go to", run: () => go(null) },
      {
        id: "lamp",
        label: "Toggle the lamp",
        hint: "Light / dark mode",
        group: "Actions",
        run: () => {
          playClick();
          useStore.getState().toggleLamp();
        },
      },
      {
        id: "style",
        label: "Switch art style",
        hint: "Realistic / anime",
        group: "Actions",
        run: () => set({ artStyle: useStore.getState().artStyle === "anime" ? "realistic" : "anime" }),
      },
      { id: "sound", label: "Toggle sound", hint: "Clicks & whooshes", group: "Actions", run: () => set({ soundOn: !useStore.getState().soundOn }) },
      { id: "email", label: "Copy email address", hint: site.email, group: "Actions", run: () => void navigator.clipboard?.writeText(site.email) },
      { id: "pdf", label: "Download resume", hint: "PDF", group: "Actions", run: () => window.open(site.resumeUrl, "_blank") },
      { id: "text", label: "Text-only version", hint: "No 3D, just the content", group: "Actions", run: () => set({ textMode: true }) },
    ];
  }, [set]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.label + " " + i.hint + " " + i.id).toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const close = () => set({ paletteOpen: false });
  const run = (item: Item | undefined) => {
    if (!item) return;
    close();
    item.run();
  };

  return (
    <div className="palette-backdrop" onMouseDown={close}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          className="palette-input"
          placeholder="Where to? Type a section or action…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(filtered.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              run(filtered[active]);
            } else if (e.key === "Escape") {
              close();
            }
          }}
          aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
          aria-controls="palette-list"
        />
        <ul className="palette-list" id="palette-list" role="listbox">
          {filtered.length === 0 && <li className="palette-empty">Nothing matches “{query}”.</li>}
          {filtered.map((item, i) => (
            <li
              key={item.id}
              id={`cmd-${item.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(item)}
            >
              <span className="palette-group">{item.group}</span>
              <span className="palette-label">{item.label}</span>
              <span className="palette-hint">{item.hint}</span>
            </li>
          ))}
        </ul>
        <p className="palette-foot">
          <kbd>↑</kbd>
          <kbd>↓</kbd> to move · <kbd>↵</kbd> to open · <kbd>esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
