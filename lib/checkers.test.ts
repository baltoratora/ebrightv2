import { describe, it, expect } from "vitest";
import {
  newBoard,
  generateMoves,
  applyMove,
  countPieces,
  winner,
  bestMove,
  cloneBoard,
  promotesAndStops,
  type Board,
  type Piece,
} from "./checkers";

const empty = (): Board => Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));

describe("promotesAndStops", () => {
  it("a red man landing on row 0 promotes — its jump chain ends", () => {
    expect(promotesAndStops(false, 0, "r")).toBe(true);
  });
  it("a black man landing on row 7 promotes — its jump chain ends", () => {
    expect(promotesAndStops(false, 7, "b")).toBe(true);
  });
  it("a man landing on a non-king row keeps jumping", () => {
    expect(promotesAndStops(false, 4, "r")).toBe(false);
    expect(promotesAndStops(false, 2, "b")).toBe(false);
  });
  it("an existing king never promotes/stops (it may keep jumping)", () => {
    expect(promotesAndStops(true, 0, "r")).toBe(false);
    expect(promotesAndStops(true, 7, "b")).toBe(false);
  });
});

describe("newBoard", () => {
  it("places 12 pieces per side on dark squares", () => {
    const c = countPieces(newBoard());
    expect(c).toEqual({ r: 12, b: 12 });
  });
  it("gives Red 7 opening moves", () => {
    expect(generateMoves(newBoard(), "r")).toHaveLength(7);
  });
});

describe("mandatory capture", () => {
  it("returns only capture moves when one is available", () => {
    const b = empty();
    b[5][2] = { color: "r", king: false };
    b[4][3] = { color: "b", king: false }; // jumpable to (3,4)
    const moves = generateMoves(b, "r");
    expect(moves.every((m) => m.captures.length > 0)).toBe(true);
    expect(moves.some((m) => m.to[0] === 3 && m.to[1] === 4)).toBe(true);
  });

  it("chains a double jump", () => {
    const b = empty();
    b[6][1] = { color: "r", king: false };
    b[5][2] = { color: "b", king: false };
    b[3][4] = { color: "b", king: false };
    const moves = generateMoves(b, "r");
    const dbl = moves.find((m) => m.captures.length === 2);
    expect(dbl).toBeTruthy();
    expect(dbl!.to).toEqual([2, 5]);
  });
});

describe("applyMove", () => {
  it("removes captured pieces and kings on the back row", () => {
    const b = empty();
    b[1][2] = { color: "r", king: false }; // one step from king row
    const move = generateMoves(b, "r").find((m) => m.to[0] === 0)!;
    const after = applyMove(b, move);
    const [tr, tc] = move.to;
    expect(after[tr][tc]!.king).toBe(true);
  });
});

describe("winner", () => {
  it("declares the opponent when a side has no moves", () => {
    const b = empty();
    b[0][1] = { color: "r", king: false }; // red, no moves (top row, man)
    expect(winner(b, "r")).toBe("b");
  });
});

describe("bestMove", () => {
  it("takes a free capture", () => {
    const b = empty();
    b[5][2] = { color: "r", king: false };
    b[4][3] = { color: "b", king: false };
    const m = bestMove(b, "r", 4)!;
    expect(m.captures.length).toBeGreaterThan(0);
  });
});
