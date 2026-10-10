# Abhi's desk

A personal website that is a hand-painted, anime-style 3D desk. Click an object to read about it:

| Object | Section | URL |
| --- | --- | --- |
| Monitor | Projects (the screen shows them too) | `/projects` |
| Corkboard | Experience (one pinned card per job) | `/experience` |
| Bookshelf | Skills (one book per skill) | `/skills` |
| Picture frame | About | `/about` |
| Phone | Contact | `/contact` |
| Printer | Resume (prints a page, then download) | `/resume` |
| Headphones | Music on repeat | `/music` |
| Wall display | Live Palo Alto time + weather, with sky previews | `/weather` |
| Gear corner (paddle, pack, boots) | Outdoors / hobbies | `/outdoors` |
| Lamp | Light / dark mode | |

Everything is also reachable from the nav bar, the ⌘K menu, ←/→ keys, and a text-only version (in the ⌘K menu).

## Editing content

All copy lives in [`content/site.ts`](content/site.ts). The 3D scene reads from it too:
corkboard cards, book spines, the monitor's project grid, and the phone notification all update automatically.

- **Resume:** drop your PDF at `public/resume.pdf`.

## How it's built

- Next.js (App Router, static export) + React Three Fiber + drei + postprocessing.
- **Hand-painted anime look** (Studio Ghibli–style): every PBR material gets a cel-shaded toon twin with
  soft light bands (`components/scene/style/CelShading.tsx`); photo textures are sampled softer so they read
  as painted. Post-processing draws soft coloured line art from depth + normals and applies a warm,
  lavender-shadowed colour grade (`components/scene/style/ink.tsx`).
- **Assets:** models (lamp, plants, frames, lantern, notebook, stationery) and wood/wool/leather colour maps
  are CC0 scans from [Poly Haven](https://polyhaven.com); everything else is modeled in code
  (`components/scene/`). Sounds are synthesized with WebAudio (`lib/sound.ts`).
- **Light:** the sun enters only through the window (the ceiling and walls cast shadows), from the same
  direction the painted sky draws it; a desk lamp with the light/dark switch; soft sky + floor bounce light.
- **Live Palo Alto time + weather** (Open-Meteo, no API key, fetched in the browser every 10 min; `lib/weather.ts`)
  drives the window view (foothills + tree line, sun/moon/stars, cumulus clouds, fog, rain, snow, lightning), the
  sunlight in the room, the wall display and the phone's lock screen.
- Preview any sky with `?hour=21` and/or `?weather=rain` (clear, partly, cloudy, fog, drizzle, rain, storm, snow),
  or from the wall display's panel.
- **Asset pipeline:** `node scripts/optimize-assets.mjs <raw dir>` rebuilds every model and texture from the
  original Poly Haven downloads, sized for how close the camera gets (meshopt geometry, WebP colour maps only).
  `lib/assets.ts` lists every file; the page `<head>` preloads them all in parallel. Inspect a model with
  `node scripts/inspect-gltf.mjs`.
- Debug any camera framing with `?cam=x,y,z,targetX,targetY,targetZ`.
- Drops to a cheaper render path automatically on slow devices, and falls back to the text version without WebGL.

```bash
npm run dev
```

## Deploying

The site is a static export (`output: "export"` → `out/`) hosted on GitHub Pages at https://ada110.github.io.
Every push to `master` builds and deploys it via `.github/workflows/deploy.yml`.
