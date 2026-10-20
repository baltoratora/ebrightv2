import { describe, expect, it } from "vitest";
import { newArena, blastCells, stepArena, dangerTimes, key, COLS, ROWS, STEP_MS, FIRE_MS, ROUND_MS, type Arena, type Bomb } from "./blast-arena";

function openArena(): Arena {
  const s = newArena(42);
  s.tiles = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? "wall" : "floor"));
  s.hidden = {}; s.items = {};
  s.actors.slice(1).forEach((p) => { p.moveAt = Infinity; });
  return s;
}
const bomb = (id: number, x: number, y: number, range = 2, at = STEP_MS): Bomb => ({ id, owner: 0, x, y, range, at });
function advance(s: Arena, n: number): Arena { for (let i = 0; i < n; i++) s = stepArena(s); return s; }

describe("Blast Arena", () => {
  it("generates deterministic maps with protected spawns and an escape path", () => {
    expect(newArena(29)).toEqual(newArena(29));
    expect(newArena(29).tiles).not.toEqual(newArena(30).tiles);
    for (let seed = 0; seed < 30; seed++) {
      const s = newArena(seed);
      expect(s.actors.every((p) => s.tiles[p.y][p.x] === "floor")).toBe(true);
      expect(s.tiles[1][4]).toBe("floor");
      expect(s.tiles[1][8]).toBe("floor");
      expect(s.tiles[0].every((t) => t === "wall")).toBe(true);
    }
  });
  it("stops at walls and the first crate without burning through", () => {
    const s = openArena(); s.tiles[3][5] = "crate"; s.tiles[1][3] = "wall";
    const cells = blastCells(s.tiles, { x: 3, y: 3, range: 5 }).map((p) => key(p.x, p.y));
    expect(cells).toContain("5,3"); expect(cells).not.toContain("6,3"); expect(cells).not.toContain("3,1"); expect(cells).toContain("3,2");
  });
  it("lets the owner leave a bomb, blocks re-entry, and enforces capacity", () => {
    const s = openArena(); const next = stepArena(s, { bomb: true, direction: "right" });
    expect(next.actors[0].x).toBe(2); expect(next.bombs).toHaveLength(1);
    const later = stepArena(stepArena(next), { bomb: true, direction: "left" });
    expect(later.actors[0].x).toBe(2); expect(later.bombs).toHaveLength(1);
    expect(s.actors[0].x).toBe(1); expect(s.bombs).toHaveLength(0);
  });
  it("chain-detonates bombs early and predicts the shortened fuse", () => {
    const s = openArena(); s.bombs = [bomb(0, 4, 3), bomb(1, 6, 3, 3, 2000)];
    expect(dangerTimes(s).get("8,3")).toBe(STEP_MS);
    const next = stepArena(s);
    expect(next.bombs).toHaveLength(0); expect(next.flames.some((f) => f.x === 8 && f.y === 3)).toBe(true);
  });
  it("uses intact crate barriers for all simultaneous explosions and reveals loot", () => {
    const s = openArena(); s.tiles[3][5] = "crate"; s.hidden["5,3"] = "capacity";
    s.bombs = [bomb(0, 4, 3, 5), bomb(1, 3, 3, 5)];
    const next = stepArena(s);
    expect(next.tiles[3][5]).toBe("floor"); expect(next.items["5,3"]).toBe("capacity");
    expect(next.flames.some((f) => f.x === 6 && f.y === 3)).toBe(false);
    expect(next.crates).toBe(1);
  });
  it("keeps fire hazardous after the first explosion, then expires it", () => {
    const s = openArena(); s.bombs = [bomb(0, 4, 3)];
    const next = stepArena(s); next.actors[0].x = 4; next.actors[0].y = 3;
    expect(stepArena(next, { direction: "left" }).actors[0].alive).toBe(false);
    const expired = advance(stepArena(s), FIRE_MS / STEP_MS);
    expect(expired.flames).toHaveLength(0);
  });
  it("collects capped upgrades and cannot walk through crates", () => {
    const s = openArena(); s.items["2,1"] = "capacity"; s.actors[0].capacity = 4;
    const next = stepArena(s, { direction: "right" }); expect(next.actors[0].capacity).toBe(4); expect(next.items["2,1"]).toBeUndefined();
    s.tiles[1][2] = "crate"; expect(stepArena(s, { direction: "right" }).actors[0].x).toBe(1);
  });
  it("resolves simultaneous elimination as a draw, loss and sole-survivor wins", () => {
    const s = openArena(); s.actors.slice(1).forEach((p) => { p.alive = false; });
    expect(stepArena(s).status).toBe("won");
    s.bombs = [bomb(0, 1, 1)]; expect(stepArena(s).status).toBe("draw");
    s.actors[1].alive = true; expect(stepArena(s).status).toBe("lost");
    const time = openArena(); time.time = ROUND_MS - STEP_MS; expect(stepArena(time).status).toBe("draw");
  });
  it("is deterministic across seeded bot runs, without mutating previous state", () => {
    for (const seed of [1, 12, 49]) {
      const initial = newArena(seed); const frozen = structuredClone(initial);
      const a = advance(initial, 400); const b = advance(newArena(seed), 400);
      expect(a).toEqual(b); expect(initial).toEqual(frozen);
      expect(a.actors.every((p) => a.tiles[p.y][p.x] === "floor")).toBe(true);
      expect(a.bombs.every((p) => a.tiles[p.y][p.x] === "floor")).toBe(true);
    }
  });
  it("leaves terminal states unchanged", () => { const s = openArena(); s.status = "won"; expect(stepArena(s)).toBe(s); });
});
