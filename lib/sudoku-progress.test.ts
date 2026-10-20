import { describe, it, expect } from "vitest";
import { readSudokuProgress, pruneNotes, type Notes } from "./sudoku-progress";
import { generateSolved, cloneBoard } from "./sudoku";

describe("Sudoku saved progress", () => {
  it("restores a non-Easy difficulty without changing the puzzle", () => {
    const solution = generateSolved();
    const puzzle = cloneBoard(solution); puzzle[0][0] = 0;
    const save = { puzzle, solution, board: cloneBoard(puzzle), notes: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])), difficulty: "master", seconds: 123, status: "active", history: [] };
    expect(readSudokuProgress(save)?.difficulty).toBe("master");
    expect(readSudokuProgress(save)?.board).toEqual(puzzle);
    const changedClue = cloneBoard(puzzle); changedClue[0][1] = 0;
    expect(readSudokuProgress({ ...save, board: changedClue })).toBeNull();
    expect(readSudokuProgress({ ...save, solution: puzzle })).toBeNull();
    expect(readSudokuProgress({ ...save, notes: [[]] })).toBeNull();
    expect(readSudokuProgress({ ...save, seconds: -1 })).toBeNull();
  });
  it("removes a placed digit from peers but preserves unrelated notes and input", () => {
    const notes: Notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [2, 5]));
    const result = pruneNotes(notes, 0, 0, 5);
    expect(result[0][0]).toEqual([]);
    expect(result[0][8]).toEqual([2]);
    expect(result[8][0]).toEqual([2]);
    expect(result[2][2]).toEqual([2]);
    expect(result[4][4]).toEqual([2, 5]);
    expect(notes[0][0]).toEqual([2, 5]);
    expect(pruneNotes(notes, 0, 0, 0)[0][1]).toEqual([2, 5]);
  });
});
