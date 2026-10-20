// Headless, policy-driven run harness for balance validation (plan M3).
// Policies issue ONLY legal actions through applyAction and read only
// player-visible state — they never inject population, EP, or traits
// (correction 3).

import type { DifficultyParams } from "./difficulty";
import { NORMAL } from "./difficulty";
import type { Mode, NicheId, Outcome, RegionId, SimState } from "./state";
import { initialState, occupiedCount, totalPop } from "./state";
import { makeRng } from "./rng";
import { tick } from "./tick";
import { applyAction, type Action } from "./actions";
import { exclusiveGroups, isUnlocked } from "./traits";

export type PolicyStep = Action | { type: "advance" };
export type Policy = (s: SimState, params: DifficultyParams) => PolicyStep;

export interface TracePoint { t: number; period: string; ep: number; occupied: number; totalPop: number; }
export interface RunResult { trace: TracePoint[]; outcome: Outcome; steps: number; }

export function runHeadless(cfg: { mode: Mode; seed: number; policy: Policy; params?: DifficultyParams; maxGuard?: number }): RunResult {
  const params = cfg.params ?? NORMAL;
  let s = initialState({ mode: cfg.mode, rngSeed: cfg.seed });
  const trace: TracePoint[] = [];
  const guardMax = cfg.maxGuard ?? 500000;
  let guard = 0;
  let steps = 0;

  while (s.status === "running" && guard++ < guardMax) {
    const step = cfg.policy(s, params);
    if (step.type === "advance") {
      if (s.paused || s.pendingDecision) {
        s = applyAction(s, { type: "resume" }, params).state;
        continue;
      }
      const rng = makeRng(s.rngSeed, s.rngCursor);
      s = tick(s, rng, params);
      steps++;
      if (steps % 20 === 0) trace.push({ t: s.clock.totalElapsed, period: s.clock.period, ep: s.ep, occupied: occupiedCount(s), totalPop: totalPop(s) });
    } else {
      s = applyAction(s, step, params).state;
    }
  }

  const outcome: Outcome = s.outcome ?? {
    status: s.status === "won" ? "won" : "lost",
    cause: s.status === "won" ? "survived" : "extinction",
    finalPeriod: s.clock.period,
    missedTargets: s.objectives.missedTargets,
    usedRecoveryWindow: s.objectives.recoveryUsed,
    recoveryResolved: s.objectives.recoveryUsed,
  };
  return { trace, outcome, steps };
}

// --- policy factory -------------------------------------------------------
interface PolicyOpts {
  niche: NicheId;
  wishlist: (s: SimState) => string[];
  acceptMutations: boolean;
  focus?: (s: SimState) => RegionId | null;
}

function conflicts(owned: string[], t: string): boolean {
  return exclusiveGroups.some((g) => g.includes(t) && g.some((x) => x !== t && owned.includes(x)));
}

export function makePolicy(opts: PolicyOpts): Policy {
  return (s, params) => {
    if (s.pendingDecision) {
      const d = s.pendingDecision;
      if (d.kind === "niche") return { type: "resolveDecision", choice: opts.niche };
      if (d.kind === "mutation") {
        if (opts.acceptMutations) {
          const want = opts.wishlist(s);
          const pick = d.options.find((o) => want.includes(o) && !conflicts(s.traits, o));
          return { type: "resolveDecision", choice: pick ?? null };
        }
        return { type: "resolveDecision", choice: null };
      }
      return { type: "resolveDecision", choice: null }; // acknowledge events/transitions
    }
    if (s.paused) return { type: "resume" };

    for (const t of opts.wishlist(s)) {
      if (
        !s.traits.includes(t) &&
        isUnlocked(t, s.clock.period) &&
        (params.traitCost[t] ?? Infinity) <= s.ep &&
        !conflicts(s.traits, t)
      ) {
        return { type: "buyTrait", trait: t };
      }
    }
    if (opts.focus) {
      const f = opts.focus(s);
      if (f && s.spreadFocus !== f) return { type: "setFocus", region: f };
    }
    return { type: "advance" };
  };
}

const SURVIVAL = ["thermal", "hypoxia", "armor", "repK"];
const EXPANSION = ["paired-fins", "osmoregulation", "lobed-limbs", "airGulping", "jaws"];

// Reference: adapts for survival and expansion; should win both modes with no
// missed targets.
export const referencePolicy = makePolicy({
  niche: "filterFeeding",
  acceptMutations: true,
  wishlist: () => [...SURVIVAL, ...EXPANSION, "eyes", "swimming"],
});

// Passive: chooses a niche to start, declines everything, never adapts → extinction.
export const passivePolicy = makePolicy({
  niche: "filterFeeding",
  acceptMutations: false,
  wishlist: () => [],
});

// Under-expand: survives (buys tolerances) but never buys expansion → misses the
// Silurian target, uses the recovery window, and still cannot reach it → loses.
export const underExpandPolicy = makePolicy({
  niche: "filterFeeding",
  acceptMutations: false,
  wishlist: () => [...SURVIVAL],
});

// Recover-success: delays expansion until the recovery window opens, recovers the
// Silurian target, then expands in the Devonian → wins via the lifeline.
export const recoverSuccessPolicy = makePolicy({
  niche: "filterFeeding",
  acceptMutations: false,
  wishlist: (s) => (s.objectives.recoveryUsed ? [...SURVIVAL, ...EXPANSION] : [...SURVIVAL]),
});

// Later-miss: recovers the Silurian target (buys fins once recovery opens) but
// never buys the Devonian expansion traits → misses the Devonian target with the
// lifeline already spent → loses.
export const laterMissPolicy = makePolicy({
  niche: "filterFeeding",
  acceptMutations: false,
  wishlist: (s) => (s.objectives.recoveryUsed ? [...SURVIVAL, "paired-fins"] : [...SURVIVAL]),
});

// Neglect-survival: expands into marine shallows to clear early targets but
// never buys the tolerances (thermal/hypoxia) nor a refuge (osmoregulation →
// freshwater), so the Late Devonian anoxic pulses drive it extinct — exercising
// extinction in Dominate mode.
export const neglectSurvivalPolicy = makePolicy({
  niche: "filterFeeding",
  acceptMutations: false,
  wishlist: () => ["armor", "paired-fins", "jaws"],
});
