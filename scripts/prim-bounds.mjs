// Per-primitive bounds (by material) for a glTF, to locate parts like a lamp bulb or picture artwork.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  console.log(`\n# ${file.split("/").pop()}`);
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const t = node.getTranslation().map((v) => +v.toFixed(3));
    const r = node.getRotation().map((v) => +v.toFixed(3));
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      const min = pos.getMinNormalized([]), max = pos.getMaxNormalized([]);
      console.log(`${node.getName()} t=${t} r=${r} | ${p.getMaterial()?.getName()} min=${min.map((v) => +v.toFixed(3))} max=${max.map((v) => +v.toFixed(3))}`);
    }
  }
}
