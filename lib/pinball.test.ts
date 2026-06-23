import { describe, it, expect } from "vitest";
import { closestOnSeg, collideSeg, collideCircle, type Ball } from "./pinball";

const ball = (over: Partial<Ball>): Ball => ({ x: 0, y: 0, vx: 0, vy: 0, r: 5, ...over });

describe("closestOnSeg", () => {
  it("clamps to the nearest endpoint and projects onto the segment", () => {
    const s = { x1: 0, y1: 0, x2: 10, y2: 0 };
    expect(closestOnSeg(5, 3, s)).toEqual({ x: 5, y: 0 }); // projects down
    expect(closestOnSeg(-4, 0, s)).toEqual({ x: 0, y: 0 }); // clamp left
    expect(closestOnSeg(99, 0, s)).toEqual({ x: 10, y: 0 }); // clamp right
  });
});

describe("collideSeg", () => {
  it("reflects a ball falling onto a horizontal floor", () => {
    const b = ball({ x: 5, y: 8, vx: 0, vy: 4, r: 5 });
    const hit = collideSeg(b, { x1: 0, y1: 10, x2: 10, y2: 10 }, 0.5);
    expect(hit).toBe(true);
    expect(b.vy).toBeLessThan(0); // bounced upward
    expect(b.y).toBeLessThanOrEqual(5); // pushed above the floor (y=10 - r)
  });
  it("ignores a far segment", () => {
    const b = ball({ x: 0, y: 0, vx: 0, vy: 1, r: 5 });
    expect(collideSeg(b, { x1: 0, y1: 100, x2: 10, y2: 100 }, 0.5)).toBe(false);
  });
  it("adds a kick when provided", () => {
    const b = ball({ x: 5, y: 8, vx: 0, vy: 1, r: 5 });
    collideSeg(b, { x1: 0, y1: 10, x2: 10, y2: 10 }, 0.3, 6);
    expect(b.vy).toBeLessThan(-3); // strong upward kick
  });
});

describe("collideCircle", () => {
  it("bounces off a bumper", () => {
    const b = ball({ x: 0, y: 0, vx: 3, vy: 0, r: 5 });
    const hit = collideCircle(b, 8, 0, 5, 2); // bumper to the right
    expect(hit).toBe(true);
    expect(b.vx).toBeLessThan(0); // pushed back left
  });
});
