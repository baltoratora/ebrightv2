// Parametric per-form body geometry. Each lineage form has its own silhouette
// (length, depth, head shape, tail shape) while keeping the shared modular
// attachment system — attachment points are derived from the body so every part
// stays correctly placed as the body changes.

import type { FormId } from "./lineage";
import type { AttachmentId } from "./parts";

export type HeadShape = "round" | "tapered" | "blunt" | "flat";
export type TailStyle = "round" | "fan" | "fork" | "lobe";

export interface BodyConfig {
  id: FormId;
  snoutX: number; // front tip x (faces left)
  tailBaseX: number; // where body meets the caudal fin
  midX: number; // widest point x
  centerY: number;
  depth: number; // half-height at the widest point
  headDepth: number; // half-height through the head
  headShape: HeadShape;
  tailStyle: TailStyle;
}

const SNOUT_BLUNT: Record<HeadShape, number> = {
  tapered: 0.0,
  round: 0.2,
  blunt: 0.5,
  flat: 0.72,
};

// Four distinct silhouettes.
export const BODIES: Record<FormId, BodyConfig> = {
  // slim, soft, rounded — a small early swimmer
  cambrian: { id: "cambrian", snoutX: 54, tailBaseX: 194, midX: 122, centerY: 80, depth: 19, headDepth: 12, headShape: "round", tailStyle: "round" },
  // deep, front-heavy, blunt head — built to carry armour
  ordovician: { id: "ordovician", snoutX: 46, tailBaseX: 198, midX: 106, centerY: 80, depth: 30, headDepth: 23, headShape: "blunt", tailStyle: "fan" },
  // streamlined, tapered snout, forked tail — an active hunter
  silurian: { id: "silurian", snoutX: 42, tailBaseX: 200, midX: 132, centerY: 80, depth: 21, headDepth: 14, headShape: "tapered", tailStyle: "fork" },
  // broad, flat-headed, deep body, paddle tail — a shallow-water lurker
  devonian: { id: "devonian", snoutX: 40, tailBaseX: 192, midX: 114, centerY: 82, depth: 31, headDepth: 25, headShape: "flat", tailStyle: "lobe" },
};

const n = (v: number) => +v.toFixed(2);

/** Vertical half-extent of the blunt snout tip (0 = sharp point). */
export function headTip(b: BodyConfig): number {
  return b.headDepth * (0.15 + 0.7 * SNOUT_BLUNT[b.headShape]);
}

/** Main body outline path for a form. */
export function bodyPath(b: BodyConfig): string {
  const { snoutX, tailBaseX, midX, centerY, depth, headDepth } = b;
  const tip = headDepth * (0.15 + 0.7 * SNOUT_BLUNT[b.headShape]);
  const headRun = midX - snoutX;
  const tailRun = tailBaseX - midX;
  const T = (y: number) => n(centerY - y);
  const B = (y: number) => n(centerY + y);
  return [
    `M ${n(snoutX)} ${T(tip)}`,
    `C ${n(snoutX + headRun * 0.5)} ${T(headDepth)} ${n(midX - headRun * 0.5)} ${T(depth)} ${n(midX)} ${T(depth)}`,
    `C ${n(midX + tailRun * 0.45)} ${T(depth * 0.85)} ${n(tailBaseX - 8)} ${T(depth * 0.34)} ${n(tailBaseX)} ${T(depth * 0.22)}`,
    `L ${n(tailBaseX)} ${B(depth * 0.22)}`,
    `C ${n(tailBaseX - 8)} ${B(depth * 0.34)} ${n(midX + tailRun * 0.45)} ${B(depth * 0.85)} ${n(midX)} ${B(depth)}`,
    `C ${n(midX - headRun * 0.5)} ${B(depth)} ${n(snoutX + headRun * 0.5)} ${B(headDepth)} ${n(snoutX)} ${B(tip)}`,
    `C ${n(snoutX - 5)} ${B(tip * 0.4)} ${n(snoutX - 5)} ${T(tip * 0.4)} ${n(snoutX)} ${T(tip)} Z`,
  ].join(" ");
}

/** Caudal fin path (begins at the tail base, extends right). */
export function tailPath(b: BodyConfig): string {
  const { tailBaseX: x, centerY: c, depth: d } = b;
  const top = n(c - d * 0.22);
  const bot = n(c + d * 0.22);
  switch (b.tailStyle) {
    case "round":
      return `M ${n(x)} ${top} C ${n(x + 24)} ${n(c - d * 0.5)} ${n(x + 34)} ${n(c - d * 0.3)} ${n(x + 36)} ${n(c)} C ${n(x + 34)} ${n(c + d * 0.3)} ${n(x + 24)} ${n(c + d * 0.5)} ${n(x)} ${bot} Z`;
    case "fan":
      return `M ${n(x)} ${top} C ${n(x + 26)} ${n(c - d * 0.8)} ${n(x + 44)} ${n(c - d * 0.55)} ${n(x + 46)} ${n(c)} C ${n(x + 44)} ${n(c + d * 0.55)} ${n(x + 26)} ${n(c + d * 0.8)} ${n(x)} ${bot} Z`;
    case "fork":
      return `M ${n(x)} ${top} C ${n(x + 20)} ${n(c - d * 0.5)} ${n(x + 34)} ${n(c - d * 0.85)} ${n(x + 44)} ${n(c - d * 0.9)} C ${n(x + 34)} ${n(c - d * 0.3)} ${n(x + 30)} ${n(c)} ${n(x + 44)} ${n(c + d * 0.9)} C ${n(x + 34)} ${n(c + d * 0.85)} ${n(x + 20)} ${n(c + d * 0.5)} ${n(x)} ${bot} Z`;
    case "lobe":
      return `M ${n(x)} ${top} C ${n(x + 30)} ${n(c - d * 0.7)} ${n(x + 46)} ${n(c - d * 0.25)} ${n(x + 42)} ${n(c + d * 0.1)} C ${n(x + 38)} ${n(c + d * 0.5)} ${n(x + 18)} ${n(c + d * 0.45)} ${n(x)} ${bot} Z`;
  }
}

export type Anchors = Record<AttachmentId, { x: number; y: number }>;

/** Attachment points derived from the body so parts track silhouette changes. */
export function anchorsFor(b: BodyConfig): Anchors {
  const headRun = b.midX - b.snoutX;
  const tailRun = b.tailBaseX - b.midX;
  return {
    mouth: { x: n(b.snoutX + 2), y: n(b.centerY + b.headDepth * 0.1) },
    eyes: { x: n(b.snoutX + headRun * 0.3), y: n(b.centerY - b.headDepth * 0.42) },
    dorsal: { x: n(b.midX), y: n(b.centerY - b.depth + 2) },
    flank: { x: n(b.midX - headRun * 0.15), y: n(b.centerY + b.depth * 0.58) },
    underside: { x: n(b.midX + tailRun * 0.3), y: n(b.centerY + b.depth * 0.82) },
    tail: { x: n(b.tailBaseX), y: n(b.centerY) },
  };
}
