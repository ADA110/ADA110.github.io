// Rebuilds every scanned asset in public/ from the original Poly Haven downloads, sized for how
// close the camera ever gets to it. Run after downloading the raw files (see README):
//
//   node scripts/optimize-assets.mjs <raw dir with models/ textures/ hdri/>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [px, px], quality: 80 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(join("public/models", `${name}.glb`), doc);
  console.log("model", name);
}

// ---------- surface materials: px per map (0 = not used by the site, not shipped)
const TEXTURES = {
  walnut_veneer: { diff: 1024, nor: 1024, rough: 512 }, // desk top, seen up close
  wood_floor: { diff: 1024, nor: 512, rough: 512 },
  plastered_wall_04: { diff: 0, nor: 512, rough: 256 }, // walls are painted: relief only
  poly_wool_herringbone: { diff: 512, nor: 512, rough: 256 },
  rough_linen: { diff: 0, nor: 512, rough: 256 }, // desk mat: dark dyed, relief only
  white_oak_veneer: { diff: 512, nor: 512, rough: 256 },
  brown_leather: { diff: 256, nor: 256, rough: 256 },
  caban: { diff: 256, nor: 256, rough: 256 },
};
for (const [name, maps] of Object.entries(TEXTURES)) {
  mkdirSync(join("public/textures", name), { recursive: true });
  for (const [map, px] of Object.entries(maps)) {
    if (!px) continue;
    await sharp(join(raw, "textures", name, `${map}.jpg`))
      .resize(px, px, { fit: "inside" })
      .webp({ quality: map === "nor" ? 85 : map === "rough" ? 70 : 78 })
      .toFile(join("public/textures", name, `${map}.webp`));
  }
  console.log("texture", name);
}

// ---------- reflection HDRI: only drives soft reflections, so 256x128 is plenty
writeFileSync("public/env/room.hdr", downsampleHDR(readFileSync(join(raw, "hdri", "small_empty_room_1_1k.hdr")), 4));
console.log("hdri");

/** Decode a Radiance RGBE (.hdr), box-filter it by `f`, and re-encode it (flat, no RLE). */
function downsampleHDR(buf, f) {
  let p = 0;
  const line = () => {
    const s = p;
    while (buf[p] !== 0x0a) p++;
    return buf.toString("latin1", s, p++);
  };
  while (line() !== "");
  const [, H, , W] = line().split(" ").map((v, i) => (i % 2 ? +v : v));
  const rgb = new Float32Array(W * H * 3);
  const scan = new Uint8Array(W * 4);
  for (let y = 0; y < H; y++) {
    if (buf[p] === 2 && buf[p + 1] === 2) {
      p += 4; // new-style RLE: four channel planes
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < W) {
          let n = buf[p++];
          if (n > 128) {
            n -= 128;
            const v = buf[p++];
            while (n--) scan[(x++) * 4 + c] = v;
          } else while (n--) scan[(x++) * 4 + c] = buf[p++];
        }
      }
    } else {
      scan.set(buf.subarray(p, p + W * 4));
      p += W * 4;
    }
    for (let x = 0; x < W; x++) {
      const e = scan[x * 4 + 3];
      const s = e ? Math.pow(2, e - 136) : 0;
      for (let c = 0; c < 3; c++) rgb[(y * W + x) * 3 + c] = scan[x * 4 + c] * s;
    }
  }
  const w = W / f, h = H / f;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sum = [0, 0, 0];
    for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) for (let c = 0; c < 3; c++) sum[c] += rgb[((y * f + j) * W + x * f + i) * 3 + c];
    const v = sum.map((s) => s / (f * f));
    const m = Math.max(...v);
    const o = (y * w + x) * 4;
    if (m < 1e-32) continue;
    const e = Math.ceil(Math.log2(m) + 1e-9);
    const sc = 256 / Math.pow(2, e);
    for (let c = 0; c < 3; c++) out[o + c] = Math.min(255, Math.floor(v[c] * sc));
    out[o + 3] = e + 128;
  }
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`, "latin1");
  return Buffer.concat([header, out]);
}
