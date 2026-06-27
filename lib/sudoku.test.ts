import { describe, it, expect } from "vitest";
import {
  isValidPlacement,
  solve,
  countSolutions,
  generatePuzzle,
  generateSolved,
  isComplete,
  cloneBoard,
  computeCandidates,
  type Board,
} from "./sudoku";

// A known solvable puzzle (0 = empty) and basis for placement checks.
const PUZZLE: Board = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

describe("isValidPlacement", () => {
  it("rejects a number already in the row", () => {
    expect(isValidPlacement(PUZZLE, 0, 2, 5)).toBe(false); // 5 in row 0
  });
  it("rejects a number already in the column", () => {
    expect(isValidPlacement(PUZZLE, 2, 0, 6)).toBe(false); // 6 in col 0
  });
  it("rejects a number already in the 3x3 box", () => {
    expect(isValidPlacement(PUZZLE, 1, 1, 8)).toBe(false); // 8 in top-left box
  });
  it("accepts a legal placement", () => {
    expect(isValidPlacement(PUZZLE, 0, 2, 4)).toBe(true);
  });
});

describe("solve", () => {
  it("solves a valid puzzle into a complete board", () => {
    const board = cloneBoard(PUZZLE);
    expect(solve(board)).toBe(true);
    expect(isComplete(board)).toBe(true);
    // Original clues must be preserved.
    expect(board[0][0]).toBe(5);
    expect(board[0][4]).toBe(7);
  });
});

describe("countSolutions", () => {
  it("finds exactly one solution for a proper puzzle", () => {
    expect(countSolutions(cloneBoard(PUZZLE), 2)).toBe(1);
  });
  it("finds multiple for an under-constrained board", () => {
    const sparse = cloneBoard(PUZZLE);
    sparse[0][0] = 0;
    sparse[0][1] = 0;
    sparse[1][0] = 0;
    expect(countSolutions(sparse, 2)).toBeGreaterThan(1);
  });
});

describe("generateSolved", () => {
  it("produces a complete, valid board", () => {
    expect(isComplete(generateSolved())).toBe(true);
  });
});

describe("generatePuzzle", () => {
  it("returns a uniquely-solvable puzzle matching its solution", () => {
    const { puzzle, solution } = generatePuzzle("medium");
    expect(isComplete(solution)).toBe(true);
    expect(countSolutions(cloneBoard(puzzle), 2)).toBe(1);
    // Every clue in the puzzle must agree with the solution.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c]);
      }
    }
  });

  it("leaves more clues for easy than hard", () => {
    const count = (b: Board) => b.flat().filter((n) => n !== 0).length;
    expect(count(generatePuzzle("easy").puzzle)).toBeGreaterThan(
      count(generatePuzzle("hard").puzzle),
    );
  });
});

describe("computeCandidates", () => {
  it("returns an empty array for filled cells", () => {
    const board = cloneBoard(PUZZLE);
    solve(board);
    const cands = computeCandidates(board);
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        expect(cands[r][c]).toEqual([]);
  });

  it("returns only valid candidates for empty cells", () => {
    const cands = computeCandidates(PUZZLE);
    // Every candidate in an empty cell must be a valid placement.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (PUZZLE[r][c] !== 0) continue;
        for (const n of cands[r][c]) {
          expect(isValidPlacement(PUZZLE, r, c, n)).toBe(true);
        }
      }
    }
  });

  it("does not miss valid candidates for empty cells", () => {
    const cands = computeCandidates(PUZZLE);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (PUZZLE[r][c] !== 0) continue;
        // Every number 1-9 that is a valid placement must appear in candidates.
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(PUZZLE, r, c, n)) {
            expect(cands[r][c]).toContain(n);
          }
        }
      }
    }
  });

  it("candidates are sorted in ascending order", () => {
    const cands = computeCandidates(PUZZLE);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = cands[r][c];
        for (let i = 1; i < cell.length; i++) {
          expect(cell[i]).toBeGreaterThan(cell[i - 1]);
        }
      }
    }
  });
});
