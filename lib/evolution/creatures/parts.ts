// Creature part metadata (pure data — no JSX). The actual SVG path for each
// part lives in components/evolution/parts/*, keyed by PartId. Keeping geometry
// metadata here lets the render order + attachment logic be unit-tested.

export const VIEWBOX = { w: 260, h: 160 } as const;

export type AttachmentId = "mouth" | "eyes" | "dorsal" | "flank" | "underside" | "tail";

export interface AttachmentPoint {
  id: AttachmentId;
  x: number;
  y: number;
}

// Absolute positions within the viewBox. Lineage faces left: head at low x,
// tail at high x. (Normalized source positions are in the design spec.)
export const ATTACHMENTS: Record<AttachmentId, AttachmentPoint> = {
  mouth: { id: "mouth", x: 36, y: 83 },
  eyes: { id: "eyes", x: 57, y: 67 },
  dorsal: { id: "dorsal", x: 120, y: 35 },
  flank: { id: "flank", x: 120, y: 106 },
  underside: { id: "underside", x: 130, y: 138 },
  tail: { id: "tail", x: 224, y: 80 },
};

export type PartId =
  | "body"
  | "eye"
  | "tail"
  | "mouth-simple"
  | "jaws"
  | "armor"
  | "fin-pectoral"
  | "fin-pelvic"
  | "limb-fore"
  | "limb-hind";

export type PaletteRole = "bodyMain" | "bodyArmor" | "bodyFin" | "bodyEye" | "bodyAccent";

export interface PartMeta {
  id: PartId;
  attachment: AttachmentId;
  /** z-order, back (low) to front (high). */
  layer: number;
  paletteRole: PaletteRole;
}

export const PARTS: Record<PartId, PartMeta> = {
  tail: { id: "tail", attachment: "tail", layer: 20, paletteRole: "bodyFin" },
  "fin-pelvic": { id: "fin-pelvic", attachment: "flank", layer: 25, paletteRole: "bodyFin" },
  body: { id: "body", attachment: "underside", layer: 30, paletteRole: "bodyMain" },
  armor: { id: "armor", attachment: "dorsal", layer: 40, paletteRole: "bodyArmor" },
  "limb-hind": { id: "limb-hind", attachment: "underside", layer: 48, paletteRole: "bodyFin" },
  "fin-pectoral": { id: "fin-pectoral", attachment: "flank", layer: 50, paletteRole: "bodyFin" },
  "limb-fore": { id: "limb-fore", attachment: "flank", layer: 50, paletteRole: "bodyFin" },
  "mouth-simple": { id: "mouth-simple", attachment: "mouth", layer: 60, paletteRole: "bodyAccent" },
  jaws: { id: "jaws", attachment: "mouth", layer: 60, paletteRole: "bodyAccent" },
  eye: { id: "eye", attachment: "eyes", layer: 70, paletteRole: "bodyEye" },
};
