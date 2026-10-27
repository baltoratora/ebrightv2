import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { BufferGeometry, BufferAttribute } from "three";
import { prepareLitGeometry } from "../components/aether/material-geometry";

it("prepares every bundled face, body and hair primitive for toon lighting", () => {
  const file = readFileSync(
    new URL("../public/aether/shino-base.glb", import.meta.url),
  );
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
  const binaryStart = 20 + jsonLength + 8;
  const attribute = (id: number) => {
    const a = doc.accessors[id],
      v = doc.bufferViews[a.bufferView];
    const size = a.type === "VEC3" ? 3 : 1;
    const constructors = {
      5126: Float32Array,
      5123: Uint16Array,
      5125: Uint32Array,
    };
    const C = constructors[a.componentType as keyof typeof constructors];
    const offset = binaryStart + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const raw = file.subarray(
      offset,
      offset + a.count * size * C.BYTES_PER_ELEMENT,
    );
    return new BufferAttribute(
      new C(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)),
      size,
    );
  };
  for (const mesh of doc.meshes)
    for (const p of mesh.primitives) {
      const g = new BufferGeometry();
      g.setAttribute("position", attribute(p.attributes.POSITION));
      g.setIndex(attribute(p.indices));
      prepareLitGeometry(g);
      const n = g.getAttribute("normal");
      expect(n.count).toBe(g.getAttribute("position").count);
      let litVertices = 0;
      for (let i = 0; i < n.count; i++) {
        const length = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
        expect(Number.isFinite(length)).toBe(true);
        if (length > 0.9) litVertices++;
      }
      expect(litVertices, mesh.name).toBeGreaterThan(n.count * 0.9);
      const normals = g.getAttribute("normal");
      prepareLitGeometry(g);
      expect(g.getAttribute("normal")).toBe(normals);
      g.dispose();
    }
});
