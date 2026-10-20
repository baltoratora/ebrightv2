import { describe, it, expect } from "vitest";
import { stepPopulation, updateOccupancy } from "./population";
import { NORMAL } from "./difficulty";

const K = 100;

describe("stepPopulation", () => {
  it("poor fit (f<0.5) declines even when P < K", () => {
    const r = stepPopulation({ P: 20, f: 0.3, K, dt: NORMAL.SIM_DT, params: NORMAL });
    expect(r.Pnext).toBeLessThan(20);
  });
  it("good fit (f=1) grows toward ~0.9K and not above K", () => {
    let P = 10;
    for (let i = 0; i < 40000; i++) P = stepPopulation({ P, f: 1, K, dt: NORMAL.SIM_DT, params: NORMAL }).Pnext;
    expect(P).toBeGreaterThan(0.8 * K);
    expect(P).toBeLessThanOrEqual(K + 1e-6);
  });
  it("overcrowding after a K cut declines GRADUALLY, not an instant snap", () => {
    const one = stepPopulation({ P: 90, f: 1, K: 40, dt: NORMAL.SIM_DT, params: NORMAL }).Pnext;
    expect(one).toBeLessThan(90);
    expect(one).toBeGreaterThan(40);
  });
  it("never negative; cannot lose more than exists", () => {
    const r = stepPopulation({ P: 0.6, f: 0, K, dt: NORMAL.SIM_DT, params: NORMAL });
    expect(r.Pnext).toBeGreaterThanOrEqual(0);
  });
  it("K<=0 (habitat loss) → births zero, population decays", () => {
    const r = stepPopulation({ P: 50, f: 1, K: 0, dt: NORMAL.SIM_DT, params: NORMAL });
    expect(r.births).toBe(0);
    expect(r.Pnext).toBeLessThan(50);
  });
});

describe("updateOccupancy (hysteresis, baseline-referenced)", () => {
  const Kbase = 100;
  it("becomes occupied at >= 0.25*Kbase", () => {
    expect(updateOccupancy("colonizing", 24, Kbase, true, NORMAL)).toBe("colonizing");
    expect(updateOccupancy("colonizing", 25, Kbase, true, NORMAL)).toBe("occupied");
  });
  it("stays occupied until < 0.15*Kbase", () => {
    expect(updateOccupancy("occupied", 16, Kbase, true, NORMAL)).toBe("occupied");
    expect(updateOccupancy("occupied", 14, Kbase, true, NORMAL)).toBe("colonizing");
  });
  it("a reduced current K does not make occupancy easier (uses Kbase)", () => {
    expect(updateOccupancy("colonizing", 20, Kbase, true, NORMAL)).toBe("colonizing");
  });
  it("unavailable region is inaccessible", () => {
    expect(updateOccupancy("occupied", 50, Kbase, false, NORMAL)).toBe("inaccessible");
  });
});
