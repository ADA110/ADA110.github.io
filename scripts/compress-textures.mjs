// Converts downloaded Poly Haven texture sets (diff/nor/rough .jpg) into resized WebP files under public/textures.
// Usage: node scripts/compress-textures.mjs <raw textures dir>
import { readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const src = process.argv[2];
const big = new Set(["walnut_veneer", "wood_floor"]); // seen up close / over large areas
for (const name of readdirSync(src)) {
  const out = join("public/textures", name);
  mkdirSync(out, { recursive: true });
  const size = big.has(name) ? 2048 : 1024;
  for (const map of ["diff", "nor", "rough"]) {
    await sharp(join(src, name, `${map}.jpg`))
      .resize(size, size, { fit: "inside" })
      .webp({ quality: map === "nor" ? 90 : 80 })
      .toFile(join(out, `${map}.webp`));
  }
  console.log(name, size);
}
