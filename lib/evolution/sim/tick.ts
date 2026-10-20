// Fixed-step orchestrator. Advances exactly one SIM_DT. Does NOT advance while
// paused, awaiting a decision, or after a terminal outcome (spec §7.2, correction 2).
// Pipeline order: clock → warnings(pause) → mutations(pause) → shocks →
// growth → migration → occupancy → economy → extinction → boundary.

import type { DifficultyParams } from "./difficulty";
import type { PendingDecision, Period, RegionId, SimState } from "./state";
import { ALL_REGIONS, nextPeriod, occupiedCount, totalPop } from "./state";
import type { Rng } from "./rng";
import { fitness } from "./fitness";
import { capacityK } from "./capacity";
import { stepPopulation, updateOccupancy } from "./population";
import { migrate } from "./spread";
import { incomeRate, applyIncome, grantOnce } from "./economy";
import { directedEdges, regionState } from "./regions";
import { scheduleFor } from "../events/schedule";
import { applyShock } from "../events/extinctions";
import { GAMEPLAY_TRAITS, exclusiveGroups, isUnlocked } from "./traits";
import { dominateMet } from "./modes";

function pause(s: SimState, pd: PendingDecision): SimState {
  return { ...s, paused: true, pendingDecision: pd };
}

function rollMutationOptions(s: SimState, rng: Rng): string[] {
  const owned = new Set(s.traits);
  const conflicts = (t: string) =>
    exclusiveGroups.some((g) => g.includes(t) && g.some((x) => x !== t && owned.has(x)));
  const pool = Object.keys(GAMEPLAY_TRAITS).filter(
    (t) => isUnlocked(t, s.clock.period) && !owned.has(t) && !conflicts(t),
  );
  // deterministic shuffle via rng
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextFloat() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

type Cause = "survived" | "dominated" | "extinction" | "missedTarget";
function finalize(s: SimState, status: "won" | "lost", cause: Cause): SimState {
  return {
    ...s,
    status,
    paused: true,
    pendingDecision: null,
    outcome: {
      status,
      cause,
      finalPeriod: s.clock.period,
      missedTargets: s.objectives.missedTargets,
      usedRecoveryWindow: s.objectives.recoveryUsed,
      recoveryResolved: s.objectives.recoveryDeadline !== null || s.objectives.recoveryUsed,
    },
  };
}

export function tick(state: SimState, rng: Rng, params: DifficultyParams): SimState {
  if (state.status !== "running") return state;
  if (state.paused || state.pendingDecision) return state;

  const period = state.clock.period;
  const elapsed = state.clock.elapsedInPeriod + params.SIM_DT;
  const total = state.clock.totalElapsed + params.SIM_DT;
  let s: SimState = {
    ...state,
    clock: { period, elapsedInPeriod: elapsed, totalElapsed: total },
    regions: { ...state.regions },
    schedule: { ...state.schedule },
    rngCursor: state.rngCursor,
  };

  // 2. due warnings → pause (process the rest on later ticks)
  for (const ev of scheduleFor(period)) {
    if (ev.shockAt !== undefined && elapsed >= ev.warnAt && !s.schedule.firedWarnings.includes(ev.id)) {
      s = { ...s, schedule: { ...s.schedule, firedWarnings: [...s.schedule.firedWarnings, ev.id] } };
      return pause(s, { kind: "extinctionBriefing", id: `warn:${ev.id}`, options: [], context: ev.context, requiresResume: true });
    }
  }

  // 3. due mutation → pause
  if (total >= s.schedule.nextMutationAt) {
    const options = rollMutationOptions(s, rng);
    s = {
      ...s,
      rngCursor: rng.cursor,
      schedule: { ...s.schedule, nextMutationAt: s.schedule.nextMutationAt + params.mutationIntervalSec },
    };
    if (options.length > 0) {
      return pause(s, { kind: "mutation", id: `mutation:${Math.round(total)}`, options, context: "A mutation appeared — choose one adaptation, or decline.", requiresResume: true });
    }
    // no options to offer; continue this tick
  }

  // 4. due shocks (warning already fired)
  for (const ev of scheduleFor(period)) {
    if (ev.shockAt !== undefined && elapsed >= ev.shockAt && !s.schedule.firedShocks.includes(ev.id)) {
      s = applyShock(s, ev.id, params);
      if (totalPop(s) > 0) {
        const g = grantOnce({ ep: s.ep, claimed: s.schedule.claimedGrants }, `survive:${ev.id}`, params.eventSurvivalGrant);
        s = { ...s, ep: g.ep, schedule: { ...s.schedule, claimedGrants: g.claimed } };
      }
    }
  }

  // 5. growth / mortality
  const regions = { ...s.regions };
  const K: Record<string, number> = {};
  for (const id of ALL_REGIONS) {
    const rs = regionState(id, period);
    const k = capacityK(id, period, s.eventModifiers[id], params);
    K[id] = k;
    const f = fitness(id, { period, traits: s.traits, niche: s.niche, penalties: s.activePenalties });
    const r = stepPopulation({ P: regions[id].P, f, K: k, dt: params.SIM_DT, params });
    regions[id] = { ...regions[id], P: r.Pnext };
    void rs;
  }
  s = { ...s, regions };

  // 6. migration
  const P: Record<string, number> = {};
  for (const id of ALL_REGIONS) P[id] = s.regions[id].P;
  const delta = migrate({ P, K, edges: directedEdges(period, s.traits), focus: s.spreadFocus }, params);
  const migrated = { ...s.regions };
  for (const id of ALL_REGIONS) migrated[id] = { ...migrated[id], P: Math.max(0, migrated[id].P + (delta[id] ?? 0)) };
  s = { ...s, regions: migrated };

  // 7. occupancy
  const occ = { ...s.regions };
  for (const id of ALL_REGIONS) {
    const avail = regionState(id, period).available;
    occ[id] = { ...occ[id], occ: updateOccupancy(occ[id].occ, occ[id].P, params.kBase[id], avail, params) };
  }
  s = { ...s, regions: occ };

  // 8. economy (per-dt income)
  const rate = incomeRate({ totalPop: totalPop(s), occupied: occupiedCount(s) }, params);
  s = { ...s, ep: applyIncome(s.ep, rate, params.SIM_DT) };

  // 9. extinction
  if (totalPop(s) < params.extinctionFloorGlobal) return finalize(s, "lost", "extinction");

  // 10. boundary / recovery
  const budget = params.eraBudgetSec[period];
  if (s.objectives.recoveryDeadline !== null) {
    if (total >= s.objectives.recoveryDeadline) {
      if (dominateMet(s, params)) {
        return advanceOrWin(s, "dominated", true);
      }
      return finalize({ ...s, objectives: { ...s.objectives } }, "lost", "missedTarget");
    }
  } else if (elapsed >= budget) {
    if (s.mode === "survival") {
      return advanceOrWin(s, "survived", false);
    }
    // dominate
    if (dominateMet(s, params)) {
      return advanceOrWin(s, "dominated", false);
    }
    // miss
    const missed = s.objectives.missedTargets + 1;
    if (!s.objectives.recoveryUsed) {
      s = { ...s, objectives: { ...s.objectives, recoveryUsed: true, recoveryDeadline: total + params.recoverySec, missedTargets: missed } };
      return pause(s, { kind: "event", id: `recovery:${period}`, options: [], context: `Target missed — one recovery window (${params.recoverySec}s) to reach ${params.dominateTargets[period]} regions.`, requiresResume: true });
    }
    return finalize({ ...s, objectives: { ...s.objectives, missedTargets: missed } }, "lost", "missedTarget");
  }

  return s;
}

// Advance to the next period (via a transition pause) or win if this is the
// final period. `cause` only matters when winning.
function advanceOrWin(s: SimState, cause: "survived" | "dominated", viaRecovery: boolean): SimState {
  const np = nextPeriod(s.clock.period);
  const s2 = viaRecovery ? { ...s, objectives: { ...s.objectives, recoveryDeadline: null } } : s;
  if (!np) {
    return {
      ...s2,
      status: "won",
      paused: true,
      pendingDecision: null,
      outcome: {
        status: "won",
        cause,
        finalPeriod: s2.clock.period,
        missedTargets: s2.objectives.missedTargets,
        usedRecoveryWindow: s2.objectives.recoveryUsed,
        recoveryResolved: s2.objectives.recoveryUsed,
      },
    };
  }
  return pause(s2, { kind: "transition", id: `transition:${np}`, options: [], context: `Entering the ${np}.`, requiresResume: true });
}

export type { Period, RegionId };
