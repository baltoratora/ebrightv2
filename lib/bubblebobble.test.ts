import { describe, it, expect } from "vitest";
import {
  findGroup, findFloating, placeBubble, isDanger, isCleared,
  snapToGrid, bubbleX, bubbleY,
  type Grid,
} from "./bubblebobble";

const R = "#ff4757" as const;
const B = "#1e90ff" as const;
const G = "#2ed573" as const;
const _ = null;

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
