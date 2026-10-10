import { Experience } from "@/components/Experience";

// The 3D desk lives in this layout so it stays mounted while the URL changes between sections.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Experience />
      {children}
    </>
  );
}
