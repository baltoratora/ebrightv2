// Era data for the Evolve art system — four consecutive periods, no skip.
//
// Timescale source: ICS International Chronostratigraphic Chart v2024/12
//   https://stratigraphy.org/ICSchart/ChronostratChart2024-12.pdf
// Boundary ages (Ma): Cambrian base 538.8; Cambrian/Ordovician 486.85;
//   Ordovician/Silurian 443.1; Silurian/Devonian 419.62; Devonian top 358.86.
//
// Transitions distinguish ordinary environmental change from the two Big Five
// mass extinctions that bracket this window. No extinction events are invented.

import type { EraId } from "../palette";

export type TransitionType = "ordinary" | "mass-extinction";

export interface EraTransition {
  type: TransitionType;
  label: string;
  /** Verified basis, shown as an in-UI science note. */
  note: string;
}

export interface Era {
  id: EraId;
  name: string;
  /** Start (older) boundary, Ma. */
  baseMa: number;
  /** End (younger) boundary, Ma. */
  topMa: number;
  tagline: string;
  /** Default lineage form id shown for this era (see lineage.ts). */
  defaultForm: EraId;
  /** The transition OUT of this era (into the next, or chapter end for Devonian). */
  transitionOut: EraTransition;
  /** Short honesty/fact note for the HUD. */
  scienceNote: string;
}

export const ERAS: Era[] = [
  {
    id: "cambrian",
    name: "Cambrian",
    baseMa: 538.8,
    topMa: 486.85,
    tagline: "Life fills the seas",
    defaultForm: "cambrian",
    transitionOut: {
      type: "ordinary",
      label: "Ordinary transition",
      note: "Sea-level and climate change into the Ordovician — no mass extinction.",
    },
    scienceNote: "Marine life only. Our swimmer is a fictional early chordate-grade form.",
  },
  {
    id: "ordovician",
    name: "Ordovician",
    baseMa: 486.85,
    topMa: 443.1,
    tagline: "A great diversification",
    defaultForm: "ordovician",
    transitionOut: {
      type: "mass-extinction",
      label: "Mass extinction (Big Five)",
      note: "Late Ordovician mass extinction (~445–443 Ma): Hirnantian glaciation and sea-level fall; ~85% of marine species lost.",
    },
    scienceNote: "Armoured jawless fish (e.g. Arandaspis) had head/body armour but no paired fins.",
  },
  {
    id: "silurian",
    name: "Silurian",
    baseMa: 443.1,
    topMa: 419.62,
    tagline: "Jaws, fins, and the first land plants",
    defaultForm: "silurian",
    transitionOut: {
      type: "ordinary",
      label: "Ordinary transition",
      note: "Environmental change into the Devonian — no mass extinction.",
    },
    scienceNote: "First jawed fish and paired fins (~439–436 Ma); first vascular land plants (Cooksonia).",
  },
  {
    id: "devonian",
    name: "Devonian",
    baseMa: 419.62,
    topMa: 358.86,
    tagline: "The Age of Fishes",
    defaultForm: "devonian",
    transitionOut: {
      type: "mass-extinction",
      label: "Mass extinction (Big Five), in pulses",
      note: "Late Devonian extinction as pulses: Kellwasser (~372 Ma) and Hangenberg (~359 Ma).",
    },
    scienceNote: "First forests ~385 Ma. Lobe-finned — one possible branch, not a tetrapod.",
  },
];

export function getEra(id: EraId): Era {
  const era = ERAS.find((e) => e.id === id);
  if (!era) throw new Error(`Unknown era: ${id}`);
  return era;
}

/** Duration of the era in millions of years (geological, not game pacing). */
export function eraDurationMa(era: Era): number {
  return +(era.baseMa - era.topMa).toFixed(2);
}

// --- Region-map study (illustrative only) ---------------------------------
// Original, simplified geography — NOT a copied paleogeographic reconstruction.
// Neutral region names avoid implying an exact real-world layout. Rendered as
// rounded territories over an open ocean; land/shelf regions are selectable.

export type RegionType = "land" | "shelf" | "ocean";

export interface MapRegion {
  id: string;
  label: string;
  type: RegionType;
  /** Ellipse centre + radii in a 0..100 square map coordinate space. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  selectable: boolean;
}

export const REGION_MAP: { note: string; regions: MapRegion[] } = {
  note: "Approximate — illustrative, not a paleogeographic reconstruction.",
  regions: [
    { id: "open-ocean", label: "Open Ocean", type: "ocean", cx: 50, cy: 50, rx: 52, ry: 52, selectable: false },
    { id: "southern-land", label: "Southern Landmass", type: "land", cx: 44, cy: 70, rx: 30, ry: 18, selectable: true },
    { id: "warm-shelf", label: "Warm Shallow Shelf", type: "shelf", cx: 62, cy: 52, rx: 16, ry: 11, selectable: true },
    { id: "northern-shelf", label: "Northern Shelf", type: "shelf", cx: 30, cy: 33, rx: 15, ry: 10, selectable: true },
    { id: "eastern-isles", label: "Eastern Isles", type: "land", cx: 74, cy: 30, rx: 10, ry: 7, selectable: true },
  ],
};
