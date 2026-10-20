import { describe, it, expect } from "vitest";
import { applyShock } from "./extinctions";
import { initialState } from "../sim/state";
import { NORMAL } from "../sim/difficulty";

function withReef(P: number) {
  const s = initialState({ mode: "survival", rngSeed: 1 });
  s.regions.reef = { id: "reef", P, occ: "occupied" };
  s.regions.nursery = { id: "nursery", P: 50, occ: "occupied" };
  return s;
}

describe("applyShock", () => {
  it("applies a one-time disasterLoss and is idempotent per shock id", () => {
    const r1 = applyShock(withReef(100), "hangenberg", NORMAL);
    expect(r1.regions.reef.P).toBeCloseTo(100 * (1 - 0.4));
    expect(r1.schedule.firedShocks).toContain("hangenberg");
    const r2 = applyShock(r1, "hangenberg", NORMAL);
    expect(r2.regions.reef.P).toBeCloseTo(r1.regions.reef.P);
  });
  it("reduces capacity via eventModifiers and records a report", () => {
    const r = applyShock(withReef(80), "kellwasser", NORMAL);
    expect(r.eventModifiers.reef).toBe(0.3);
    expect(r.lastShockReport?.id).toBe("kellwasser");
    expect(r.lastShockReport?.lostFraction).toBeCloseTo(0.25);
  });
  it("adds an ongoing fitness penalty mitigated by a trait", () => {
    const r = applyShock(withReef(80), "hirnantian", NORMAL);
    expect(r.activePenalties.some((p) => p.mitigatedBy === "thermal")).toBe(true);
  });
});
