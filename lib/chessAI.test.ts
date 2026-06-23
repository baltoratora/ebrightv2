import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { bestMove, evaluate } from "./chessAI";

describe("evaluate", () => {
  it("is 0 at the symmetric start", () => {
    expect(evaluate(new Chess())).toBe(0);
  });
  it("is positive when White has extra material", () => {
    expect(evaluate(new Chess("4k3/8/8/8/8/8/8/3QK3 w - - 0 1"))).toBeGreaterThan(0);
  });
});

describe("bestMove", () => {
  it("returns a legal move", () => {
    const g = new Chess();
    const m = bestMove(g, 2)!;
    expect(m).not.toBeNull();
    expect(g.moves({ verbose: true }).some((x) => x.from === m.from && x.to === m.to)).toBe(true);
  });

  it("grabs a hanging queen", () => {
    // white rook e2, black queen e5 (undefended), white to move -> Rxe5
    const g = new Chess("4k3/8/8/4q3/8/8/4R3/4K3 w - - 0 1");
    const m = bestMove(g, 2)!;
    expect(m.to).toBe("e5");
  });
});
