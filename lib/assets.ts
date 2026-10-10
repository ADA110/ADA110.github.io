// Every file the 3D room downloads. Shared by the page <head> (which starts all downloads
// immediately, in parallel) and the scene loaders, so nothing waits on anything else.
// Sizes are set by scripts/optimize-assets.mjs.

export const MODEL_NAMES = [
  "desk_lamp_arm_01",
  "potted_plant_02",
  "potted_plant_04",
  "standing_picture_frame_01",
  "hanging_picture_frame_01",
  "Lantern_01",
  "stationery_supplies",
  "binder_notebook",
] as const;

/** Scanned surface materials and which maps each one ships (painted/dyed surfaces skip albedo). */
export const MATERIAL_MAPS = {
  walnut_veneer: ["diff", "nor", "rough"],
  wood_floor: ["diff", "nor", "rough"],
  plastered_wall_04: ["nor", "rough"],
  poly_wool_herringbone: ["diff", "nor", "rough"],
  rough_linen: ["nor", "rough"],
  white_oak_veneer: ["diff", "nor", "rough"],
  brown_leather: ["diff", "nor", "rough"],
  caban: ["diff", "nor", "rough"],
} as const;

export type ScannedMaterial = keyof typeof MATERIAL_MAPS;

export const modelUrl = (name: string) => `/models/${name}.glb`;
export const materialUrls = (name: ScannedMaterial) => MATERIAL_MAPS[name].map((m) => `/textures/${name}/${m}.webp`);
export const ENV_URL = "/env/room.hdr";

export const ALL_TEXTURE_URLS = (Object.keys(MATERIAL_MAPS) as ScannedMaterial[]).flatMap(materialUrls);
