import { describe, it, expect } from "vitest";
import {
  createBoard,
  neighbors,
  computeAdjacency,
  placeMines,
  reveal,
  toggleFlag,
  isWin,
  countFlags,
  revealAllMines,
  type Board,
} from "./minesweeper";

function setMines(board: Board, coords: [number, number][]): Board {
  for (const [r, c] of coords) board[r][c].mine = true;
  computeAdjacency(board);
  return board;
}

describe("neighbors", () => {
  it("returns 3 for a corner, 8 for an interior cell", () => {
    expect(neighbors(0, 0, 9, 9)).toHaveLength(3);
    expect(neighbors(4, 4, 9, 9)).toHaveLength(8);
    expect(neighbors(0, 4, 9, 9)).toHaveLength(5); // edge
  });
});

describe("computeAdjacency", () => {
  it("counts neighboring mines", () => {
    const b = setMines(createBoard(3, 3), [[0, 0], [2, 2]]);
    expect(b[1][1].adjacent).toBe(2); // touches both mines
    expect(b[0][1].adjacent).toBe(1);
    expect(b[2][0].adjacent).toBe(0); // touches neither
  });
});

describe("placeMines (first-click-safe)", () => {
  it("places exactly N mines, none on the safe cell or its neighbors", () => {
    const b = placeMines(createBoard(9, 9), 10, 4, 4);
    let mines = 0;
    for (const row of b) for (const c of row) if (c.mine) mines++;
    expect(mines).toBe(10);
    expect(b[4][4].mine).toBe(false);
    for (const [nr, nc] of neighbors(4, 4, 9, 9)) {
      expect(b[nr][nc].mine).toBe(false);
    }
  });
});

describe("reveal", () => {
  it("hits a mine", () => {
    const b = setMines(createBoard(3, 3), [[1, 1]]);
    const { hitMine } = reveal(b, 1, 1);
    expect(hitMine).toBe(true);
  });

  it("flood-fills an empty region but stops at numbered cells", () => {
    // single mine at corner -> revealing the far corner opens the whole board
    const b = setMines(createBoard(3, 3), [[0, 0]]);
    const { board, hitMine } = reveal(b, 2, 2);
    expect(hitMine).toBe(false);
    // every non-mine cell revealed
    let hidden = 0;
    for (const row of board) for (const c of row) if (c.state === "hidden") hidden++;
    expect(hidden).toBe(1); // only the mine stays hidden
  });

  it("reveals just one cell when it has an adjacent count", () => {
    const b = setMines(createBoard(3, 3), [[0, 0]]);
    const { board } = reveal(b, 1, 1); // adjacent === 1
    expect(board[1][1].state).toBe("revealed");
    expect(board[2][2].state).toBe("hidden");
  });
});

describe("toggleFlag", () => {
  it("flags and unflags a hidden cell", () => {
    let b = createBoard(3, 3);
    b = toggleFlag(b, 0, 0);
    expect(b[0][0].state).toBe("flagged");
    expect(countFlags(b)).toBe(1);
    b = toggleFlag(b, 0, 0);
    expect(b[0][0].state).toBe("hidden");
  });
});

describe("isWin", () => {
  it("is true once all non-mine cells are revealed", () => {
    const b = setMines(createBoard(3, 3), [[0, 0]]);
    expect(isWin(b)).toBe(false);
    const { board } = reveal(b, 2, 2);
    expect(isWin(board)).toBe(true);
  });
});

describe("revealAllMines", () => {
  it("reveals every mine", () => {
    const b = setMines(createBoard(3, 3), [[0, 0], [2, 2]]);
    const out = revealAllMines(b);
    expect(out[0][0].state).toBe("revealed");
    expect(out[2][2].state).toBe("revealed");
  });
});
