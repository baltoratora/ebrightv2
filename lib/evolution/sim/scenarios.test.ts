// M3 balance validation. These are the FIRST tests that validate gameplay — the
// pre-existing suite validates only the art system and other games. Outcomes
// here are "headless scenario validated", not proof of final balance or fun.
// All policies act through legal actions on visible state (no injection).

import { describe, it, expect } from "vitest";
import {
  runHeadless,
  referencePolicy,
  passivePolicy,
  underExpandPolicy,
  recoverSuccessPolicy,
  laterMissPolicy,
  neglectSurvivalPolicy,
} from "./headless";

const REF_SEEDS = [11, 23, 37, 101, 7];

describe("Normal-difficulty scenarios (headless scenario validated)", () => {
  it("SURVIVAL: reference reaches the end of the Devonian alive, across seeds", () => {
    for (const seed of REF_SEEDS) {
      const r = runHeadless({ mode: "survival", seed, policy: referencePolicy });
      expect(r.outcome.status).toBe("won");
      expect(r.outcome.finalPeriod).toBe("devonian");
    }
  });

  it("DOMINATE: reference meets every era target and wins, across seeds, no misses", () => {
    for (const seed of REF_SEEDS) {
      const r = runHeadless({ mode: "dominate", seed, policy: referencePolicy });
      expect(r.outcome.status).toBe("won");
      expect(r.outcome.missedTargets).toBe(0);
      expect(r.outcome.usedRecoveryWindow).toBe(false);
    }
  });

  it("is deterministic (same seed + policy → identical outcome)", () => {
    const a = runHeadless({ mode: "dominate", seed: 11, policy: referencePolicy });
    const b = runHeadless({ mode: "dominate", seed: 11, policy: referencePolicy });
    expect(a.outcome).toEqual(b.outcome);
    expect(a.steps).toBe(b.steps);
  });

  it("policies use only legal actions — EP never goes negative", () => {
    const r = runHeadless({ mode: "dominate", seed: 11, policy: referencePolicy });
    for (const p of r.trace) expect(p.ep).toBeGreaterThanOrEqual(0);
  });

  it("EXTINCTION (survival): neglecting telegraphed threats drives the lineage extinct", () => {
    for (const seed of [11, 23, 37]) {
      const r = runHeadless({ mode: "survival", seed, policy: passivePolicy });
      expect(r.outcome.status).toBe("lost");
      expect(r.outcome.cause).toBe("extinction");
    }
  });

  it("EXTINCTION (dominate): an unprepared lineage goes extinct in the Devonian pulses", () => {
    const r = runHeadless({ mode: "dominate", seed: 11, policy: neglectSurvivalPolicy });
    expect(r.outcome.status).toBe("lost");
    expect(r.outcome.cause).toBe("extinction");
  });

  it("RECOVERY success: recovering inside the window continues the run (to victory)", () => {
    for (const seed of [11, 23, 37]) {
      const r = runHeadless({ mode: "dominate", seed, policy: recoverSuccessPolicy });
      expect(r.outcome.usedRecoveryWindow).toBe(true);
      expect(r.outcome.status).toBe("won");
      expect(r.outcome.finalPeriod).toBe("devonian");
    }
  });

  it("RECOVERY miss: failing to reach the target within the window ends the run", () => {
    for (const seed of [11, 23, 37]) {
      const r = runHeadless({ mode: "dominate", seed, policy: underExpandPolicy });
      expect(r.outcome.usedRecoveryWindow).toBe(true);
      expect(r.outcome.status).toBe("lost");
      expect(r.outcome.cause).toBe("missedTarget");
      expect(r.outcome.finalPeriod).toBe("silurian");
    }
  });

  it("LATER miss: a later miss ends the run once the lifeline is already spent", () => {
    const r = runHeadless({ mode: "dominate", seed: 11, policy: laterMissPolicy });
    expect(r.outcome.usedRecoveryWindow).toBe(true);
    expect(r.outcome.status).toBe("lost");
    expect(r.outcome.cause).toBe("missedTarget");
    expect(r.outcome.finalPeriod).toBe("devonian");
    expect(r.outcome.missedTargets).toBeGreaterThanOrEqual(2);
  });
});
