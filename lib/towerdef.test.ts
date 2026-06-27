import { describe, it, expect } from "vitest";
import {
  advanceEnemy,
  enemiesInRange,
  applyDamage,
  waveConfig,
  canPlaceTower,
  isPathCell,
  TOWER_DEFS,
  CELL,
  PATH_PX,
  type Enemy,
  type Tower,
} from "./towerdef";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 1,
    x: PATH_PX[0][0],
    y: PATH_PX[0][1],
    hp: 100,
    maxHp: 100,
    speed: 60,
    pathIndex: 1, // heading toward waypoint index 1
    reward: 10,
    dead: false,
    reachedEnd: false,
    ...overrides,
  };
}

function makeTower(overrides: Partial<Tower> = {}): Tower {
  return {
    id: 1,
    kind: "basic",
    col: 8,
    row: 4,
    lastFired: 0,
    ...overrides,
  };
}

// ─── advanceEnemy ─────────────────────────────────────────────────────────────

describe("advanceEnemy — path movement", () => {
  it("moves the enemy toward the next waypoint", () => {
    const e = makeEnemy({ x: PATH_PX[0][0], y: PATH_PX[0][1], pathIndex: 1 });
    const [tx, ty] = PATH_PX[1];
    const advanced = advanceEnemy(e, 0.1); // 0.1 s × 60 px/s = 6 px
    // Should be closer to waypoint 1
    const dxBefore = tx - e.x;
    const dyBefore = ty - e.y;
    const distBefore = Math.sqrt(dxBefore * dxBefore + dyBefore * dyBefore);
    const dxAfter = tx - advanced.x;
    const dyAfter = ty - advanced.y;
    const distAfter = Math.sqrt(dxAfter * dxAfter + dyAfter * dyAfter);
    expect(distAfter).toBeLessThan(distBefore);
  });

  it("snaps to waypoint and advances pathIndex when close enough", () => {
    // Place enemy very close to waypoint 1; one step should pass it
    const [tx, ty] = PATH_PX[1];
    const e = makeEnemy({ x: tx - 2, y: ty, pathIndex: 1 });
    const advanced = advanceEnemy(e, 0.1); // 6 px > 2 px gap
    expect(advanced.pathIndex).toBe(2);
  });

  it("does not mutate the original enemy", () => {
    const e = makeEnemy();
    const orig = { ...e };
    advanceEnemy(e, 0.5);
    expect(e.x).toBe(orig.x);
    expect(e.pathIndex).toBe(orig.pathIndex);
  });

  it("returns enemy unchanged when already dead", () => {
    const e = makeEnemy({ dead: true });
    expect(advanceEnemy(e, 1)).toBe(e);
  });

  it("returns enemy unchanged when already reached end", () => {
    const e = makeEnemy({ reachedEnd: true });
    expect(advanceEnemy(e, 1)).toBe(e);
  });

  it("sets reachedEnd when pathIndex exceeds all waypoints", () => {
    // Enemy is at the last waypoint; next step overshoots
    const lastIdx = PATH_PX.length - 1;
    const [lx, ly] = PATH_PX[lastIdx];
    // At last waypoint, heading past it (pathIndex = lastIdx + 1 would be >= length)
    // Simulate: enemy is at second-to-last waypoint and is fast enough to run off
    const e = makeEnemy({
      x: PATH_PX[lastIdx - 1][0],
      y: PATH_PX[lastIdx - 1][1],
      pathIndex: lastIdx,
      speed: 9999, // very fast — reaches end in 1 frame
    });
    const advanced = advanceEnemy(e, 1);
    expect(advanced.reachedEnd).toBe(true);
    // Check that position ended at last waypoint after overshoot processing
    expect(advanced.x).toBe(lx);
    expect(advanced.y).toBe(ly);
  });
});

// ─── enemiesInRange ───────────────────────────────────────────────────────────

describe("enemiesInRange — tower targeting", () => {
  const tower = makeTower({ kind: "basic", col: 8, row: 4 }); // basic range = 120px
  const towerPx = { x: tower.col * CELL + CELL / 2, y: tower.row * CELL + CELL / 2 };

  it("includes an enemy within range", () => {
    // Place enemy exactly 50px away (well within 120px range)
    const e = makeEnemy({ x: towerPx.x + 50, y: towerPx.y });
    expect(enemiesInRange(tower, [e])).toHaveLength(1);
  });

  it("excludes an enemy beyond range", () => {
    // Place enemy 200px away (beyond 120px range)
    const e = makeEnemy({ x: towerPx.x + 200, y: towerPx.y });
    expect(enemiesInRange(tower, [e])).toHaveLength(0);
  });

  it("excludes dead enemies", () => {
    const e = makeEnemy({ x: towerPx.x + 50, y: towerPx.y, dead: true });
    expect(enemiesInRange(tower, [e])).toHaveLength(0);
  });

  it("excludes enemies that have reached the end", () => {
    const e = makeEnemy({ x: towerPx.x + 50, y: towerPx.y, reachedEnd: true });
    expect(enemiesInRange(tower, [e])).toHaveLength(0);
  });

  it("returns multiple enemies when several are in range", () => {
    const e1 = makeEnemy({ id: 1, x: towerPx.x + 30, y: towerPx.y });
    const e2 = makeEnemy({ id: 2, x: towerPx.x - 40, y: towerPx.y });
    expect(enemiesInRange(tower, [e1, e2])).toHaveLength(2);
  });

  it("sniper tower has longer range than basic tower", () => {
    const sniper = makeTower({ kind: "sniper", col: 8, row: 4 });
    // 150px away — in sniper range (200) but not basic range (120)
    const e = makeEnemy({ x: towerPx.x + 150, y: towerPx.y });
    expect(enemiesInRange(sniper, [e])).toHaveLength(1);
    expect(enemiesInRange(tower, [e])).toHaveLength(0);
  });
});

// ─── applyDamage ─────────────────────────────────────────────────────────────

describe("applyDamage", () => {
  it("reduces enemy hp by the damage amount", () => {
    const e = makeEnemy({ hp: 100 });
    const result = applyDamage(e, 30);
    expect(result.hp).toBe(70);
  });

  it("sets dead = true when hp reaches 0", () => {
    const e = makeEnemy({ hp: 30 });
    const result = applyDamage(e, 30);
    expect(result.dead).toBe(true);
    expect(result.hp).toBe(0);
  });

  it("sets dead = true when damage exceeds hp (clamped to 0)", () => {
    const e = makeEnemy({ hp: 10 });
    const result = applyDamage(e, 50);
    expect(result.dead).toBe(true);
    expect(result.hp).toBe(0);
  });

  it("does not set dead when hp still above 0", () => {
    const e = makeEnemy({ hp: 100 });
    const result = applyDamage(e, 50);
    expect(result.dead).toBe(false);
    expect(result.hp).toBe(50);
  });

  it("preserves reward on the enemy (caller awards gold on kill)", () => {
    const e = makeEnemy({ hp: 10, reward: 25 });
    const result = applyDamage(e, 10);
    expect(result.reward).toBe(25);
  });

  it("does not mutate the original enemy", () => {
    const e = makeEnemy({ hp: 80 });
    applyDamage(e, 20);
    expect(e.hp).toBe(80);
  });
});

// ─── waveConfig ──────────────────────────────────────────────────────────────

describe("waveConfig — wave scaling", () => {
  it("wave 1 has the minimum enemy count", () => {
    const cfg = waveConfig(1);
    expect(cfg.count).toBe(5);
  });

  it("higher waves have more enemies", () => {
    expect(waveConfig(5).count).toBeGreaterThan(waveConfig(1).count);
    expect(waveConfig(10).count).toBeGreaterThan(waveConfig(5).count);
  });

  it("wave 1 hp is the base hp", () => {
    expect(waveConfig(1).hp).toBe(50);
  });

  it("higher waves have more hp", () => {
    expect(waveConfig(5).hp).toBeGreaterThan(waveConfig(1).hp);
  });

  it("speed scales with wave", () => {
    expect(waveConfig(5).speed).toBeGreaterThan(waveConfig(1).speed);
  });

  it("wave 3 has 5 + 2*3 = 11 enemies", () => {
    expect(waveConfig(3).count).toBe(5 + 2 * 3);
  });
});

// ─── canPlaceTower ───────────────────────────────────────────────────────────

describe("canPlaceTower", () => {
  const baseState = {
    towers: [] as Tower[],
    gold: 200,
    selectedTowerKind: "basic" as const,
  };

  it("allows placement on a valid buildable cell", () => {
    // col=8, row=4 is not on the path
    expect(canPlaceTower(baseState, 8, 4)).toBe(true);
  });

  it("rejects placement on a path cell", () => {
    // PATH_WAYPOINTS includes [0,2] — col 0-5, row 2
    expect(canPlaceTower(baseState, 3, 2)).toBe(false);
  });

  it("rejects placement at the path entry (col=0, row=2)", () => {
    expect(canPlaceTower(baseState, 0, 2)).toBe(false);
  });

  it("rejects placement when a tower already occupies the cell", () => {
    const occupied: Tower = { id: 1, kind: "basic", col: 8, row: 4, lastFired: 0 };
    const state = { ...baseState, towers: [occupied] };
    expect(canPlaceTower(state, 8, 4)).toBe(false);
  });

  it("rejects placement when gold is insufficient", () => {
    const poorState = { ...baseState, gold: 10 }; // basic costs 50
    expect(canPlaceTower(poorState, 8, 4)).toBe(false);
  });

  it("allows placement when gold exactly equals tower cost", () => {
    const exactState = { ...baseState, gold: TOWER_DEFS.basic.cost };
    expect(canPlaceTower(exactState, 8, 4)).toBe(true);
  });

  it("rejects placement outside the grid", () => {
    expect(canPlaceTower(baseState, -1, 4)).toBe(false);
    expect(canPlaceTower(baseState, 18, 4)).toBe(false);
    expect(canPlaceTower(baseState, 4, -1)).toBe(false);
    expect(canPlaceTower(baseState, 4, 14)).toBe(false);
  });
});

// ─── isPathCell ──────────────────────────────────────────────────────────────

describe("isPathCell", () => {
  it("returns true for cells on the horizontal path segment", () => {
    // PATH: row 2, col 0-5
    for (let c = 0; c <= 5; c++) {
      expect(isPathCell(c, 2)).toBe(true);
    }
  });

  it("returns true for cells on the vertical path segment", () => {
    // PATH: col 5, row 2-7
    for (let r = 2; r <= 7; r++) {
      expect(isPathCell(5, r)).toBe(true);
    }
  });

  it("returns false for cells clearly off the path", () => {
    expect(isPathCell(8, 4)).toBe(false);
    expect(isPathCell(0, 0)).toBe(false);
    expect(isPathCell(17, 0)).toBe(false);
  });
});
