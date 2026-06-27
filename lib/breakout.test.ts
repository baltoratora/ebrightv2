import { describe, it, expect } from "vitest";
import { circleRectHit, bounceOffRect, makeBricks, getLevelRows, getLevelSpeedMult, type Ball } from "./breakout";

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
  it("bricks have hits, maxHits and powerup fields", () => {
    const bricks = makeBricks(4, 8, 320, 40, 4, 16);
    expect(bricks.every((b) => typeof b.hits === "number" && b.hits >= 1)).toBe(true);
    expect(bricks.every((b) => typeof b.maxHits === "number" && b.maxHits >= b.hits)).toBe(true);
    const validPU = [null, "wide", "slow", "multi"];
    expect(bricks.every((b) => validPU.includes(b.powerup))).toBe(true);
  });
  it("top-2-row bricks at col%3===0 are hard (maxHits===2)", () => {
    const bricks = makeBricks(4, 8, 320, 40, 4, 16);
    // row 0, col 0 → index 0
    expect(bricks[0].maxHits).toBe(2);
    expect(bricks[0].hits).toBe(2);
    // row 0, col 3 → index 3
    expect(bricks[3].maxHits).toBe(2);
    // row 2, col 0 → index 16 (soft)
    expect(bricks[16].maxHits).toBe(1);
  });
});

describe("getLevelRows", () => {
  it("returns 4+level, capped at 8", () => {
    expect(getLevelRows(1)).toBe(5);
    expect(getLevelRows(4)).toBe(8);
    expect(getLevelRows(10)).toBe(8);
  });
});

describe("getLevelSpeedMult", () => {
  it("is 1.0 at level 1, grows by 0.08 per level, capped at 1.6", () => {
    expect(getLevelSpeedMult(1)).toBeCloseTo(1.0);
    expect(getLevelSpeedMult(2)).toBeCloseTo(1.08);
    expect(getLevelSpeedMult(3)).toBeCloseTo(1.16);
    expect(getLevelSpeedMult(100)).toBe(1.6);
  });
});
