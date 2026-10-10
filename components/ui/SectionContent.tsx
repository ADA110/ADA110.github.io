"use client";

import Image from "next/image";
import { useState } from "react";
import { site } from "@/content/site";
import { WeatherNow } from "./WeatherNow";
import type { SectionId } from "@/lib/sections";
import { useStore } from "@/lib/store";

/** In-app links: move the camera instead of reloading the page. */
function goTo(e: React.MouseEvent, id: SectionId) {
  const { textMode, go } = useStore.getState();
  e.preventDefault();
  if (textMode) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  else go(id);
}

function About() {
  return (
    <div className="stack">
      <div className="about-head">
        <Image className="about-photo" src={site.photo.square} alt={site.name} width={400} height={400} priority />
        <div>
          <p className="lead">{site.name}</p>
          <p className="muted">
            {site.location}
          </p>
        </div>
      </div>
      {site.about.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <a className="card offclock" href="/outdoors" onClick={(e) => goTo(e, "outdoors")}>
        <span aria-hidden>🏕️</span>
        <span>
          <strong>Off the clock</strong>
          <span className="muted"> — {site.outdoors.activities.map((a) => a.name.toLowerCase()).join(", ")}</span>
        </span>
        <span aria-hidden>→</span>
      </a>
      <a className="card offclock" href="/notes" onClick={(e) => goTo(e, "notes")}>
        <span aria-hidden>📄</span>
        <span>
          <strong>Throwback</strong>
          <span className="muted"> — my 2019 CS 61A & 61B study notes</span>
        </span>
        <span aria-hidden>→</span>
      </a>
      <dl className="facts">
        {site.about.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Notes() {
  return (
    <div className="stack">
      <p>{site.notes.intro}</p>
      {site.notes.courses.map((c) => (
        <section key={c.code} className="stack">
          <header>
            <h3 className="eyebrow">{c.code}</h3>
            <p className="muted small">{c.name}</p>
          </header>
          <ul className="note-list">
            {c.topics.map((t) => (
              <li key={t.file}>
                <a href={`/dist/course_notes/${encodeURIComponent(t.file)}`} target="_blank" rel="noreferrer">
                  <span>{t.title}</span>
                  <span className="muted" aria-hidden>
                    PDF ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Outdoors() {
  return (
    <div className="stack">
      <p>{site.outdoors.intro}</p>
      {site.outdoors.activities.map((a) => (
        <div key={a.name} className="card activity">
          <span className="activity-icon" aria-hidden>
            {a.emoji}
          </span>
          <div>
            <h3>{a.name}</h3>
            <p className="muted">{a.note}</p>
          </div>
        </div>
      ))}
      <section>
        <h3 className="eyebrow">Bucket list</h3>
        <ul className="checklist">
          {site.outdoors.bucketList.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Projects() {
  return (
    <div className="stack">
      {site.projects.map((p) => (
        <article key={p.title} className="card project">
          <div className="project-art" style={{ "--c": p.color } as React.CSSProperties}>
            <span>{p.title.charAt(0)}</span>
          </div>
          <div className="project-body">
            <header>
              <h3>{p.title}</h3>
              <span className="muted">{p.year}</span>
            </header>
            <p>{p.blurb}</p>
            <ul className="chips">
              {p.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {p.links.length > 0 && (
              <div className="links">
                {p.links.map((l) => (
                  <a key={l.href + l.label} href={l.href} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function Experience() {
  return (
    <div className="stack">
      <ol className="timeline">
        {site.experience.map((job) => (
          <li key={job.role + job.company}>
            <div className="dot" aria-hidden />
            <p className="muted small">{[job.dates, job.location].filter(Boolean).join(" · ")}</p>
            <h3>{job.role}</h3>
            <p className="company">{job.company}</p>
            <ul>
              {job.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <a className="card offclock" href={site.linkedin} target="_blank" rel="noreferrer">
        <span aria-hidden>in</span>
        <span>
          <strong>The full story</strong>
          <span className="muted"> — all my experience on LinkedIn</span>
        </span>
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

function Skills() {
  return (
    <div className="stack">
      <p className="muted">Each one is a book on the shelf — hover the spines.</p>
      {site.skills.map((g) => (
        <section key={g.group}>
          <h3 className="eyebrow">{g.group}</h3>
          <ul className="chips big">
            {g.items.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };
  return (
    <div className="stack">
      <p>The fastest way to reach me is email. I read everything.</p>
      <div className="email-row">
        <a href={`mailto:${site.email}`} className="email">
          {site.email}
        </a>
        <button className="btn" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <ul className="socials">
        {site.socials.map((s) => (
          <li key={s.label}>
            <a href={s.href} target="_blank" rel="noreferrer">
              {s.label} <span aria-hidden>↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Resume() {
  return (
    <div className="stack">
      <p>Hot off the printer. The one-page version of everything on this desk.</p>
      <a className="btn primary big" href={site.resumeUrl} download>
        Download resume (PDF)
      </a>
      <a className="text-link" href={site.resumeUrl} target="_blank" rel="noreferrer">
        Open in a new tab ↗
      </a>
    </div>
  );
}

function Music() {
  return (
    <div className="stack">
      <p className="muted">What&apos;s been on repeat lately:</p>
      <ol className="tracks">
        {site.onRepeat.map((t, i) => (
          <li key={t.title}>
            <span className="muted">{String(i + 1).padStart(2, "0")}</span>
            <span>
              {t.title}
              <span className="muted"> — {t.artist}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const SECTION_INTRO: Record<SectionId, { title: string; kicker: string }> = {
  about: { title: "About me", kicker: "The picture frame" },
  projects: { title: "Projects", kicker: "The monitor" },
  experience: { title: "Experience", kicker: "The corkboard" },
  skills: { title: "Skills", kicker: "The bookshelf" },
  contact: { title: "Say hello", kicker: "The phone" },
  resume: { title: "Resume", kicker: "The printer" },
  music: { title: "Now playing", kicker: "The headphones" },
  outdoors: { title: "Off the clock", kicker: "The gear corner" },
  weather: { title: "Palo Alto, right now", kicker: "The wall display" },
  notes: { title: "Old CS notes", kicker: "The paper pile" },
};

export function SectionContent({ id }: { id: SectionId }) {
  switch (id) {
    case "about":
      return <About />;
    case "projects":
      return <Projects />;
    case "experience":
      return <Experience />;
    case "skills":
      return <Skills />;
    case "contact":
      return <Contact />;
    case "resume":
      return <Resume />;
    case "music":
      return <Music />;
    case "outdoors":
      return <Outdoors />;
    case "weather":
      return <WeatherNow />;
    case "notes":
      return <Notes />;
  }
}
