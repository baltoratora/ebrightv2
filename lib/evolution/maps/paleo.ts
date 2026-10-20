// Four original, simplified paleogeographic map datasets (spec §2, §1.5 E).
// Data only — the UI plan renders these. Coordinates are in a 0..100 square.
// Labelled illustrative; NOT a copied reconstruction.

import type { Period, RegionId } from "../sim/state";
import { availableRegions } from "../sim/regions";

export interface Continent { id: string; label: string; cx: number; cy: number; rx: number; ry: number; }
export interface Placement { region: RegionId; cx: number; cy: number; }
export interface PaleoMap { label: string; continents: Continent[]; placements: Placement[]; }

export const PALEO_MAPS: Record<Period, PaleoMap> = {
  cambrian: {
    label: "Cambrian — illustrative, original, not a reconstruction",
    continents: [
      { id: "gondwana", label: "Gondwana", cx: 40, cy: 74, rx: 34, ry: 20 },
      { id: "laurentia", label: "Laurentia", cx: 62, cy: 40, rx: 14, ry: 10 },
      { id: "baltica", label: "Baltica", cx: 30, cy: 46, rx: 9, ry: 7 },
      { id: "siberia", label: "Siberia", cx: 78, cy: 24, rx: 10, ry: 8 },
    ],
    placements: [
      { region: "nursery", cx: 46, cy: 60 },
      { region: "reef", cx: 62, cy: 46 },
      { region: "openOcean", cx: 18, cy: 28 },
    ],
  },
  ordovician: {
    label: "Ordovician — illustrative, original, not a reconstruction",
    continents: [
      { id: "gondwana", label: "Gondwana (South Pole, Hirnantian ice)", cx: 42, cy: 82, rx: 36, ry: 18 },
      { id: "laurentia", label: "Laurentia", cx: 60, cy: 40, rx: 14, ry: 10 },
      { id: "baltica", label: "Baltica", cx: 34, cy: 44, rx: 10, ry: 8 },
      { id: "avalonia", label: "Avalonia", cx: 48, cy: 56, rx: 6, ry: 4 },
    ],
    placements: [
      { region: "nursery", cx: 46, cy: 60 },
      { region: "reef", cx: 60, cy: 46 },
      { region: "openOcean", cx: 18, cy: 30 },
      { region: "deepAnoxic", cx: 20, cy: 62 },
    ],
  },
  silurian: {
    label: "Silurian — illustrative, original, not a reconstruction",
    continents: [
      { id: "laurussia", label: "Laurussia (Caledonian)", cx: 54, cy: 42, rx: 20, ry: 12 },
      { id: "gondwana", label: "Gondwana", cx: 42, cy: 82, rx: 36, ry: 18 },
      { id: "siberia", label: "Siberia", cx: 80, cy: 26, rx: 10, ry: 8 },
    ],
    placements: [
      { region: "nursery", cx: 48, cy: 58 },
      { region: "reef", cx: 62, cy: 46 },
      { region: "openOcean", cx: 20, cy: 30 },
      { region: "deepAnoxic", cx: 22, cy: 64 },
      { region: "estuary", cx: 54, cy: 52 },
    ],
  },
  devonian: {
    label: "Devonian — illustrative, original, not a reconstruction",
    continents: [
      { id: "euramerica", label: "Euramerica (Old Red Sandstone)", cx: 52, cy: 46, rx: 24, ry: 14 },
      { id: "gondwana", label: "Gondwana", cx: 46, cy: 84, rx: 36, ry: 16 },
      { id: "siberia", label: "Siberia", cx: 82, cy: 26, rx: 10, ry: 8 },
    ],
    placements: [
      { region: "nursery", cx: 46, cy: 58 },
      { region: "reef", cx: 64, cy: 48 },
      { region: "openOcean", cx: 18, cy: 30 },
      { region: "deepAnoxic", cx: 22, cy: 66 },
      { region: "estuary", cx: 52, cy: 52 },
      { region: "river", cx: 50, cy: 44 },
      { region: "tidalFlats", cx: 56, cy: 56 },
    ],
  },
};

// Invariant helper used by tests: every available region has a placement.
export function placementsCoverAvailable(p: Period): boolean {
  const placed = new Set(PALEO_MAPS[p].placements.map((x) => x.region));
  return availableRegions(p).every((r) => placed.has(r));
}
