import { describe, expect, it } from "vitest";
import { initialState } from "./sim/state";
import { dispersalCorridors, habitatView, visibleHabitat } from "./presentation";

describe("living-world presentation", () => {
  it("does not draw closed or unavailable migration corridors", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    s.clock.period = "ordovician";
    s.regions.openOcean.P = 12;
    expect(dispersalCorridors(s).some((e) => e.to === "deepAnoxic")).toBe(false);
    s.traits.push("hypoxia");
    expect(dispersalCorridors(s).some((e) => e.to === "deepAnoxic")).toBe(true);
    s.eventModifiers.deepAnoxic = 0;
    expect(dispersalCorridors(s).some((e) => e.to === "deepAnoxic")).toBe(false);
  });
  it("shows no lineage sprites in an empty habitat and no false refuge after collapse", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    expect(habitatView(s, "reef").density).toBe(0);
    s.regions.reef.P = 40;
    s.eventModifiers.reef = 0;
    expect(habitatView(s, "reef")).toMatchObject({ capacity: 0, stressed: true, density: 0 });
  });
  it("falls back to a valid habitat across period changes without mutating state", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    const before = JSON.stringify(s);
    expect(visibleHabitat(s, "river")).toBe("nursery");
    habitatView(s, "nursery"); dispersalCorridors(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
