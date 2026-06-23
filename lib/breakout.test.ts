import { describe, it, expect } from "vitest";
import { circleRectHit, bounceOffRect, makeBricks, type Ball } from "./breakout";

const ball = (over: Partial<Ball>): Ball => ({ x: 0, y: 0, vx: 0, vy: 0, r: 6, ...over });

describe("circleRectHit", () => {
  it("detects touch and clears when far", () => {
    const rect = { x: 0, y: 0, w: 40, h: 10 };
    expect(circleRectHit(ball({ x: 20, y: 13 }), rect)).toBe(true); // just below
    expect(circleRectHit(ball({ x: 20, y: 30 }), rect)).toBe(false);
  });
});

describe("bounceOffRect", () => {
  it("reflects a ball rising into a brick from below", () => {
    const b = ball({ x: 20, y: 12, vx: 0, vy: -4, r: 6 });
    const hit = bounceOffRect(b, { x: 0, y: 0, w: 40, h: 10 });
    expect(hit).toBe(true);
    expect(b.vy).toBeGreaterThan(0); // sent back down
  });
  it("reflects horizontally off a side", () => {
    const b = ball({ x: 43, y: 5, vx: -4, vy: 0, r: 6 });
    bounceOffRect(b, { x: 0, y: 0, w: 40, h: 10 });
    expect(b.vx).toBeGreaterThan(0); // bounced right
  });
  it("ignores a far rect", () => {
    expect(bounceOffRect(ball({ x: 0, y: 0, vy: 4 }), { x: 0, y: 100, w: 40, h: 10 })).toBe(false);
  });
});

describe("makeBricks", () => {
  it("creates rows*cols live bricks within the area", () => {
    const bricks = makeBricks(4, 8, 320, 40, 4, 16);
    expect(bricks).toHaveLength(32);
    expect(bricks.every((b) => b.alive)).toBe(true);
    expect(bricks.every((b) => b.x >= 0 && b.x + b.w <= 320)).toBe(true);
  });
});
