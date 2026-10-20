// Extinction shocks: a capacity reduction (gradual decline via eventModifiers)
// PLUS an explicit, one-time, logged disasterLoss, PLUS an ongoing fitness
// penalty mitigated by the named trait. Idempotent per shock id (spec §4.3, §7.1).

import type { DifficultyParams } from "../sim/difficulty";
import type { RegionId, SimState } from "../sim/state";

export function applyShock(s: SimState, shockId: string, params: DifficultyParams): SimState {
  if (s.schedule.firedShocks.includes(shockId)) return s;
  const spec = params.shocks[shockId];
  if (!spec) return s;

  const regions = { ...s.regions };
  const eventModifiers = { ...s.eventModifiers };

  // capacity reduction → gradual overcrowding decline (NOT an instant clamp)
  for (const id of spec.capacity.regions) eventModifiers[id] = spec.capacity.factor;

  // explicit one-time loss (separate + logged)
  for (const id of spec.loss.regions as RegionId[]) {
    regions[id] = { ...regions[id], P: regions[id].P * (1 - spec.loss.fraction) };
  }

  const activePenalties = [
    ...s.activePenalties,
    { regions: spec.penalty.regions, amount: spec.penalty.amount, mitigatedBy: spec.penalty.mitigatedBy },
  ];

  return {
    ...s,
    regions,
    eventModifiers,
    activePenalties,
    schedule: { ...s.schedule, firedShocks: [...s.schedule.firedShocks, shockId] },
    lastShockReport: { id: shockId, regions: spec.loss.regions as RegionId[], lostFraction: spec.loss.fraction },
  };
}
