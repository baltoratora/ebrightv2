// EP economy: per-second income (sub-linear in population → no runaway) with a
// diversity term and a catch-up floor, separate from one-off grants which are
// NOT multiplied by dt (spec §5).

import type { DifficultyParams } from "./difficulty";

export function incomeRate(a: { totalPop: number; occupied: number }, params: DifficultyParams): number {
  const base = params.kPop * Math.sqrt(Math.max(0, a.totalPop)) + params.kDiv * a.occupied;
  const catchUp = a.occupied <= 1 ? params.catchUpFloor : 0;
  return base + catchUp;
}

export function applyIncome(ep: number, rate: number, dt: number): number {
  return ep + rate * dt;
}

// One-off grant, idempotent per id (claimed ids recorded on state.schedule).
export function grantOnce(
  s: { ep: number; claimed: string[] },
  id: string,
  amount: number,
): { ep: number; claimed: string[] } {
  if (s.claimed.includes(id)) return s;
  return { ep: s.ep + amount, claimed: [...s.claimed, id] };
}
