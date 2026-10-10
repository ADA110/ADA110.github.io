import { preload } from "react-dom";
import { Experience } from "@/components/Experience";
import { ALL_TEXTURE_URLS, ENV_URL, MODEL_NAMES, modelUrl } from "@/lib/assets";

// The 3D desk lives in this layout so it stays mounted while the URL changes between sections.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // Start every 3D asset download from the HTML <head>, in parallel, before any JavaScript runs.
  // Request modes match three.js's loaders (fetch for models/HDR, anonymous-CORS images) so the
  // browser reuses these responses instead of downloading twice.
  MODEL_NAMES.forEach((m) => preload(modelUrl(m), { as: "fetch", crossOrigin: "anonymous" }));
  preload(ENV_URL, { as: "fetch", crossOrigin: "anonymous" });
  ALL_TEXTURE_URLS.forEach((url) => preload(url, { as: "image", crossOrigin: "anonymous" }));
  return (
    <>
      <Experience />
      {children}
    </>
  );
}
