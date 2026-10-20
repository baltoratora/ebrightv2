// Core simulation types + initial state for the Evolve gameplay engine.
// Pure data only — no Date.now()/Math.random() anywhere in lib/evolution/sim.
// See docs/superpowers/specs/2026-10-20-evolve-gameplay-design.md.

export type Period = "cambrian" | "ordovician" | "silurian" | "devonian";
export const PERIODS: Period[] = ["cambrian", "ordovician", "silurian", "devonian"];
export function nextPeriod(p: Period): Period | null {
  const i = PERIODS.indexOf(p);
  return i >= 0 && i < PERIODS.length - 1 ? PERIODS[i + 1] : null;
}

export type RegionId =
  | "nursery" | "reef" | "openOcean" | "deepAnoxic"
  | "estuary" | "river" | "tidalFlats" | "land";
export const ALL_REGIONS: RegionId[] =
  ["nursery", "reef", "openOcean", "deepAnoxic", "estuary", "river", "tidalFlats", "land"];
export const PLAYABLE_REGIONS: RegionId[] =
  ["nursery", "reef", "openOcean", "deepAnoxic", "estuary", "river", "tidalFlats"];

export type OccState = "inaccessible" | "colonizing" | "occupied";
export type Mode = "survival" | "dominate";
export type Difficulty = "normal";
export type NicheId = "filterFeeding" | "benthicGrazing";

// A decision that auto-pauses the simulation and awaits a player/policy action.
export type DecisionKind = "niche" | "mutation" | "event" | "extinctionBriefing" | "transition";
export interface PendingDecision {
  kind: DecisionKind;
  id: string;            // unique, e.g. "niche:start", "mutation:90", "shock:hirnantian"
  options: string[];     // option ids; empty => acknowledge-only
  context: string;       // human-readable
  requiresResume: boolean; // stay paused after resolving until an explicit resume
}

export interface RegionState { id: RegionId; P: number; occ: OccState; }

export interface Outcome {
  status: "won" | "lost";
  cause: "survived" | "dominated" | "extinction" | "missedTarget";
  finalPeriod: Period;
  missedTargets: number;
  usedRecoveryWindow: boolean;
  recoveryResolved: boolean;
}

export interface ShockReport { id: string; regions: RegionId[]; lostFraction: number; }

export interface SimState {
  schemaVersion: number;
  mode: Mode;
  difficulty: Difficulty;
  rngSeed: number;
  rngCursor: number;
  clock: { period: Period; elapsedInPeriod: number; totalElapsed: number };
  regions: Record<RegionId, RegionState>;
  traits: string[];
  niche: NicheId | null;
  spreadFocus: RegionId | null;
  ep: number;
  objectives: { recoveryUsed: boolean; recoveryDeadline: number | null; missedTargets: number };
  schedule: {
    firedWarnings: string[];
    firedShocks: string[];
    claimedGrants: string[];
    nextMutationAt: number;
  };
  // Per-region capacity multiplier from extinction shocks (1 = unaffected).
  eventModifiers: Record<RegionId, number>;
  // Active fitness penalties from ongoing shocks, keyed by region, with the
  // trait that mitigates them (consumed by fitness.ts).
  activePenalties: { regions: RegionId[]; amount: number; mitigatedBy: string }[];
  paused: boolean;
  pendingDecision: PendingDecision | null;
  status: "running" | "won" | "lost";
  outcome: Outcome | null;
  lastShockReport: ShockReport | null;
}

export const SCHEMA_VERSION = 1;
export const START_MUTATION_AT = 90; // mirrors NORMAL.mutationIntervalSec; tick re-syncs from params

export function initialState(opts: { mode: Mode; rngSeed: number; difficulty?: Difficulty }): SimState {
  const regions = {} as Record<RegionId, RegionState>;
  for (const id of ALL_REGIONS) regions[id] = { id, P: id === "nursery" ? 10 : 0, occ: "inaccessible" };
  regions.nursery.occ = "colonizing";
  const eventModifiers = {} as Record<RegionId, number>;
  for (const id of ALL_REGIONS) eventModifiers[id] = 1;
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: opts.mode,
    difficulty: opts.difficulty ?? "normal",
    rngSeed: opts.rngSeed,
    rngCursor: 0,
    clock: { period: "cambrian", elapsedInPeriod: 0, totalElapsed: 0 },
    regions,
    traits: [],
    niche: null,
    spreadFocus: null,
    ep: 0,
    objectives: { recoveryUsed: false, recoveryDeadline: null, missedTargets: 0 },
    schedule: { firedWarnings: [], firedShocks: [], claimedGrants: [], nextMutationAt: START_MUTATION_AT },
    eventModifiers,
    activePenalties: [],
    paused: true,
    pendingDecision: {
      kind: "niche",
      id: "niche:start",
      options: ["filterFeeding", "benthicGrazing"],
      context: "Choose your lineage's feeding niche to begin.",
      requiresResume: true,
    },
    status: "running",
    outcome: null,
    lastShockReport: null,
  };
}

// --- selectors (pure) ---
export function totalPop(s: SimState): number {
  let t = 0;
  for (const id of ALL_REGIONS) t += s.regions[id].P;
  return t;
}
export function occupiedCount(s: SimState): number {
  let n = 0;
  for (const id of PLAYABLE_REGIONS) if (s.regions[id].occ === "occupied") n++;
  return n;
}
