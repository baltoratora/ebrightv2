import { describe, it, expect } from "vitest";
import { collide, stepOnce, allStopped, type Disc } from "./physics";

const disc = (over: Partial<Disc>): Disc => ({
  id: "d",
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 10,
  mass: 1,
  alive: true,
  kind: "x",
  ...over,
});

describe("collide", () => {
  it("transfers momentum on a head-on equal-mass hit", () => {
    const a = disc({ id: "a", x: 0, y: 0, vx: 5, vy: 0 });
    const b = disc({ id: "b", x: 19, y: 0, vx: 0, vy: 0 }); // overlapping (dist 19 < 20)
    collide(a, b);
    expect(b.vx).toBeGreaterThan(4); // most speed transferred to b
    expect(a.vx).toBeLessThan(b.vx); // a slowed
  });
  it("separates overlapping discs", () => {
    const a = disc({ id: "a", x: 0, y: 0 });
    const b = disc({ id: "b", x: 5, y: 0 }); // heavily overlapping
    collide(a, b);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(19.9);
  });
});

describe("stepOnce", () => {
  it("moves a disc and applies friction", () => {
    const d = disc({ x: 50, y: 50, vx: 4, vy: 0 });
    stepOnce([d], 200, 200, [], 0.9);
    expect(d.x).toBeGreaterThan(50);
    expect(Math.abs(d.vx)).toBeLessThan(4); // damped
  });
  it("bounces off a wall", () => {
    const d = disc({ x: 195, y: 50, r: 10, vx: 6, vy: 0 });
    stepOnce([d], 200, 200, [], 1);
    expect(d.vx).toBeLessThan(0); // reflected
    expect(d.x + d.r).toBeLessThanOrEqual(200);
  });
  it("pockets a disc within a pocket", () => {
    const d = disc({ id: "z", x: 10, y: 10, vx: 0, vy: 0 });
    const got = stepOnce([d], 200, 200, [{ x: 12, y: 12, r: 16 }], 0.9);
    expect(got).toContain("z");
    expect(d.alive).toBe(false);
  });
});

describe("allStopped", () => {
  it("ignores pocketed discs", () => {
    const a = disc({ id: "a", vx: 0, vy: 0 });
    const b = disc({ id: "b", vx: 9, vy: 0, alive: false });
    expect(allStopped([a, b])).toBe(true);
  });
});
