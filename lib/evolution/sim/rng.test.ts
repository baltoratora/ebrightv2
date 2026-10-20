import { describe, it, expect } from "vitest";
import { makeRng } from "./rng";

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a.nextFloat(), a.nextFloat(), a.nextFloat()]).toEqual([b.nextFloat(), b.nextFloat(), b.nextFloat()]);
  });
  it("resumes exactly from a persisted cursor", () => {
    const a = makeRng(7);
    a.nextFloat();
    a.nextFloat();
    const resumed = makeRng(7, a.cursor);
    const original = makeRng(7);
    original.nextFloat();
    original.nextFloat();
    expect(resumed.nextFloat()).toBe(original.nextFloat());
  });
  it("returns floats in [0,1)", () => {
    const r = makeRng(99);
    for (let i = 0; i < 500; i++) {
      const x = r.nextFloat();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
