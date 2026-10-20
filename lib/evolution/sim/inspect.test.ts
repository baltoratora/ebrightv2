import { describe, it, expect } from "vitest";
import { inspectRegion, periodLabel } from "./inspect";
import { initialState } from "./state";
import { NORMAL } from "./difficulty";

describe("inspectRegion", () => {
  it("flags an inaccessible region and the period it opens", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 }); // cambrian
    const r = inspectRegion(s, "deepAnoxic", NORMAL);
    expect(r.status).toBe("inaccessible");
    expect(r.detail.toLowerCase()).toContain("ordovician");
  });
  it("names a helpful adaptation for a poor-fit region", () => {
    const s = { ...initialState({ mode: "survival", rngSeed: 1 }), clock: { period: "ordovician" as const, elapsedInPeriod: 0, totalElapsed: 0 } };
    s.regions.deepAnoxic = { id: "deepAnoxic", P: 5, occ: "colonizing" };
    const r = inspectRegion(s, "deepAnoxic", NORMAL);
    expect(r.suggestion).toContain("Hypoxia");
    expect(r.limitingFactor).toBe("low oxygen");
  });
  it("describes the locked land honestly", () => {
    const s = { ...initialState({ mode: "survival", rngSeed: 1 }), clock: { period: "devonian" as const, elapsedInPeriod: 0, totalElapsed: 0 } };
    const r = inspectRegion(s, "land", NORMAL);
    expect(r.status).toBe("inaccessible");
    expect(r.detail.toLowerCase()).toContain("land");
  });
});

describe("periodLabel", () => {
  it("shows the period name and Ma span", () => {
    expect(periodLabel("cambrian")).toMatch(/Cambrian/);
    expect(periodLabel("cambrian")).toMatch(/Ma/);
  });
});
