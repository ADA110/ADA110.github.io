// All site copy lives here. Edit this file to update the website;
// the 3D scene (corkboard cards, book spines, monitor, phone) reads from it too.
// Everything below is PLACEHOLDER content until the real resume is dropped in.

import type { IconName } from "@/lib/icons";

export const site = {
  name: "Abhi Ashar",
  initials: "AA",
  photo: { square: "/images/profile-square.webp", portrait: "/images/profile-portrait.webp" },
  tagline: "I build thoughtful software, and the occasional 3D desk.",
  location: "Stanford, CA",
  emails: ["aashar@stanford.edu", "abhinav.ashar2@gmail.com"],
  resumeUrl: "/resume.pdf",
  linkedin: "https://www.linkedin.com/in/abhinavashar/",
  github: "https://github.com/ADA110",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/abhinavashar/" },
    { label: "GitHub", href: "https://github.com/ADA110" },
  ],

  about: {
    paragraphs: [
      "Hi, I'm Abhi. This is my desk, or at least a very convincing digital twin of one. Everything here is clickable, and every section is also one tap away in the menu.",
      "I like working where engineering meets craft: systems that are fast and reliable, and interfaces that feel good to use. (Placeholder bio: the real one is coming soon.)",
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
      title: "Personal Website",
      icon: "cube",
      year: "2026",
      blurb:
        "A hand-painted, Ghibli-style 3D room built with React Three Fiber: cel shading and line art drawn in real time, a sky that follows the real weather where I live, and synthesized sound.",
      tags: ["Three.js", "R3F", "GLSL", "Next.js"],
      links: [{ label: "Code", href: "https://github.com/ADA110/ADA110.github.io" }],
      color: "#3b6cf6",
    },
    {
      title: "Agents Workshop",
      icon: "bot",
      year: "2026",
      blurb:
        "A hands-on workshop that teaches multi-agent AI. Students build a Claude Code team (a manager plus Researcher, Writer and Editor agents) that drafts a real cold email, guided step by step by this site, with an instructor console that tracks everyone's progress.",
      tags: ["Claude Code", "Multi-agent", "Vercel", "Redis"],
      links: [
        { label: "Live", href: "https://agents-outreach-team.vercel.app" },
        { label: "Code", href: "https://github.com/ADA110/outreach-workshop-site" },
      ],
      color: "#e2683c",
    },
    {
      title: "GSB Housing",
      icon: "house",
      year: "2026",
      blurb:
        "A housing board for Stanford GSB MBA students to find sublets and connect with classmates looking for a place. Sign-in is verified with a Stanford email code, and the API is rate-limited and covered by tests.",
      tags: ["React", "Express", "Postgres", "Vercel"],
      links: [
        { label: "Live", href: "https://gsb-housing.vercel.app" },
        { label: "Code", href: "https://github.com/ADA110/gsb_housing" },
      ],
      color: "#8c1515",
    },
    {
      title: "Canvas MCP",
      icon: "cap",
      year: "2026",
      blurb:
        "An MCP server that connects Claude to Canvas, so you can ask about your courses, assignments, modules, announcements and upcoming due dates in plain English.",
      tags: ["TypeScript", "MCP", "Canvas API"],
      links: [{ label: "Code", href: "https://github.com/ADA110/canvas-mcp" }],
      color: "#16a37f",
    },
  ] as { title: string; icon: IconName; year: string; blurb: string; tags: string[]; links: { label: string; href: string }[]; color: string }[],

  // Newest first. `dates` and `location` are both optional; whichever exist are shown together.
  // `short` is an optional shorter name for the corkboard cards.
  experience: [
    {
      role: "MBA",
      company: "Stanford Graduate School of Business",
      short: "Stanford GSB", // fits the corkboard card
      dates: "2025 – Present",
      location: "Stanford, CA",
    },
    {
      role: "Applied AI Product Manager Intern",
      company: "Google Cloud",
      dates: "Jun – Sep 2026",
    },
    {
      role: "Software Engineer",
      company: "Amazon",
      dates: "2021 – 2025",
      location: "Seattle, WA",
    },
    {
      role: "Bachelor's, EECS + Business (M.E.T.)",
      company: "UC Berkeley",
      dates: "2017 – 2021",
      location: "Berkeley, CA",
    },
    { role: "Grew up in Houston", company: "Houston, TX", dates: "2002 – 2017" },
    { role: "Born in Mumbai", company: "Mumbai, India", dates: "Until 2002" },
  ] as { role: string; company: string; short?: string; dates?: string; location?: string; bullets?: string[] }[],

  // From the resume. One shelf of books per group on the bookshelf.
  skills: [
    {
      group: "Programming",
      items: ["Java", "Python", "Kotlin"],
    },
    {
      group: "AI & Machine Learning",
      items: ["LLMs", "Generative AI", "AI Agents", "MCP Servers", "Model Evals", "Loss Pattern Analysis", "Machine Learning"],
    },
    {
      group: "Data & Cloud",
      items: ["Data Processing", "Cloud Computing", "Evals & A/B Testing"],
    },
    {
      group: "Product",
      items: ["Product Design", "Roadmapping", "Customer Adoption", "Team Management", "Cross-Functional Communication", "Stakeholder Management"],
    },
  ],

  // The gear corner: paddle, pack, boots and a Seattle print.
  outdoors: {
    intro:
      "I'm from Seattle, and I really love nature. The Pacific Northwest is where I learned to camp, hike and kayak, and these are some of the places that captured my heart.",
    activities: [
      { name: "Camping", emoji: "🏕️", label: "Favorite campground", place: "Colonial Creek Campground", where: "North Cascades National Park, WA" },
      { name: "Hiking", emoji: "🥾", label: "Favorite hike", place: "Mount Storm King Trail", where: "Lake Crescent, Olympic National Park, WA" },
      { name: "Kayaking", emoji: "🛶", label: "Favorite kayaking spot", place: "Diablo Lake", where: "North Cascades, WA" },
    ],
    bucketList: [
      { place: "Glacier National Park", where: "Montana" },
      { place: "Banff National Park", where: "Alberta, Canada" },
      { place: "Acadia National Park", where: "Maine" },
    ],
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
