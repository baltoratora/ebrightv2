import { describe, it, expect } from "vitest";
import { capacityK } from "./capacity";
import { NORMAL } from "./difficulty";

describe("capacityK", () => {
  it("= kBase * capacityFactor * eventFactor", () => {
    expect(capacityK("reef", "ordovician", 1, NORMAL)).toBeCloseTo(NORMAL.kBase.reef * 1.0);
    expect(capacityK("reef", "ordovician", 0.3, NORMAL)).toBeCloseTo(NORMAL.kBase.reef * 1.0 * 0.3);
    expect(capacityK("reef", "cambrian", 1, NORMAL)).toBeCloseTo(NORMAL.kBase.reef * 0.6);
  });
  it("is 0 for unavailable / locked regions", () => {
    expect(capacityK("river", "cambrian", 1, NORMAL)).toBe(0);
    expect(capacityK("land", "devonian", 1, NORMAL)).toBe(0);
  });
});
