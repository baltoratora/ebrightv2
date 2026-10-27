import * as T from "three";
import type { Look } from "@/lib/aether";

/** Painted facial features use stable colour and ordered, depth-tested overlays. */
export function faceMaterial(
  old: T.MeshStandardMaterial,
  map: T.Texture | null,
  look: Look,
): T.MeshBasicMaterial | null {
  const name = old.name;
  if (!/FACE|EYE|SKIN/.test(name) || /HAIR/.test(name)) return null;
  const overlay =
    /EyeIris|EyeHighlight|EyeExtra|FaceEyeline|FaceEyelash|FaceBrow/.test(name);
  const color = old.color.clone();
  if (/SKIN/.test(name)) {
    const target = new T.Color(look.skin),
      base = new T.Color("#f2d1bc");
    color.setRGB(target.r / base.r, target.g / base.g, target.b / base.b);
  } else if (/EyeIris/.test(name)) color.set(look.trim);
  else if (/FaceBrow/.test(name)) color.set(look.hair);
  const result = new T.MeshBasicMaterial({
    name,
    map,
    color,
    side: T.FrontSide,
    transparent: old.transparent,
    opacity: old.opacity,
    alphaTest: old.alphaTest,
    depthWrite: !overlay && !old.transparent,
    depthTest: true,
    toneMapped: false,
  });
  if (overlay) {
    result.polygonOffset = true;
    result.polygonOffsetFactor = -1;
    result.polygonOffsetUnits = /EyeHighlight/.test(name)
      ? -4
      : /EyeIris/.test(name)
        ? -3
        : -2;
  }
  return result;
}
