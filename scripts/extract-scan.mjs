// Cuts a photogrammetry subject out of the ground it was scanned on.
//
//   node scripts/extract-scan.mjs <in.gltf> <out.glb> [--min-height 0.03] [--tex 4096]
//
// 1. Fits the ground plane to the vertices near the scan's outer border.
// 2. Keeps triangles whose centroid sits clearly above that plane.
// 3. Keeps only the largest connected piece (drops leaves, pebbles, stray bumps).
// 4. Fills texture regions no longer referenced by any UV with a flat colour so they compress to nothing.
// 5. Makes the material lit (scans are often exported unlit) and moves the subject to the origin, resting on y = 0.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, compactPrimitive } from "@gltf-transform/functions";
import sharp from "sharp";

const [input, output, ...rest] = process.argv.slice(2);
const opt = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : def;
};
const MIN_H = opt("min-height", 0.03);
const TEX = opt("tex", 4096);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();

// Bake node transforms into the mesh so "up" really is +y.
const node = root.listNodes().find((n) => n.getMesh());
const world = node.getWorldMatrix();
const prim = node.getMesh().listPrimitives()[0];
const pos = prim.getAttribute("POSITION");
const nor = prim.getAttribute("NORMAL");
const idx = prim.getIndices();
const n = pos.getCount();

const mul = (m, [x, y, z], w) => [
  m[0] * x + m[4] * y + m[8] * z + m[12] * w,
  m[1] * x + m[5] * y + m[9] * z + m[13] * w,
  m[2] * x + m[6] * y + m[10] * z + m[14] * w,
];
const P = new Float32Array(n * 3);
const v = [];
for (let i = 0; i < n; i++) {
  pos.getElement(i, v);
  P.set(mul(world, v, 1), i * 3);
}
if (nor) {
  for (let i = 0; i < n; i++) {
    nor.getElement(i, v);
    const r = mul(world, v, 0);
    const l = Math.hypot(...r) || 1;
    nor.setElement(i, r.map((c) => c / l));
  }
}

// --- 1. ground plane y = a x + b z + c, least squares over the outer 25% border
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < n; i++) {
  minX = Math.min(minX, P[i * 3]); maxX = Math.max(maxX, P[i * 3]);
  minZ = Math.min(minZ, P[i * 3 + 2]); maxZ = Math.max(maxZ, P[i * 3 + 2]);
}
const bx = (maxX - minX) * 0.25, bz = (maxZ - minZ) * 0.25;
const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0];
for (let i = 0; i < n; i++) {
  const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
  if (x > minX + bx && x < maxX - bx && z > minZ + bz && z < maxZ - bz) continue;
  const r = [x, z, 1];
  for (let a = 0; a < 3; a++) {
    B[a] += r[a] * y;
    for (let b = 0; b < 3; b++) A[a][b] += r[a] * r[b];
  }
}
const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const D = det(A);
const solve = (k) => det(A.map((row, i) => row.map((c, j) => (j === k ? B[i] : c)))) / D;
const [pa, pb, pc] = [solve(0), solve(1), solve(2)];
const height = (i) => P[i * 3 + 1] - (pa * P[i * 3] + pb * P[i * 3 + 2] + pc);

// --- 2. keep triangles clearly above the ground
const tris = idx.getArray();
const keep = [];
for (let t = 0; t < tris.length; t += 3) {
  const h = (height(tris[t]) + height(tris[t + 1]) + height(tris[t + 2])) / 3;
  if (h > MIN_H) keep.push(t);
}

// --- 3. largest connected component (triangles sharing a vertex position)
const key = (i) => `${P[i * 3].toFixed(5)},${P[i * 3 + 1].toFixed(5)},${P[i * 3 + 2].toFixed(5)}`;
const parent = new Map();
const find = (k) => {
  while (parent.get(k) !== k) {
    parent.set(k, parent.get(parent.get(k)));
    k = parent.get(k);
  }
  return k;
};
const union = (a, b) => {
  if (!parent.has(a)) parent.set(a, a);
  if (!parent.has(b)) parent.set(b, b);
  parent.set(find(a), find(b));
};
for (const t of keep) {
  const [a, b, c] = [key(tris[t]), key(tris[t + 1]), key(tris[t + 2])];
  union(a, b);
  union(b, c);
}
const sizes = new Map();
for (const t of keep) {
  const r = find(key(tris[t]));
  sizes.set(r, (sizes.get(r) ?? 0) + 1);
}
const biggest = [...sizes.entries()].sort((x, y) => y[1] - x[1])[0][0];
const kept = keep.filter((t) => find(key(tris[t])) === biggest);
console.log(`ground plane y=${pa.toFixed(4)}x+${pb.toFixed(4)}z+${pc.toFixed(4)}; triangles ${tris.length / 3} -> ${keep.length} above ground -> ${kept.length} in subject`);

// --- write positions (world space, recentred, resting on y=0) and new indices
const newIdx = new Uint32Array(kept.length * 3);
kept.forEach((t, i) => newIdx.set([tris[t], tris[t + 1], tris[t + 2]], i * 3));
let cx = 0, cz = 0, minY = Infinity, cnt = 0;
for (const i of newIdx) {
  cx += P[i * 3]; cz += P[i * 3 + 2]; cnt++;
  minY = Math.min(minY, P[i * 3 + 1]);
}
cx /= cnt; cz /= cnt;
for (let i = 0; i < n; i++) pos.setElement(i, [P[i * 3] - cx, P[i * 3 + 1] - minY, P[i * 3 + 2] - cz]);
idx.setArray(newIdx);
root.listNodes().forEach((nd) => nd.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
compactPrimitive(prim);

// --- 4. blank out texture regions no kept UV touches (then dilate the mask so edges don't bleed)
const mat = prim.getMaterial();
const texInfo = mat.getBaseColorTexture();
const img = sharp(Buffer.from(texInfo.getImage())).resize(TEX, TEX);
const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const mask = new Uint8Array(W * H);
const uvs = prim.getAttribute("TEXCOORD_0");
const ia = prim.getIndices().getArray();
const u = [], w2 = [], w3 = [];
for (let t = 0; t < ia.length; t += 3) {
  uvs.getElement(ia[t], u); uvs.getElement(ia[t + 1], w2); uvs.getElement(ia[t + 2], w3);
  const pts = [u, w2, w3].map(([s, q]) => [s * W, q * H]);
  const x0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0]))) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(...pts.map((p) => p[0]))) + 1);
  const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1]))) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(...pts.map((p) => p[1]))) + 1);
  const [[ax, ay], [bxx, by], [cxx, cy]] = pts;
  const area = (bxx - ax) * (cy - ay) - (cxx - ax) * (by - ay);
  if (Math.abs(area) < 1e-9) continue;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5;
    const l1 = ((bxx - px) * (cy - py) - (cxx - px) * (by - py)) / area;
    const l2 = ((cxx - px) * (ay - py) - (ax - px) * (cy - py)) / area;
    const l3 = 1 - l1 - l2;
    if (l1 >= -0.02 && l2 >= -0.02 && l3 >= -0.02) mask[y * W + x] = 1;
  }
}
for (let pass = 0; pass < 4; pass++) {
  const prev = mask.slice();
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!prev[i] && (prev[i - 1] || prev[i + 1] || prev[i - W] || prev[i + W])) mask[i] = 1;
  }
}
let sr = 0, sg = 0, sb = 0, sc = 0;
for (let i = 0; i < W * H; i++) if (mask[i]) { sr += data[i * 3]; sg += data[i * 3 + 1]; sb += data[i * 3 + 2]; sc++; }
const fill = [sr / sc, sg / sc, sb / sc];
for (let i = 0; i < W * H; i++) if (!mask[i]) data.set(fill, i * 3);
const webp = await sharp(data, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 82 }).toBuffer();
texInfo.setImage(webp).setMimeType("image/webp");
console.log(`texture ${W}x${H}: ${((100 * sc) / (W * H)).toFixed(1)}% in use`);

// --- 5. lit material
root.listExtensionsUsed().filter((e) => e.extensionName === "KHR_materials_unlit").forEach((e) => e.dispose());
mat.setMetallicFactor(0).setRoughnessFactor(0.85);

await doc.transform(prune(), dedup());
await io.write(output, doc);
console.log("wrote", output);
