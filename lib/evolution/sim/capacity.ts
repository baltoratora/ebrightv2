// Carrying capacity: K_base × per-period capacityFactor × event modifier.
// K_base is the stable reference used by occupancy (spec §4.2, §4.4).

import type { DifficultyParams } from "./difficulty";
import type { Period, RegionId } from "./state";
import { regionState } from "./regions";

export function capacityK(id: RegionId, period: Period, eventFactor: number, params: DifficultyParams): number {
  const r = regionState(id, period);
  if (!r.available) return 0;
  return params.kBase[id] * r.capacityFactor * eventFactor;
}
