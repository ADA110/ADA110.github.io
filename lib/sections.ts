export type SectionId =
  | "about"
  | "projects"
  | "experience"
  | "skills"
  | "contact"
  | "resume"
  | "outdoors"
  | "weather"
  | "notes";

type Vec3 = [number, number, number];

export type Section = {
  id: SectionId;
  label: string;
  /** What the visitor clicks in the room. */
  object: string;
  inNav: boolean;
  /** Camera position and look-at target when this section is open. */
  camera: { position: Vec3; target: Vec3 };
};

export const HOME_CAMERA = {
  position: [1.6, 1.62, 2.15] as Vec3,
  target: [0.05, 0.98, -0.2] as Vec3,
};

/** Tall phone screens look across the room from the front-right corner, so the window and the whole desk wall fit. */
export const HOME_CAMERA_PORTRAIT = {
  position: [2.0, 1.45, 2.8] as Vec3,
  target: [0.3, 1.05, -0.3] as Vec3,
};

export const SECTIONS: Section[] = [
  {
    id: "about",
    label: "About",
    object: "Picture frame",
    inNav: true,
    camera: { position: [0.52, 1.0, 0.12], target: [0.4, 0.86, -0.38] },
  },
  {
    id: "projects",
    label: "Projects",
    object: "Monitor",
    inNav: true,
    camera: { position: [0.05, 1.12, 0.72], target: [0.0, 1.04, -0.3] },
  },
  {
    id: "experience",
    label: "Experience",
    object: "Corkboard",
    inNav: true,
    camera: { position: [-0.36, 1.6, 1.08], target: [-0.38, 1.6, -0.55] },
  },
  {
    id: "skills",
    label: "Skills",
    object: "Bookshelf",
    inNav: true,
    camera: { position: [1.5, 1.3, 1.95], target: [1.72, 1.02, -0.4] },
  },
  {
    id: "contact",
    label: "Contact",
    object: "Phone",
    inNav: true,
    camera: { position: [-0.36, 1.12, 0.52], target: [-0.4, 0.76, 0.12] },
  },
  {
    id: "resume",
    label: "Resume",
    object: "Printer",
    inNav: true,
    camera: { position: [1.12, 1.22, 0.75], target: [1.08, 0.74, -0.24] },
  },
  {
    id: "outdoors",
    label: "Outdoors",
    object: "Gear corner",
    inNav: false,
    camera: { position: [-1.12, 1.4, 1.75], target: [-1.12, 0.62, -0.3] },
  },
  {
    id: "weather",
    label: "Where I live",
    object: "Wall display",
    inNav: false,
    // Angled so the display and the window (the sky outside) are both in view.
    camera: { position: [0.25, 1.5, 1.6], target: [-1.3, 1.52, -0.2] },
  },
  {
    id: "notes",
    label: "CS teaching notes",
    object: "Stack of notes",
    inNav: false,
    camera: { position: [0.86, 1.12, 0.32], target: [0.62, 0.76, -0.2] },
  },
];

export const sectionById = (id: string | null | undefined) =>
  SECTIONS.find((s) => s.id === id) ?? null;

export const sectionFromPath = (pathname: string | null) =>
  sectionById(pathname?.split("/").filter(Boolean)[0]);
