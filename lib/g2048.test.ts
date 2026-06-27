import { describe, it, expect } from "vitest";
import { slide, canMove, isWin, spawnTile, newGame } from "./g2048";

describe("slide left — basics", () => {
  it("merges two equal tiles, reports gained", () => {
    const grid = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const { grid: r, moved, gained } = slide(grid, "left");
    expect(r[0]).toEqual([4, 0, 0, 0]);
    expect(gained).toBe(4);
    expect(moved).toBe(true);
  });

  it("no double-merge in one move: [2,2,2,2] → [4,4,0,0]", () => {
    const grid = [[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const { grid: r, gained } = slide(grid, "left");
    expect(r[0]).toEqual([4, 4, 0, 0]);
    expect(gained).toBe(8);
  });

  it("returns moved:false when nothing changes", () => {
    const grid = [[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const { moved, gained } = slide(grid, "left");
    expect(moved).toBe(false);
    expect(gained).toBe(0);
  });
});

describe("slide right", () => {
  it("slides tiles to the right", () => {
    const grid = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const { grid: r, gained } = slide(grid, "right");
    expect(r[0]).toEqual([0, 0, 0, 4]);
    expect(gained).toBe(4);
  });
});

describe("slide up / down", () => {
  it("merges up correctly", () => {
    const grid = [[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const { grid: r, gained } = slide(grid, "up");
    expect(r[0][0]).toBe(4);
    expect(r[1][0]).toBe(0);
    expect(gained).toBe(4);
  });

  it("merges down correctly", () => {
    const grid = [[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const { grid: r, gained } = slide(grid, "down");
    expect(r[3][0]).toBe(4);
    expect(r[2][0]).toBe(0);
    expect(gained).toBe(4);
  });
});

describe("canMove", () => {
  it("returns false when board is full with no merges", () => {
    const grid = [
      [2,  4,  2,  4],
      [4,  2,  4,  2],
      [2,  4,  2,  4],
      [4,  2,  4,  2],
    ];
    expect(canMove(grid)).toBe(false);
  });

  it("returns true when an empty cell exists", () => {
    const grid = [[2, 4, 0, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];
    expect(canMove(grid)).toBe(true);
  });

  it("returns true when adjacent equal tiles exist", () => {
    const grid = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4],
    ];
    expect(canMove(grid)).toBe(true);
  });
});

describe("isWin", () => {
  it("returns false without a 2048 tile", () => {
    const grid = [[1024, 512, 256, 128], [64, 32, 16, 8], [4, 2, 4, 2], [2, 4, 2, 4]];
    expect(isWin(grid)).toBe(false);
  });

  it("returns true when 2048 tile is present", () => {
    const grid = [[2048, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    expect(isWin(grid)).toBe(true);
  });
});

describe("spawnTile", () => {
  it("places a tile using deterministic rng", () => {
    let call = 0;
    // first call = 0 → index 0 → position [0][0]; second call = 0.5 → value 2
    const rng = () => (call++ === 0 ? 0 : 0.5);
    const grid = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const result = spawnTile(grid, rng);
    expect(result[0][0]).toBe(2);
  });

  it("spawns a 4 when rng value >= 0.9 on the second call", () => {
    let call = 0;
    const rng = () => (call++ === 0 ? 0 : 0.95);
    const grid = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const result = spawnTile(grid, rng);
    expect(result[0][0]).toBe(4);
  });
});

describe("newGame", () => {
  it("returns a grid with exactly 2 tiles", () => {
    let i = 0;
    const vals = [0, 0.5, 0, 0.5];
    const rng = () => vals[i++] ?? 0;
    const grid = newGame(rng);
    const count = grid.flat().filter(v => v !== 0).length;
    expect(count).toBe(2);
  });
});
