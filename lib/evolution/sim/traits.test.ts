import { describe, it, expect } from "vitest";
import { GAMEPLAY_TRAITS, exclusiveGroups, isUnlocked } from "./traits";

describe("gameplay traits", () => {
  it("splits thermal and hypoxia tolerance (both Ordovician)", () => {
    expect(GAMEPLAY_TRAITS.thermal.unlock).toBe("ordovician");
    expect(GAMEPLAY_TRAITS.hypoxia.unlock).toBe("ordovician");
  });
  it("marks reproduction r/K as mutually exclusive", () => {
    expect(exclusiveGroups).toContainEqual(["repR", "repK"]);
  });
  it("every trait carries a trade-off string", () => {
    for (const t of Object.values(GAMEPLAY_TRAITS)) expect(t.tradeoff.length).toBeGreaterThan(0);
  });
  it("gates by unlock period", () => {
    expect(isUnlocked("armor", "cambrian")).toBe(false);
    expect(isUnlocked("armor", "ordovician")).toBe(true);
    expect(isUnlocked("lobed-limbs", "silurian")).toBe(false);
    expect(isUnlocked("lobed-limbs", "devonian")).toBe(true);
  });
});
