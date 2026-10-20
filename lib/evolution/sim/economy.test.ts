import { describe, it, expect } from "vitest";
import { incomeRate, applyIncome, grantOnce } from "./economy";
import { NORMAL } from "./difficulty";

describe("economy", () => {
  it("income is sub-linear in population (no runaway)", () => {
    const low = incomeRate({ totalPop: 100, occupied: 2 }, NORMAL);
    const high = incomeRate({ totalPop: 400, occupied: 2 }, NORMAL);
    expect(high).toBeLessThan(low * 4);
  });
  it("applyIncome scales with dt", () => {
    const rate = incomeRate({ totalPop: 100, occupied: 2 }, NORMAL);
    expect(applyIncome(0, rate, NORMAL.SIM_DT)).toBeCloseTo(rate * NORMAL.SIM_DT);
  });
  it("catch-up floor applies when occupied <= 1", () => {
    expect(incomeRate({ totalPop: 5, occupied: 1 }, NORMAL)).toBeGreaterThanOrEqual(NORMAL.catchUpFloor);
  });
  it("grantOnce is idempotent per id and not scaled by dt", () => {
    const a = grantOnce({ ep: 0, claimed: [] }, "survive:x", NORMAL.eventSurvivalGrant);
    expect(a.ep).toBe(NORMAL.eventSurvivalGrant);
    const b = grantOnce(a, "survive:x", NORMAL.eventSurvivalGrant);
    expect(b.ep).toBe(NORMAL.eventSurvivalGrant);
  });
});
