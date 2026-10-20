// Population dynamics: explicit births − deaths (signed net). Poor fit declines
// even when P<K; overcrowding after a capacity cut decays over time (no clamp to
// K); disaster losses are applied separately by the event system (spec §4.3).

import type { DifficultyParams } from "./difficulty";
import type { OccState } from "./state";

export interface StepResult { births: number; deaths: number; dP: number; Pnext: number; }

export function stepPopulation(a: { P: number; f: number; K: number; dt: number; params: DifficultyParams }): StepResult {
  const { P, f, K, dt, params } = a;
  if (P <= 0) return { births: 0, deaths: 0, dP: 0, Pnext: 0 };

  const headroom = K > 0 ? Math.max(0, 1 - P / K) : 0;
  const births = params.rMax * f * P * headroom; // ≥0; 0 when P≥K or K≤0

  const over = K > 0 ? Math.max(0, P / K - 1) : P > 0 ? 1 : 0;
  const perCapitaDeath = params.mBase + (1 - f) * params.mStress + params.mCrowd * over;
  let deaths = perCapitaDeath * P;
  // stability: cannot kill more than exists this step
  if (deaths * dt > P) deaths = P / dt;

  const dP = births - deaths;
  let Pnext = P + dP * dt; // lower clamp only — NO clamp down to K
  if (Pnext < 0) Pnext = 0;
  if (Pnext < params.extinctionFloorRegion) Pnext = 0;
  return { births, deaths, dP, Pnext };
}

// Occupancy with hysteresis, referenced to K_base (not current K) so a disaster
// that cuts current capacity never makes a region easier to "occupy".
export function updateOccupancy(
  prev: OccState,
  P: number,
  kBase: number,
  available: boolean,
  params: DifficultyParams,
): OccState {
  if (!available || P <= 0) return "inaccessible";
  const high = params.establishHighFrac * kBase;
  const low = params.establishLowFrac * kBase;
  if (prev === "occupied") return P < low ? "colonizing" : "occupied";
  return P >= high ? "occupied" : "colonizing";
}
