// Rebuilds every scanned asset in public/ from the original Poly Haven downloads, sized for how
// close the camera ever gets to it. The site is cel-shaded, so only colour maps ship: normal,
// roughness/metalness and occlusion maps are stripped. Run after downloading the raw files:
//
//   node scripts/optimize-assets.mjs <raw dir with models/ textures/>
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const raw = process.argv[2];
if (!raw) throw new Error("usage: node scripts/optimize-assets.mjs <raw dir>");

// ---------- models: [texture px, meshes to simplify (node name -> [kept ratio, max error as fraction of size])]
const MODELS = {
  desk_lamp_arm_01: [512],
  potted_plant_02: [512, { potted_plant_02_dirt: [0.06, 0.02] }], // dense soil scan, mostly hidden by leaves
  potted_plant_04: [512],
  standing_picture_frame_01: [512],
  hanging_picture_frame_01: [512],
  Lantern_01: [512, { Lantern_01: [0.25, 0.004] }], // small on the windowsill
  stationery_supplies: [512],
  binder_notebook: [512],
};

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
mkdirSync("public/models", { recursive: true });
for (const [name, [px, reduce = {}]] of Object.entries(MODELS)) {
  const doc = await io.read(join(raw, "models", name, `${name}.gltf`));
  await doc.transform(weld());
  for (const [nodeName, [ratio, error]] of Object.entries(reduce)) {
    // simplify() works per document; isolate the target by temporarily detaching other meshes.
    const others = doc.getRoot().listNodes().filter((n) => n.getMesh() && n.getName() !== nodeName);
    const saved = others.map((n) => [n, n.getMesh()]);
    saved.forEach(([n]) => n.setMesh(null));
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error }));
    saved.forEach(([n, m]) => n.setMesh(m));
  }
  for (const m of doc.getRoot().listMaterials()) m.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null);
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [px, px], quality: 80 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(join("public/models", `${name}.glb`), doc);
  console.log("model", name);
}

// ---------- surface materials: colour map only, px per material
const TEXTURES = {
  walnut_veneer: 1024, // desk top, seen up close
  wood_floor: 1024,
  poly_wool_herringbone: 512,
  white_oak_veneer: 512,
  brown_leather: 256,
  caban: 256,
};
rmSync("public/textures", { recursive: true, force: true });
for (const [name, px] of Object.entries(TEXTURES)) {
  mkdirSync(join("public/textures", name), { recursive: true });
  await sharp(join(raw, "textures", name, "diff.jpg"))
    .resize(px, px, { fit: "inside" })
    .webp({ quality: 78 })
    .toFile(join("public/textures", name, "diff.webp"));
  console.log("texture", name);
}
