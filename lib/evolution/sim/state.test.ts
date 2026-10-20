import { describe, it, expect } from "vitest";
import { initialState, PLAYABLE_REGIONS, totalPop, occupiedCount } from "./state";

describe("initialState", () => {
  it("starts a paused Cambrian run awaiting the niche decision", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    expect(s.clock.period).toBe("cambrian");
    expect(s.clock.totalElapsed).toBe(0);
    expect(s.regions.nursery.P).toBe(10);
    expect(s.regions.nursery.occ).toBe("colonizing");
    expect(s.ep).toBe(0);
    expect(s.paused).toBe(true);
    expect(s.pendingDecision?.kind).toBe("niche");
    expect(s.status).toBe("running");
  });
  it("lists 7 playable regions (land excluded)", () => {
    expect(PLAYABLE_REGIONS).toHaveLength(7);
    expect(PLAYABLE_REGIONS).not.toContain("land");
  });
  it("selectors read total and occupied", () => {
    const s = initialState({ mode: "dominate", rngSeed: 2 });
    expect(totalPop(s)).toBe(10);
    expect(occupiedCount(s)).toBe(0);
  });
});
