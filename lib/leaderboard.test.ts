import { describe, it, expect } from "vitest";
import { qualifies, fmtValue, metaFor, type Entry } from "./leaderboard";

const full = (vals: number[]): Entry[] => vals.map((v, i) => ({ name: `P${i}`, value: v }));

describe("qualifies", () => {
  it("always qualifies with fewer than 10 entries", () => {
    expect(qualifies(full([5, 4, 3]), 1, "desc")).toBe(true);
  });
  it("desc: beats the worst of a full board", () => {
    const board = full([100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
    expect(qualifies(board, 15, "desc")).toBe(true); // > 10
    expect(qualifies(board, 5, "desc")).toBe(false); // < 10
  });
  it("asc: lower than the worst (largest) of a full board", () => {
    const board = full([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(qualifies(board, 95, "asc")).toBe(true); // < 100
    expect(qualifies(board, 120, "asc")).toBe(false); // > 100
  });
});

describe("fmtValue", () => {
  it("formats time as m:ss", () => {
    expect(fmtValue("sudoku:easy", 83)).toBe("1:23");
    expect(fmtValue("sudoku:hard", 9)).toBe("0:09");
  });
  it("formats score/guesses as a plain number", () => {
    expect(fmtValue("tetris", 4200)).toBe("4200");
    expect(fmtValue("wordle", 3)).toBe("3");
  });
});

describe("metaFor", () => {
  it("resolves base game from a difficulty key", () => {
    expect(metaFor("sudoku:grandmaster").unit).toBe("time");
    expect(metaFor("tetris").dir).toBe("desc");
  });
});
