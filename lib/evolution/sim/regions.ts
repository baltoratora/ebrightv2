// Per-period region graph + environment data (spec §2). Each habitat region
// carries per-period attributes; the graph (edges) opens as periods advance.
// Attribute values are chosen so the achievability invariant (spec §8.5) holds;
// the headless scenarios validate them.

import type { Period, RegionId } from "./state";
import { ALL_REGIONS, PERIODS } from "./state";

export type Temp = "cold" | "temperate" | "warm";
export type Oxygen = "oxic" | "dysoxic" | "anoxic";
export type Salinity = "marine" | "brackish" | "fresh";
export type EdgeGate = "open" | "soft" | "hard";

export interface PeriodState {
  available: boolean;
  capacityFactor: number;
  temp: Temp;
  oxygen: Oxygen;
  predation: number;   // 0..1
  salinity: Salinity;
  pelagic: boolean;    // open-water: rewards paired-fins
  exposure: number;    // 0..1 air-exposure risk (tidal flats)
}

export interface Region {
  id: RegionId;
  lockedV1: boolean;
  perPeriod: Record<Period, PeriodState>;
}

export interface RawEdge { a: RegionId; b: RegionId; gate: EdgeGate; requires?: string[]; }

function warmMarine(available: boolean, capacityFactor: number, over: Partial<PeriodState> = {}): PeriodState {
  return {
    available, capacityFactor, temp: "warm", oxygen: "oxic", predation: 0.1,
    salinity: "marine", pelagic: false, exposure: 0, ...over,
  };
}
const UNAVAIL: PeriodState = warmMarine(false, 0);

export const REGIONS: Record<RegionId, Region> = {
  nursery: {
    id: "nursery", lockedV1: false,
    perPeriod: {
      cambrian: warmMarine(true, 1.0),
      ordovician: warmMarine(true, 1.0),
      silurian: warmMarine(true, 1.0),
      devonian: warmMarine(true, 1.0),
    },
  },
  reef: {
    id: "reef", lockedV1: false,
    perPeriod: {
      cambrian: warmMarine(true, 0.6, { predation: 0.1 }),
      ordovician: warmMarine(true, 1.0, { predation: 0.5 }),
      silurian: warmMarine(true, 1.1, { predation: 0.5 }),
      devonian: warmMarine(true, 1.1, { predation: 0.5 }),
    },
  },
  openOcean: {
    id: "openOcean", lockedV1: false,
    perPeriod: {
      cambrian: warmMarine(true, 1.0, { pelagic: true }),
      ordovician: warmMarine(true, 1.0, { pelagic: true }),
      silurian: warmMarine(true, 1.0, { pelagic: true }),
      devonian: warmMarine(true, 1.0, { pelagic: true }),
    },
  },
  deepAnoxic: {
    id: "deepAnoxic", lockedV1: false,
    perPeriod: {
      cambrian: UNAVAIL,
      ordovician: warmMarine(true, 1.0, { oxygen: "anoxic", predation: 0 }),
      silurian: warmMarine(true, 1.0, { oxygen: "anoxic", predation: 0 }),
      devonian: warmMarine(true, 1.0, { oxygen: "anoxic", predation: 0 }),
    },
  },
  estuary: {
    id: "estuary", lockedV1: false,
    perPeriod: {
      cambrian: UNAVAIL,
      ordovician: UNAVAIL,
      silurian: warmMarine(true, 1.0, { salinity: "brackish", oxygen: "dysoxic", predation: 0.2 }),
      devonian: warmMarine(true, 1.0, { salinity: "brackish", oxygen: "dysoxic", predation: 0.2 }),
    },
  },
  river: {
    id: "river", lockedV1: false,
    perPeriod: {
      cambrian: UNAVAIL, ordovician: UNAVAIL, silurian: UNAVAIL,
      devonian: warmMarine(true, 1.0, { salinity: "fresh", predation: 0.1 }),
    },
  },
  tidalFlats: {
    id: "tidalFlats", lockedV1: false,
    perPeriod: {
      cambrian: UNAVAIL, ordovician: UNAVAIL, silurian: UNAVAIL,
      devonian: warmMarine(true, 1.0, { oxygen: "dysoxic", exposure: 0.6, predation: 0.1 }),
    },
  },
  land: {
    id: "land", lockedV1: true,
    perPeriod: { cambrian: UNAVAIL, ordovician: UNAVAIL, silurian: UNAVAIL, devonian: UNAVAIL },
  },
};

export const EDGES: Record<Period, RawEdge[]> = {
  cambrian: [
    { a: "nursery", b: "reef", gate: "open" },
    { a: "nursery", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
  ],
  ordovician: [
    { a: "nursery", b: "reef", gate: "open" },
    { a: "nursery", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
    { a: "reef", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
    { a: "openOcean", b: "deepAnoxic", gate: "hard", requires: ["hypoxia"] },
  ],
  silurian: [
    { a: "nursery", b: "reef", gate: "open" },
    { a: "nursery", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
    { a: "reef", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
    { a: "openOcean", b: "deepAnoxic", gate: "hard", requires: ["hypoxia"] },
    { a: "nursery", b: "estuary", gate: "soft", requires: ["osmoregulation"] },
  ],
  devonian: [
    { a: "nursery", b: "reef", gate: "open" },
    { a: "nursery", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
    { a: "reef", b: "openOcean", gate: "soft", requires: ["paired-fins"] },
    { a: "openOcean", b: "deepAnoxic", gate: "hard", requires: ["hypoxia"] },
    { a: "nursery", b: "estuary", gate: "soft", requires: ["osmoregulation"] },
    { a: "estuary", b: "river", gate: "hard", requires: ["osmoregulation"] },
    { a: "estuary", b: "tidalFlats", gate: "hard", requires: ["lobed-limbs", "airGulping"] },
  ],
};

export function regionState(id: RegionId, p: Period): PeriodState {
  return REGIONS[id].perPeriod[p];
}
export function availableRegions(p: Period): RegionId[] {
  return ALL_REGIONS.filter((id) => REGIONS[id].perPeriod[p].available);
}
export function edgesFor(p: Period): RawEdge[] {
  return EDGES[p];
}

// Effective gate given owned traits: soft/hard upgrade to "open" once the
// required traits are owned; otherwise soft stays throttled and hard stays shut.
export function effectiveGate(edge: RawEdge, traits: string[]): EdgeGate {
  if (edge.gate === "open") return "open";
  const hasAll = (edge.requires ?? []).every((t) => traits.includes(t));
  if (hasAll) return "open";
  return edge.gate; // "soft" (0.2) or "hard" (0)
}

// Directed edges (both directions) with effective gate, for migration.
export function directedEdges(p: Period, traits: string[]): { from: RegionId; to: RegionId; gate: EdgeGate }[] {
  const out: { from: RegionId; to: RegionId; gate: EdgeGate }[] = [];
  for (const e of EDGES[p]) {
    const g = effectiveGate(e, traits);
    out.push({ from: e.a, to: e.b, gate: g });
    out.push({ from: e.b, to: e.a, gate: g });
  }
  return out;
}

export const REGION_IDS = ALL_REGIONS;
export { PERIODS };
