import type { BufferGeometry } from "three";

/** Unlit glTF exports may omit normals; lit materials require them. */
export function prepareLitGeometry(geometry: BufferGeometry): void {
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
}
