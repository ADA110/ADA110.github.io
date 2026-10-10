// Prints node hierarchy, mesh/material names and world-space bounds of a glTF file.
import { NodeIO } from "@gltf-transform/core";
import { getBounds } from "@gltf-transform/functions";

const io = new NodeIO();
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const b = getBounds(scene);
  const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));
  console.log(`\n# ${file.split("/").pop()}  size(m)=${size}  min=${b.min.map((v) => +v.toFixed(3))}`);
  const walk = (n, d) => {
    const m = n.getMesh();
    const mats = m ? m.listPrimitives().map((p) => p.getMaterial()?.getName()).join(",") : "";
    const nb = getBounds(n);
    const c = nb.min.map((v, i) => +((v + nb.max[i]) / 2).toFixed(3));
    console.log(`${"  ".repeat(d)}${n.getName()}${m ? ` [mesh ${m.getName()} mats=${mats}] center=${c}` : ""}`);
    n.listChildren().forEach((ch) => walk(ch, d + 1));
  };
  scene.listChildren().forEach((n) => walk(n, 0));
  console.log("materials:", root.listMaterials().map((m) => m.getName()).join(" | "));
  console.log("skins:", root.listSkins().length, "animations:", root.listAnimations().length);
}
