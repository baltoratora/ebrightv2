import { describe, it, expect } from "vitest";
import { applyAction } from "./actions";
import { initialState, type SimState } from "./state";
import { NORMAL } from "./difficulty";

function ready(mode: "survival" | "dominate" = "survival"): SimState {
  let s = initialState({ mode, rngSeed: 1 });
  s = applyAction(s, { type: "resolveDecision", choice: "filterFeeding" }, NORMAL).state;
  s = applyAction(s, { type: "resume" }, NORMAL).state;
  return s;
}

describe("action reducers", () => {
  it("resolving the niche sets it and stays paused until resume", () => {
    const s0 = initialState({ mode: "survival", rngSeed: 1 });
    const r = applyAction(s0, { type: "resolveDecision", choice: "filterFeeding" }, NORMAL).state;
    expect(r.niche).toBe("filterFeeding");
    expect(r.pendingDecision).toBeNull();
    expect(r.paused).toBe(true);
  });
  it("resume is rejected while a decision is pending", () => {
    const s0 = initialState({ mode: "survival", rngSeed: 1 });
    const r = applyAction(s0, { type: "resume" }, NORMAL);
    expect(r.error).toBeTruthy();
    expect(r.state.paused).toBe(true);
  });
  it("buyTrait validates unlock, funds, ownership and exclusivity", () => {
    let s = ready();
    // locked this period
    expect(applyAction(s, { type: "buyTrait", trait: "armor" }, NORMAL).error).toBeTruthy();
    // unaffordable
    expect(applyAction(s, { type: "buyTrait", trait: "eyes" }, NORMAL).error).toBeTruthy();
    s = { ...s, ep: 100, clock: { ...s.clock, period: "ordovician" } };
    s = applyAction(s, { type: "buyTrait", trait: "repK" }, NORMAL).state;
    expect(s.traits).toContain("repK");
    expect(s.ep).toBe(100 - NORMAL.traitCost.repK);
    // exclusivity: cannot also buy repR
    expect(applyAction(s, { type: "buyTrait", trait: "repR" }, NORMAL).error).toBeTruthy();
  });
  it("declining a mutation grants declineEP", () => {
    let s = ready();
    s = { ...s, pendingDecision: { kind: "mutation", id: "m", options: ["eyes"], context: "", requiresResume: true }, paused: true };
    const r = applyAction(s, { type: "resolveDecision", choice: null }, NORMAL).state;
    expect(r.ep).toBe(NORMAL.declineEP);
  });
});
