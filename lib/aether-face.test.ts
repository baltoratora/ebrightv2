import { expect, it } from "vitest";
import * as T from "three";
import { faceMaterial } from "../components/aether/face-material";
import { DEFAULT_LOOK } from "./aether";
it("keeps painted skin independent of scene lighting", () => {
  const old = new T.MeshStandardMaterial();
  old.name = "F00_Face_00_SKIN";
  const material = faceMaterial(old, null, DEFAULT_LOOK)!;
  expect(material.isMeshBasicMaterial).toBe(true);
  expect(material.toneMapped).toBe(false);
  expect(material.color.r).toBeLessThan(1);
  old.dispose();
  material.dispose();
});
it("keeps iris and highlights from occluding each other", () => {
  const old = new T.MeshStandardMaterial({ alphaTest: 0.5 });
  old.name = "EyeIris_00_EYE";
  const iris = faceMaterial(old, null, DEFAULT_LOOK)!;
  old.name = "EyeHighlight_00_EYE";
  const highlight = faceMaterial(old, null, DEFAULT_LOOK)!;
  expect(iris.depthWrite).toBe(false);
  expect(iris.depthTest).toBe(true);
  expect(iris.side).toBe(T.FrontSide);
  expect(highlight.polygonOffsetUnits).toBeLessThan(iris.polygonOffsetUnits);
  expect(iris.alphaTest).toBe(0.5);
  old.dispose();
  iris.dispose();
  highlight.dispose();
});
