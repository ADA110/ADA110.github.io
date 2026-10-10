// All site copy lives here. Edit this file to update the website —
// the 3D scene (corkboard cards, book spines, monitor, phone) reads from it too.
// Everything below is PLACEHOLDER content until the real resume is dropped in.

export const site = {
  name: "Abhinav Ashar",
  initials: "AA",
  photo: { square: "/images/profile-square.webp", portrait: "/images/profile-portrait.webp" },
  role: "Software Engineer",
  tagline: "I build thoughtful software — and the occasional 3D desk.",
  location: "Stanford, CA",
  email: "hello@example.com",
  resumeUrl: "/resume.pdf",
  socials: [
    { label: "GitHub", href: "https://github.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "X / Twitter", href: "https://x.com/" },
  ],

  about: {
    paragraphs: [
      "Hi, I'm Abhinav. This is my desk — or at least a very convincing digital twin of one. Everything here is clickable, and every section is also one tap away in the menu.",
      "I like working where engineering meets craft: systems that are fast and reliable, and interfaces that feel good to use. (Placeholder bio — the real one is coming soon.)",
    ],
    facts: [
      { label: "Based in", value: "Stanford, CA" },
      { label: "Focus", value: "Full-stack · Graphics · AI" },
      { label: "Currently", value: "Building this website" },
      { label: "Fuel", value: "Too much coffee" },
    ],
  },

  projects: [
    {
      title: "This Website",
      year: "2026",
      blurb:
        "A hand-painted, Ghibli-style 3D room built with React Three Fiber: cel shading and line art drawn in real time, a sky driven by live Palo Alto weather, and synthesized sound.",
      tags: ["Three.js", "R3F", "GLSL", "Next.js"],
      links: [{ label: "Source", href: "https://github.com/" }],
      color: "#3b6cf6",
    },
    {
      title: "Project Two",
      year: "2025",
      blurb:
        "Placeholder project. Describe the problem, what you built, and the impact — numbers are great (e.g. cut latency 40%, 10k users).",
      tags: ["TypeScript", "Postgres", "AWS"],
      links: [{ label: "Live", href: "https://example.com" }],
      color: "#e2683c",
    },
    {
      title: "Project Three",
      year: "2025",
      blurb:
        "Placeholder project. A short, specific description of what you personally did beats a long list of technologies.",
      tags: ["Python", "PyTorch"],
      links: [{ label: "Code", href: "https://github.com/" }],
      color: "#16a37f",
    },
    {
      title: "Project Four",
      year: "2024",
      blurb: "Placeholder project. Swap me out for something you're proud of.",
      tags: ["Swift", "iOS"],
      links: [],
      color: "#a855f7",
    },
  ],

  experience: [
    {
      role: "Software Engineer",
      company: "Company One",
      dates: "2024 — Present",
      bullets: [
        "Placeholder: led X, which improved Y by Z%.",
        "Placeholder: built and shipped a feature used by N people.",
      ],
    },
    {
      role: "Software Engineering Intern",
      company: "Company Two",
      dates: "Summer 2023",
      bullets: ["Placeholder: what you built, and why it mattered."],
    },
    {
      role: "Research Assistant",
      company: "University Lab",
      dates: "2022 — 2023",
      bullets: ["Placeholder: research topic and outcome."],
    },
    {
      role: "B.S. Computer Science",
      company: "University",
      dates: "2020 — 2024",
      bullets: ["Placeholder: honors, activities, relevant coursework."],
    },
  ],

  skills: [
    {
      group: "Languages",
      items: ["TypeScript", "Python", "Go", "SQL", "GLSL"],
    },
    {
      group: "Frontend",
      items: ["React", "Next.js", "Three.js", "WebGL"],
    },
    {
      group: "Backend & Infra",
      items: ["Node.js", "Postgres", "Docker", "AWS"],
    },
    {
      group: "AI / Data",
      items: ["PyTorch", "LLM apps", "Pandas"],
    },
  ],

  // The gear corner: paddle, pack, boots and trail map.
  outdoors: {
    intro:
      "When I'm not at this desk, I'm usually outside. The Bay Area makes it easy: redwoods, coastline and mountains are all within a couple of hours.",
    activities: [
      { name: "Camping", emoji: "🏕️", note: "Placeholder: favorite campground or best trip." },
      { name: "Hiking", emoji: "🥾", note: "Placeholder: a trail you love, or a summit you're proud of." },
      { name: "Kayaking", emoji: "🛶", note: "Placeholder: where you paddle — bay, lakes, coast?" },
    ],
    bucketList: ["Placeholder: a dream trip", "Placeholder: a big summit", "Placeholder: a multi-day paddle"],
  },

  // The paper pile under the desk: study notes from the 2019 site, kept at their original URLs.
  notes: {
    intro:
      "Back in 2019 I wrote topic review notes for Berkeley's CS 61A and CS 61B. They quickly review key concepts, tips & tricks, and useful examples. Not an exhaustive textbook, just the things I felt were important to remember for the tests. They've been sitting in this pile ever since, but they're still here if they help you.",
    courses: [
      {
        code: "CS 61A",
        name: "Structure and Interpretation of Computer Programs",
        topics: [
          { title: "Environment Diagrams", file: "Environment_Diagrams.pdf" },
          { title: "Recursion and Data Abstraction", file: "Recursion__Tree_Recursion__and_Data_Abstraction.pdf" },
          { title: "Lists and Trees", file: "Lists_and_Trees.pdf" },
          { title: "Nonlocal and Iterators", file: "Nonlocal_and_Iterators.pdf" },
          { title: "OOP and Growth", file: "OOP_and_Growth.pdf" },
          { title: "Linked Lists and Mutable Trees", file: "Linked_Lists_and_Mutable_Trees.pdf" },
          { title: "Introduction to Scheme", file: "Introduction_to_Scheme.pdf" },
          { title: "Scheme Lists", file: "Scheme_Lists.pdf" },
          { title: "Interpreters and Macros", file: "Interpreters_and_Macros.pdf" },
          { title: "Tail Recursion and Streams", file: "Tail_Recursion_and_Streams.pdf" },
          { title: "Midterm 2 concept prep questions", file: "Concept Prep Questions 61A.pdf" },
        ],
      },
      {
        code: "CS 61B",
        name: "Data Structures",
        topics: [
          { title: "Objects, Arrays, and Inheritance", file: "Objects_Arrays_and_Inheritance.pdf" },
          { title: "Interfaces, Iterators, and Try/Catch", file: "Interfaces_Iterators_and_Try_Catch.pdf" },
          { title: "Asymptotics and Disjoint Sets", file: "Asymptotics_and_Disjoint_Sets.pdf" },
          { title: "Abstract Data Types and Trees", file: "Abstract_Data_Types_and_Trees.pdf" },
          { title: "Trees and Hashing", file: "Trees_and_Hashing.pdf" },
          { title: "Heaps and Tries", file: "Heaps_and_Tries.pdf" },
        ],
      },
    ],
  },

  // Shown when you click the headphones.
  onRepeat: [
    { title: "Placeholder Song", artist: "Some Artist" },
    { title: "Another Favorite", artist: "Another Artist" },
    { title: "Late Night Coding", artist: "Lo-fi Collective" },
  ],
};

export type Site = typeof site;
