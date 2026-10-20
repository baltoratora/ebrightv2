// Per-period event schedule. Times are relative to the start of the period
// (seconds, sim time). Each shock has a warning strictly before it. Only the
// two Big Five boundaries carry extinction shocks; ordinary boundaries do not
// (spec §7.1).

import type { Period } from "../sim/state";

export interface ScheduledEvent {
  id: string;
  warnAt: number;
  shockAt?: number; // present only for shock events
  context: string;
}

const SCHEDULE: Record<Period, ScheduledEvent[]> = {
  cambrian: [],
  ordovician: [
    { id: "hirnantian", warnAt: 420, shockAt: 450, context: "Hirnantian glaciation: cold + sea-level fall. Thermal tolerance, depth refuge, and spread breadth help." },
  ],
  silurian: [],
  devonian: [
    { id: "kellwasser", warnAt: 240, shockAt: 270, context: "Kellwasser anoxic pulse. Hypoxia tolerance and spreading off the reef help." },
    { id: "hangenberg", warnAt: 480, shockAt: 510, context: "Hangenberg pulse: the reef collapses. Hypoxia tolerance, air-gulping, and breadth help." },
  ],
};

export function scheduleFor(p: Period): ScheduledEvent[] {
  return SCHEDULE[p];
}
