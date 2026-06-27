import { describe, it, expect } from "vitest";
import {
  advanceLane, collides, onLog, laneConfigForLevel,
  GOAL_BAYS, W, ROWS,
  type Lane,
} from "./frogger";

// ── helpers ───────────────────────────────────────────────────────────────────

const roadLane = (ex: number, elen: number, dir: 1 | -1 = 1, speed = 2): Lane => ({
  kind: "road", dir, speed, entities: [{ x: ex, len: elen }],
});

const riverLane = (ex: number, elen: number, dir: 1 | -1 = 1, speed = 1.5): Lane => ({
  kind: "river", dir, speed, entities: [{ x: ex, len: elen }],
});

// ── advanceLane ───────────────────────────────────────────────────────────────

describe("advanceLane", () => {
  it("advances a right-moving entity by speed*dt", () => {
    const lane = roadLane(0, 32, 1, 2);
    const next = advanceLane(lane, 1);
    expect(next.entities[0].x).toBeCloseTo(2);
  });

  it("advances a left-moving entity by speed*dt in the negative direction", () => {
    const lane = roadLane(100, 32, -1, 2);
    const next = advanceLane(lane, 1);
    expect(next.entities[0].x).toBeCloseTo(98);
  });

  it("wraps a right-moving entity that passes the right edge back to the left", () => {
    // entity starts at W-1 (just inside right edge), moves 5 px → should wrap
    const lane = riverLane(W - 1, 64, 1, 1);
    const next = advanceLane(lane, 5); // moves 5 px, well past W
    expect(next.entities[0].x).toBeLessThan(0);
  });

  it("wraps a left-moving entity that passes the left edge back to the right", () => {
    // entity x=1, len=32, speed=1: need dt>33 so right edge (x+len) crosses 0
    // dt=40 → nx=1-40=-39, right edge=-39+32=-7 < 0 → wrap → nx=-39+W+32=313
    const lane = roadLane(1, 32, -1, 1);
    const next = advanceLane(lane, 40);
    expect(next.entities[0].x).toBeGreaterThan(W / 2);
  });

  it("does not mutate the original lane", () => {
    const lane = roadLane(10, 32, 1, 2);
    advanceLane(lane, 1);
    expect(lane.entities[0].x).toBe(10);
  });

  it("returns the same object reference for a speed-0 lane (no-op)", () => {
    const lane: Lane = { kind: "safe", dir: 1, speed: 0, entities: [] };
    expect(advanceLane(lane, 10)).toBe(lane);
  });
});

// ── collides ──────────────────────────────────────────────────────────────────

describe("collides", () => {
  it("detects overlap when frog centre is inside car bounds", () => {
    // car x=50..82, frog at x=66 → fl=54, fr=78 → overlaps
    expect(collides(66, roadLane(50, 32))).toBe(true);
  });

  it("returns false when frog is clearly before the car", () => {
    expect(collides(10, roadLane(50, 32))).toBe(false);
  });

  it("returns false when frog is clearly after the car", () => {
    expect(collides(200, roadLane(50, 32))).toBe(false);
  });

  it("returns false for a river lane", () => {
    expect(collides(66, riverLane(50, 80))).toBe(false);
  });

  it("returns false for a safe lane", () => {
    const safe: Lane = { kind: "safe", dir: 1, speed: 0, entities: [] };
    expect(collides(66, safe)).toBe(false);
  });
});

// ── onLog ─────────────────────────────────────────────────────────────────────

describe("onLog", () => {
  it("returns carry velocity (dir*speed) when frog centre is on a log", () => {
    // log from x=50 to x=130 (len=80), frog at x=90 → on log
    const v = onLog(90, riverLane(50, 80, 1, 1.5));
    expect(v).not.toBeNull();
    expect(v).toBeCloseTo(1.5); // dir=1 × speed=1.5
  });

  it("returns a negative velocity for a left-moving log", () => {
    const v = onLog(90, riverLane(50, 80, -1, 1.5));
    expect(v).not.toBeNull();
    expect(v).toBeCloseTo(-1.5);
  });

  it("returns null when frog centre is in open water (between logs)", () => {
    // log only from x=50 to x=80 (len=30); frog at x=200 is in water
    expect(onLog(200, riverLane(50, 30))).toBeNull();
  });

  it("returns null for a non-river lane", () => {
    const safe: Lane = { kind: "safe", dir: 1, speed: 0, entities: [] };
    expect(onLog(90, safe)).toBeNull();
  });

  it("returns null for a road lane", () => {
    expect(onLog(90, roadLane(50, 80))).toBeNull();
  });

  it("returns null when frog centre is right at the log left edge (inset check)", () => {
    // frog at x=52, log starts at x=50 → x > e.x+2 → 52 > 52 is false
    expect(onLog(52, riverLane(50, 80))).toBeNull();
  });
});

// ── laneConfigForLevel ────────────────────────────────────────────────────────

describe("laneConfigForLevel", () => {
  it("returns exactly ROWS (13) lanes", () => {
    expect(laneConfigForLevel(1)).toHaveLength(ROWS);
  });

  it("first lane is the goal row", () => {
    expect(laneConfigForLevel(1)[0].kind).toBe("goal");
  });

  it("last lane is the safe start zone", () => {
    const lanes = laneConfigForLevel(1);
    expect(lanes[lanes.length - 1].kind).toBe("safe");
  });

  it("contains at least 3 road lanes", () => {
    const lanes = laneConfigForLevel(1);
    expect(lanes.filter((l) => l.kind === "road").length).toBeGreaterThanOrEqual(3);
  });

  it("contains at least 3 river lanes", () => {
    const lanes = laneConfigForLevel(1);
    expect(lanes.filter((l) => l.kind === "river").length).toBeGreaterThanOrEqual(3);
  });

  it("higher level speeds are faster than level 1", () => {
    const l1 = laneConfigForLevel(1);
    const l5 = laneConfigForLevel(5);
    const roadIdx = l1.findIndex((l) => l.kind === "road");
    expect(l5[roadIdx].speed).toBeGreaterThan(l1[roadIdx].speed);
    const riverIdx = l1.findIndex((l) => l.kind === "river");
    expect(l5[riverIdx].speed).toBeGreaterThan(l1[riverIdx].speed);
  });

  it("speed is capped (does not grow unboundedly)", () => {
    const l100 = laneConfigForLevel(100);
    const roadIdx = l100.findIndex((l) => l.kind === "road");
    // cap at 2.5× — even the fastest lane won't exceed ~4 px/tick at level 100
    expect(l100[roadIdx].speed).toBeLessThan(8);
  });
});

// ── GOAL_BAYS ─────────────────────────────────────────────────────────────────

describe("GOAL_BAYS", () => {
  it("has 5 bays", () => {
    expect(GOAL_BAYS).toHaveLength(5);
  });

  it("all bay columns are within the grid (0 – COLS-1)", () => {
    expect(GOAL_BAYS.every((c) => c >= 0 && c <= 9)).toBe(true);
  });

  it("bay columns are all even (separated by odd-column obstacles)", () => {
    expect(GOAL_BAYS.every((c) => c % 2 === 0)).toBe(true);
  });
});
