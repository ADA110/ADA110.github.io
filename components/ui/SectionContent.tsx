"use client";

import Image from "next/image";
import { useState } from "react";
import { site } from "@/content/site";
import { ICONS } from "@/lib/icons";
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
          <strong>Off the clock:</strong>{" "}
          <span className="muted">{site.outdoors.activities.map((a) => a.name.toLowerCase()).join(", ")}</span>
        </span>
        <span aria-hidden>→</span>
      </a>
      <a className="card offclock" href="/notes" onClick={(e) => goTo(e, "notes")}>
        <span aria-hidden>📄</span>
        <span>
          <strong>Throwback:</strong> <span className="muted">the CS 61A & 61B notes I wrote while teaching</span>
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
            <span className="eyebrow">{a.label}</span>
            <h3>{a.place}</h3>
            <p className="muted">{a.where}</p>
          </div>
        </div>
      ))}
      <section>
        <h3 className="eyebrow">Bucket list</h3>
        <ul className="checklist">
          {site.outdoors.bucketList.map((b) => (
            <li key={b.place}>
              {b.place} <span className="muted">· {b.where}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Projects() {
  return (
    <div className="stack">
      <a className="card offclock" href={site.github} target="_blank" rel="noreferrer">
        <span aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
          </svg>
        </span>
        <span>
          <strong>Everything else I&apos;ve built:</strong> <span className="muted">github.com/abhi-ashar</span>
        </span>
        <span aria-hidden>↗</span>
      </a>
      {site.projects.map((p) => (
        <article key={p.title} className="card project">
          <div className="project-art" style={{ "--c": p.color } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[p.icon].map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
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
      <a className="card offclock" href={site.linkedin} target="_blank" rel="noreferrer">
        <span aria-hidden>in</span>
        <span>
          <strong>The full story:</strong> <span className="muted">all my experience on LinkedIn</span>
        </span>
        <span aria-hidden>↗</span>
      </a>
      <ol className="timeline">
        {site.experience.map((job) => (
          <li key={job.role + job.company}>
            <div className="dot" aria-hidden />
            <p className="muted small">{[job.dates, job.location].filter(Boolean).join(" · ")}</p>
            <h3>{job.role}</h3>
            <p className="company">{job.company}</p>
            {job.bullets && (
              <ul>
                {job.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Skills() {
  return (
    <div className="stack">
      <p className="muted">Each one is a book on the shelf. Hover the spines.</p>
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

function EmailRow({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };
  return (
    <div className="email-row">
      <a href={`mailto:${email}`} className="email">
        {email}
      </a>
      <button className="btn" onClick={copy} aria-label={`Copy ${email}`}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

function Contact() {
  return (
    <div className="stack">
      <p>The fastest way to reach me is email. Either address works, and I read everything.</p>
      {site.emails.map((e) => (
        <EmailRow key={e} email={e} />
      ))}
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
      <a className="btn primary big" href={site.resumeUrl} download="Abhi Ashar Resume.pdf">
        Download resume (PDF)
      </a>
      <a className="text-link" href={site.resumeUrl} target="_blank" rel="noreferrer">
        Open in a new tab ↗
      </a>
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
  outdoors: { title: "Off the clock", kicker: "The gear corner" },
  weather: { title: "Where I live", kicker: "The wall display" },
  notes: { title: "CS teaching notes", kicker: "The stack on the desk" },
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
    case "outdoors":
      return <Outdoors />;
    case "weather":
      return <WeatherNow />;
    case "notes":
      return <Notes />;
  }
}
