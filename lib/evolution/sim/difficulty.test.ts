import { describe, it, expect } from "vitest";
import { NORMAL } from "./difficulty";

describe("NORMAL difficulty params", () => {
  it("matches spec §14 core constants", () => {
    expect(NORMAL.SIM_DT).toBe(0.25);
    expect(NORMAL.rMax).toBe(0.05);
    expect(NORMAL.mBase).toBe(0.005);
    expect(NORMAL.mStress).toBe(0.04);
    expect(NORMAL.mCrowd).toBe(0.03);
    expect(NORMAL.migrationRate).toBe(0.1);
    expect(NORMAL.conductance).toEqual({ open: 1.0, soft: 0.2, hard: 0 });
    expect(NORMAL.establishHighFrac).toBe(0.25);
    expect(NORMAL.establishLowFrac).toBe(0.15);
    expect(NORMAL.dominateTargets).toEqual({ cambrian: 2, ordovician: 2, silurian: 3, devonian: 4 });
  });
  it("break-even fitness is ~0.5 at low P", () => {
    const f = 0.5;
    const net = NORMAL.rMax * f - NORMAL.mBase - NORMAL.mStress * (1 - f);
    expect(Math.abs(net)).toBeLessThan(1e-9);
  });
});
