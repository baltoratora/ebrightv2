import { describe, it, expect } from "vitest";
import { fitness } from "./fitness";

const base = { traits: [] as string[], niche: null };

describe("fitness", () => {
  it("deepAnoxic is poor (<0.5) without hypoxia, good (>0.5) with it", () => {
    expect(fitness("deepAnoxic", { ...base, period: "ordovician" })).toBeLessThan(0.5);
    expect(fitness("deepAnoxic", { ...base, period: "ordovician", traits: ["hypoxia"] })).toBeGreaterThan(0.5);
  });
  it("armour raises reef fitness when predation is high (Ordovician)", () => {
    const without = fitness("reef", { ...base, period: "ordovician" });
    const withArmor = fitness("reef", { ...base, period: "ordovician", traits: ["armor"] });
    expect(withArmor).toBeGreaterThan(without);
    expect(without).toBeLessThan(0.5);
    expect(withArmor).toBeGreaterThan(0.5);
  });
  it("Cambrian reef is occupiable (>0.5) with no traits", () => {
    expect(fitness("reef", { ...base, period: "cambrian" })).toBeGreaterThan(0.5);
  });
  it("openOcean needs paired fins to be viable", () => {
    expect(fitness("openOcean", { ...base, period: "silurian" })).toBeLessThan(0.5);
    expect(fitness("openOcean", { ...base, period: "silurian", traits: ["paired-fins"] })).toBeGreaterThan(0.5);
  });
  it("a cold shock penalty drops surface fitness unless thermal tolerance is owned", () => {
    const pen = [{ regions: ["nursery" as const], amount: 0.3, mitigatedBy: "thermal" }];
    const bare = fitness("nursery", { ...base, period: "ordovician" });
    const cold = fitness("nursery", { ...base, period: "ordovician", penalties: pen });
    const warm = fitness("nursery", { ...base, period: "ordovician", traits: ["thermal"], penalties: pen });
    expect(cold).toBeLessThan(bare);
    expect(warm).toBeGreaterThan(cold);
  });
});
