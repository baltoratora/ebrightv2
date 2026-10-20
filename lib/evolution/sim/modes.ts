// Mode logic: objectives, extinction/boundary checks, period transitions, and
// the achievability invariant (spec §8).

import type { DifficultyParams } from "./difficulty";
import type { Period, RegionId, SimState } from "./state";
import { ALL_REGIONS, PLAYABLE_REGIONS, nextPeriod, occupiedCount, totalPop } from "./state";
import { availableRegions } from "./regions";
import { fitness } from "./fitness";
import { GAMEPLAY_TRAITS } from "./traits";

export function isExtinct(s: SimState, params: DifficultyParams): boolean {
  return totalPop(s) < params.extinctionFloorGlobal;
}

export function targetFor(period: Period, params: DifficultyParams): number {
  return params.dominateTargets[period];
}

export function dominateMet(s: SimState, params: DifficultyParams): boolean {
  return occupiedCount(s) >= targetFor(s.clock.period, params);
}

// Advance to the next period: reset elapsed, clear transient cold/anoxia
// penalties and event capacity modifiers (surface recovery), keep traits/pop/EP.
export function applyTransition(s: SimState): SimState {
  const np = nextPeriod(s.clock.period);
  if (!np) return s;
  const eventModifiers = { ...s.eventModifiers };
  for (const id of ALL_REGIONS) eventModifiers[id] = 1;
  return {
    ...s,
    clock: { period: np, elapsedInPeriod: 0, totalElapsed: s.clock.totalElapsed },
    eventModifiers,
    activePenalties: [],
    objectives: { ...s.objectives, recoveryDeadline: null },
  };
}

const PERIOD_ORDER: Period[] = ["cambrian", "ordovician", "silurian", "devonian"];

// Best achievable fitness for a region in an era using only era-unlockable
// traits and the better of the two niches, with no active shock penalties.
function bestFitness(id: RegionId, era: Period): number {
  const unlock = Object.values(GAMEPLAY_TRAITS)
    .filter((t) => PERIOD_ORDER.indexOf(t.unlock) <= PERIOD_ORDER.indexOf(era))
    .map((t) => t.id);
  const traits = unlock.filter((t) => t !== "repK"); // repR vs repK don't affect fitness
  const fFilter = fitness(id, { period: era, traits, niche: "filterFeeding" });
  const fBenthic = fitness(id, { period: era, traits, niche: "benthicGrazing" });
  return Math.max(fFilter, fBenthic);
}

// Structural check: every era's Dominate target is satisfiable using regions
// available that era and traits unlockable by that era (Devonian excludes the
// collapsing reef). Spec §8.5.
export function achievabilityOk(params: DifficultyParams): boolean {
  for (const era of PERIOD_ORDER) {
    let occupiable = 0;
    for (const id of availableRegions(era)) {
      if (!PLAYABLE_REGIONS.includes(id)) continue;
      if (era === "devonian" && id === "reef") continue; // collapses in the pulses
      if (bestFitness(id, era) >= 0.5) occupiable++;
    }
    if (occupiable < params.dominateTargets[era]) return false;
  }
  return true;
}

export { occupiedCount };
