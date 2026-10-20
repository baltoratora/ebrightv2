import { describe, it, expect } from "vitest";
import { tick } from "./tick";
import { initialState, type SimState } from "./state";
import { makeRng } from "./rng";
import { NORMAL } from "./difficulty";
import { applyAction } from "./actions";

// Resolve the opening niche choice and resume explicitly (correction 2).
function begin(mode: "survival" | "dominate" = "survival", seed = 1): SimState {
  let s = initialState({ mode, rngSeed: seed });
  s = applyAction(s, { type: "resolveDecision", choice: "filterFeeding" }, NORMAL).state;
  s = applyAction(s, { type: "resume" }, NORMAL).state;
  return s;
}
function step(s: SimState): SimState {
  return tick(s, makeRng(s.rngSeed, s.rngCursor), NORMAL);
}

describe("tick", () => {
  it("does not advance while paused / awaiting a decision", () => {
    const s0 = initialState({ mode: "survival", rngSeed: 1 }); // paused, niche pending
    expect(step(s0)).toBe(s0);
  });
  it("advances the clock by exactly SIM_DT once resumed", () => {
    const s = begin();
    const t0 = s.clock.totalElapsed;
    const s1 = step(s);
    expect(s1.clock.totalElapsed).toBeCloseTo(t0 + 0.25);
  });
  it("spreads and grows total population over the first in-sim minute", () => {
    let s = begin();
    for (let i = 0; i < 240; i++) {
      if (s.paused || s.pendingDecision) s = applyAction(s, { type: "resume" }, NORMAL).state;
      else s = step(s);
    }
    // nursery exports migrants to the reef (automatic spreading); total grows
    expect(s.regions.reef.P).toBeGreaterThan(0);
    expect(s.regions.nursery.P + s.regions.reef.P + s.regions.openOcean.P).toBeGreaterThan(10);
  });
  it("is deterministic for the same seed and inputs", () => {
    const run = () => {
      let s = begin("survival", 5);
      for (let i = 0; i < 400; i++) {
        if (s.pendingDecision) s = applyAction(s, { type: "resolveDecision", choice: null }, NORMAL).state;
        else if (s.paused) s = applyAction(s, { type: "resume" }, NORMAL).state;
        else s = step(s);
      }
      return s;
    };
    expect(run()).toEqual(run());
  });
});
