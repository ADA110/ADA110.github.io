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

/** Scanned surface materials. Cel shading only uses colour, so each ships a single albedo map. */
export const MATERIALS = ["walnut_veneer", "wood_floor", "poly_wool_herringbone", "white_oak_veneer", "brown_leather", "caban"] as const;

export type ScannedMaterial = (typeof MATERIALS)[number];

export const modelUrl = (name: string) => `/models/${name}.glb`;
export const materialUrl = (name: ScannedMaterial) => `/textures/${name}/diff.webp`;

export const ALL_TEXTURE_URLS = MATERIALS.map(materialUrl);
