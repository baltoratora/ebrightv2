import { describe, it, expect } from "vitest";
import { isExtinct, achievabilityOk, applyTransition, dominateMet } from "./modes";
import { initialState } from "./state";
import { NORMAL } from "./difficulty";

describe("modes", () => {
  it("extinction when total population below the global floor", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    s.regions.nursery.P = 0.4;
    expect(isExtinct(s, NORMAL)).toBe(true);
  });
  it("achievability invariant holds for every era", () => {
    expect(achievabilityOk(NORMAL)).toBe(true);
  });
  it("applyTransition advances the period and clears transient penalties", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    s.activePenalties = [{ regions: ["nursery"], amount: 0.3, mitigatedBy: "thermal" }];
    s.eventModifiers.nursery = 0.4;
    const t = applyTransition(s);
    expect(t.clock.period).toBe("ordovician");
    expect(t.activePenalties).toHaveLength(0);
    expect(t.eventModifiers.nursery).toBe(1);
  });
  it("dominateMet compares occupied count to the era target", () => {
    const s = initialState({ mode: "dominate", rngSeed: 1 });
    s.regions.nursery.occ = "occupied";
    s.regions.reef.occ = "occupied";
    expect(dominateMet(s, NORMAL)).toBe(true); // cambrian target 2
  });
});
