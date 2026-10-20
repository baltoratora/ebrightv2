import { describe, it, expect } from "vitest";
import { REGIONS, REGION_IDS, availableRegions, edgesFor, directedEdges, effectiveGate } from "./regions";
import { PERIODS } from "./state";

describe("regions data", () => {
  it("defines all 8 regions incl. locked land", () => {
    expect(REGION_IDS).toHaveLength(8);
    expect(REGIONS.land.lockedV1).toBe(true);
  });
  it("Cambrian availability = nursery, reef, openOcean", () => {
    expect(availableRegions("cambrian").sort()).toEqual(["nursery", "openOcean", "reef"]);
  });
  it("Devonian adds river & tidalFlats; land never available", () => {
    const dev = availableRegions("devonian");
    expect(dev).toContain("river");
    expect(dev).toContain("tidalFlats");
    expect(dev).not.toContain("land");
  });
  it("every edge references regions available that period", () => {
    for (const p of PERIODS)
      for (const e of edgesFor(p)) {
        expect(availableRegions(p)).toContain(e.a);
        expect(availableRegions(p)).toContain(e.b);
      }
  });
  it("reef predation is low in Cambrian, higher in Ordovician", () => {
    expect(REGIONS.reef.perPeriod.cambrian.predation).toBeLessThan(REGIONS.reef.perPeriod.ordovician.predation);
  });
  it("soft/hard edges upgrade to open once required traits owned", () => {
    const edge = { a: "openOcean" as const, b: "deepAnoxic" as const, gate: "hard" as const, requires: ["hypoxia"] };
    expect(effectiveGate(edge, [])).toBe("hard");
    expect(effectiveGate(edge, ["hypoxia"])).toBe("open");
  });
  it("directedEdges produces both directions", () => {
    const d = directedEdges("cambrian", []);
    expect(d.some((e) => e.from === "nursery" && e.to === "reef")).toBe(true);
    expect(d.some((e) => e.from === "reef" && e.to === "nursery")).toBe(true);
  });
});
