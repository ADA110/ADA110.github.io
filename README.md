# Abhinav's desk

A personal website that is a realistic 3D desk. Click an object to read about it:

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
| Lamp | Light / dark mode | — |
| Chair | Click it for a spin | — |

Everything is also reachable from the nav bar, the ⌘K menu, ←/→ keys, and a text-only version (in the ⌘K menu).

## Editing content

All copy lives in [`content/site.ts`](content/site.ts). The 3D scene reads from it too:
corkboard cards, book spines, the monitor's project grid, and the phone notification all update automatically.

- **Resume:** drop your PDF at `public/resume.pdf`.

## How it's built

- Next.js (App Router) + React Three Fiber + drei + postprocessing.
- **Photo-scanned assets** from [Poly Haven](https://polyhaven.com) (CC0): the lamp, plants, picture frames,
  lantern, notebook and stationery (`public/models/`), the walnut, oak, plaster, wool, leather and linen
  materials (`public/textures/`), and the `small_empty_room_1` HDRI used for reflections (`public/env/`).
  Everything else — monitor, keyboard, headphones, phone, printer, books, gear — is modeled in code
  (`components/scene/`). Sounds are synthesized with WebAudio (`lib/sound.ts`).
- **Asset pipeline:** `node scripts/optimize-assets.mjs <raw dir>` rebuilds every model, texture and the HDRI from the
  original Poly Haven downloads, sized for how close the camera gets (meshopt geometry, WebP textures, a 256px HDRI).
  `lib/assets.ts` lists every file; the page `<head>` preloads them all in parallel, and the scene compiles shaders and
  uploads textures behind the loader before the first frame. Inspect a model with `node scripts/inspect-gltf.mjs`.
- Debug any camera framing with `?cam=x,y,z,targetX,targetY,targetZ`.
- Lighting: lamp spotlight with soft (PCSS) shadows, sunlight through the window that follows the
  visitor's local time, monitor glow (RectAreaLight), and a procedural environment for reflections.
  Post: N8AO ambient occlusion, bloom, vignette, film grain, AgX tone mapping.
- **Live Palo Alto time + weather** (Open-Meteo, no API key, fetched in the browser every 10 min; `lib/weather.ts`)
  drives the window view (foothills + tree line, sun/moon/stars, clouds, fog, rain, snow, lightning), the
  sunlight in the room, the wall display and the phone's lock screen.
- Preview any sky with `?hour=21` and/or `?weather=rain` (clear, partly, cloudy, fog, drizzle, rain, storm, snow),
  or from the wall display's panel.
- Drops to a cheaper render path automatically on slow devices, and falls back to the text version without WebGL.

```bash
npm run dev
```

## Deploying

The site is a static export (`output: "export"` → `out/`) hosted on GitHub Pages at https://ada110.github.io.
Every push to `master` builds and deploys it via `.github/workflows/deploy.yml`.
