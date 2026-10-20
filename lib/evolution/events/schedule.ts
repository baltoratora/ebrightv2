// Per-period event schedule. Times are relative to the start of the period
// (seconds, sim time). Every event has a warning strictly before its effect.
// Ordinary events (Cambrian/Silurian + others) apply a mild, recoverable
// capacity nudge; only the two Big Five boundaries carry extinction shocks
// (spec §7.1).

import type { Period, RegionId } from "../sim/state";

export interface ScheduledEvent {
  id: string;
  kind: "ordinary" | "extinction";
  warnAt: number;
  shockAt: number;
  context: string;
  // ordinary events only: multiply the given regions' capacity (1.0 = no change)
  effect?: { regions: RegionId[]; factor: number };
}

const SCHEDULE: Record<Period, ScheduledEvent[]> = {
  cambrian: [
    {
      id: "cambrian-oxygenation",
      kind: "ordinary",
      warnAt: 120,
      shockAt: 150,
      context: "Ordinary change: a pulse of ocean oxygenation lifts shallow-reef carrying capacity.",
      effect: { regions: ["reef"], factor: 1.15 },
    },
  ],
  ordovician: [
    {
      id: "hirnantian",
      kind: "extinction",
      warnAt: 420,
      shockAt: 450,
      context: "Hirnantian glaciation: cold + sea-level fall. Thermal tolerance, depth refuge, and spread breadth help.",
    },
  ],
  silurian: [
    {
      id: "silurian-sealevel",
      kind: "ordinary",
      warnAt: 150,
      shockAt: 180,
      context: "Ordinary change: sea level recovers and reefs expand — shallow carrying capacity rises.",
      effect: { regions: ["nursery", "reef"], factor: 1.15 },
    },
  ],
  devonian: [
    {
      id: "kellwasser",
      kind: "extinction",
      warnAt: 240,
      shockAt: 270,
      context: "Kellwasser anoxic pulse. Hypoxia tolerance and spreading off the reef (or to fresh water) help.",
    },
    {
      id: "hangenberg",
      kind: "extinction",
      warnAt: 480,
      shockAt: 510,
      context: "Hangenberg pulse: the reef collapses. Hypoxia tolerance, a freshwater refuge, and breadth help.",
    },
  ],
};

export function scheduleFor(p: Period): ScheduledEvent[] {
  return SCHEDULE[p];
}
