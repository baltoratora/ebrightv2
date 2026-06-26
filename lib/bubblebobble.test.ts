import { describe, it, expect } from "vitest";
import {
  findGroup, findFloating, placeBubble, placeBubbleEx,
  isDanger, isCleared, snapToGrid, bubbleX, bubbleY,
  advanceCeiling, gridFromLevel, LEVELS,
  BOMB, WILD, colsForRow,
  type Grid,
} from "./bubblebobble";

const R = "#ff4757" as const;
const B = "#1e90ff" as const;
const G = "#2ed573" as const;
const _ = null;
const X = BOMB;
const W = WILD;

function mkGrid(rows: (string | null)[][]): Grid {
  return rows.map((r) => r.map((c) => c as Grid[0][0]));
}

describe("findGroup", () => {
  it("finds a group of 3 same-color bubbles", () => {
    const grid = mkGrid([[R, R, R, _, _]]);
    const g = findGroup(grid, 0, 0);
    expect(g).toHaveLength(3);
  });

  it("returns single cell when no neighbors match", () => {
    const grid = mkGrid([[R, B, G, _, _]]);
    const g = findGroup(grid, 0, 0);
    expect(g).toHaveLength(1);
  });

  it("returns empty array for null cell", () => {
    const grid = mkGrid([[_, R, R]]);
    expect(findGroup(grid, 0, 0)).toHaveLength(0);
  });
});

describe("findGroup with WILD", () => {
  it("WILD in grid is included in an adjacent same-color group", () => {
    const grid = mkGrid([[R, W, R, _, _]]);
    // R(0) - WILD(1) - R(2): WILD bridges, so all 3 should be in group from R
    const g = findGroup(grid, 0, 0);
    expect(g).toHaveLength(3);
  });

  it("firing WILD groups all adjacent non-null bubbles", () => {
    const grid = mkGrid([[R, W, B, _, _]]);
    // Starting from WILD at col 1: color=WILD matches everything non-null
    const g = findGroup(grid, 0, 1);
    expect(g).toHaveLength(3);
  });

  it("WILD counts toward minimum of 3 for a pop", () => {
    const grid = mkGrid([[R, R, W, _, _]]);
    const g = findGroup(grid, 0, 0);
    expect(g).toHaveLength(3);
  });
});

describe("findFloating", () => {
  it("returns empty when all bubbles connect to row 0", () => {
    const grid = mkGrid([
      [R, R, _],
      [R, _, _],
    ]);
    expect(findFloating(grid)).toHaveLength(0);
  });

  it("finds isolated bubble not connected to ceiling", () => {
    const grid = mkGrid([
      [_, _, _],
      [R, _, _],
    ]);
    expect(findFloating(grid)).toHaveLength(1);
  });
});

describe("placeBubble", () => {
  it("pops a group of 3 and returns points > 0", () => {
    const grid = mkGrid([[R, R, _, _, _], [_, _, _, _, _]]);
    const pts = placeBubble(grid, 0, 2, R);
    expect(pts).toBeGreaterThan(0);
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
    expect(grid[0][2]).toBeNull();
  });

  it("does NOT pop a group of 2", () => {
    const grid = mkGrid([[R, R, B, _, _], [_, _, _, _, _]]);
    const pts = placeBubble(grid, 0, 3, R);
    expect(pts).toBe(0);
    expect(grid[0][0]).toBe(R);
  });

  it("removes floating bubbles after pop", () => {
    // Row 0: all null → row 1 bubbles float after row 0 is cleared
    const grid = mkGrid([
      [R, R, _, _, _],
      [B, B, B, _, _],
    ]);
    placeBubble(grid, 0, 2, R); // completes a 3-red group in row 0
    // Blues in row 1 should now be floating
    expect(grid[1][0]).toBeNull();
    expect(grid[1][1]).toBeNull();
    expect(grid[1][2]).toBeNull();
  });
});

describe("placeBubbleEx bomb explosion", () => {
  it("bomb group destroys neighbors outside the group", () => {
    // Row 0: X X _ B B B B B B B B  (11 cols)
    const row0 = [X, X, _, B, B, B, B, B, B, B, B];
    const grid = mkGrid([row0]);
    // Place a third bomb at (0,2) → group of 3 bombs → pop + explosion
    const result = placeBubbleEx(grid, 0, 2, X);
    expect(result.points).toBeGreaterThan(0);
    // B at (0,3) is a neighbor of bomb (0,2) and should be destroyed
    expect(grid[0][3]).toBeNull();
  });

  it("returns groupCells and floatCells", () => {
    const grid = mkGrid([[R, R, _, _, _], [_, _, _, _, _]]);
    const result = placeBubbleEx(grid, 0, 2, R);
    expect(result.groupCells.length).toBeGreaterThanOrEqual(3);
    expect(result.points).toBeGreaterThan(0);
  });

  it("returns zero points when group is smaller than 3", () => {
    const grid = mkGrid([[R, _, _, _, _]]);
    const result = placeBubbleEx(grid, 0, 1, R);
    expect(result.points).toBe(0);
    expect(result.groupCells).toHaveLength(0);
  });
});

describe("isDanger", () => {
  it("returns false when grid is clear below danger row", () => {
    const grid: Grid = Array.from({ length: 13 }, (_, r) =>
      Array(r % 2 === 0 ? 11 : 10).fill(null),
    );
    expect(isDanger(grid, 11)).toBe(false);
  });

  it("returns true when bubble is at or below danger row", () => {
    const grid: Grid = Array.from({ length: 13 }, (_, r) =>
      Array(r % 2 === 0 ? 11 : 10).fill(null),
    );
    grid[11][0] = R;
    expect(isDanger(grid, 11)).toBe(true);
  });
});

describe("isCleared", () => {
  it("returns true for empty grid", () => {
    const grid: Grid = Array.from({ length: 4 }, () => [null, null]);
    expect(isCleared(grid)).toBe(true);
  });

  it("returns false when any bubble exists", () => {
    const grid: Grid = [[null, null], [R, null]];
    expect(isCleared(grid)).toBe(false);
  });
});

describe("snapToGrid", () => {
  it("snaps to nearest anchorable empty cell", () => {
    const grid = mkGrid([[R, R, _, _, _, _, _, _, _, _, _]]);
    // pixel position near col 2 of row 0
    const px = bubbleX(0, 2);
    const py = bubbleY(0);
    const snap = snapToGrid(grid, px, py);
    expect(snap).toEqual([0, 2]);
  });
});

describe("advanceCeiling", () => {
  it("shifts row 0 content to row 1 and clears row 0", () => {
    const grid: Grid = Array.from({ length: 13 }, (_, r) =>
      Array(r % 2 === 0 ? 11 : 10).fill(null),
    );
    grid[0][0] = R;
    grid[0][1] = B;
    advanceCeiling(grid);
    expect(grid[0][0]).toBeNull(); // row 0 is now empty
    expect(grid[1][0]).toBe(R);   // R shifted down
    expect(grid[1][1]).toBe(B);   // B shifted down
  });

  it("preserves grid length", () => {
    const grid: Grid = Array.from({ length: 13 }, (_, r) =>
      Array(r % 2 === 0 ? 11 : 10).fill(null),
    );
    grid[0][3] = G;
    advanceCeiling(grid);
    expect(grid).toHaveLength(13);
  });
});

describe("gridFromLevel", () => {
  it("loads level 1 row 0 with correct colours", () => {
    const grid = gridFromLevel(LEVELS[0]);
    expect(grid[0][0]).toBe("#ff4757"); // 'r' = red
    expect(grid[0][5]).toBe("#1e90ff"); // 'b' = blue
  });

  it("has GRID_ROWS rows", () => {
    const grid = gridFromLevel(LEVELS[0]);
    expect(grid).toHaveLength(13);
  });

  it("rows below authored rows are null-filled", () => {
    // Level 1 has 4 authored rows; row 4 must be empty
    const grid = gridFromLevel(LEVELS[0]);
    expect(grid[4].every(c => c === null)).toBe(true);
  });

  it("each row has correct column count", () => {
    const grid = gridFromLevel(LEVELS[0]);
    for (let r = 0; r < 13; r++) {
      expect(grid[r]).toHaveLength(colsForRow(r));
    }
  });
});
