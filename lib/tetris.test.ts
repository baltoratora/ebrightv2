import { describe, it, expect } from "vitest";
import {
  emptyGrid,
  rotateCW,
  collides,
  clearLines,
  newGame,
  hardDrop,
  COLS,
  ROWS,
  PIECES,
  type Grid,
} from "./tetris";

describe("rotateCW", () => {
  it("rotates the T piece 90°", () => {
    const t = PIECES.T.matrix;
    const r = rotateCW(t);
    // after CW the stem points right: column 1 fully set in rows 0..2
    expect(r[0][1]).toBe(1);
    expect(r[1][1]).toBe(1);
    expect(r[2][1]).toBe(1);
  });
});

describe("collides", () => {
  it("detects walls, floor and stacked cells", () => {
    const g = emptyGrid();
    expect(collides(g, PIECES.O.matrix, 0, -1)).toBe(true); // left wall
    expect(collides(g, PIECES.O.matrix, 0, COLS - 1)).toBe(true); // right wall
    expect(collides(g, PIECES.O.matrix, ROWS - 1, 0)).toBe(true); // floor
    g[2][0] = "X";
    expect(collides(g, PIECES.O.matrix, 1, 0)).toBe(true); // hits stacked cell
    expect(collides(g, PIECES.O.matrix, 0, 4)).toBe(false); // clear
  });
});

describe("clearLines", () => {
  it("removes full rows and counts them", () => {
    const g: Grid = emptyGrid();
    g[ROWS - 1] = Array<string>(COLS).fill("X");
    g[ROWS - 2] = Array<string>(COLS).fill("X");
    g[ROWS - 3][0] = "X"; // not full
    const { grid, cleared } = clearLines(g);
    expect(cleared).toBe(2);
    expect(grid).toHaveLength(ROWS);
    expect(grid[ROWS - 1].some((c) => c !== null)).toBe(true); // the partial row dropped down
    expect(grid[0].every((c) => c === null)).toBe(true); // empty rows added on top
  });
});

describe("newGame + hardDrop", () => {
  it("starts valid and locks a piece on hard drop", () => {
    const g = newGame();
    expect(g.over).toBe(false);
    expect(g.grid.flat().every((c) => c === null)).toBe(true);
    const after = hardDrop(g);
    // some cells are now filled (the dropped piece) and a new piece spawned
    expect(after.grid.flat().some((c) => c !== null)).toBe(true);
    expect(after.type).toBe(g.next);
  });
});
