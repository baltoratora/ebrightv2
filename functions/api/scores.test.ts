import { describe, it, expect } from "vitest";
import { baseGame, known, orderSql } from "./scores";
import { GAME_META } from "../../lib/leaderboard";

describe("scores API game recognition", () => {
  it("accepts every game the client can submit (no client/server drift)", () => {
    // Regression: "bubblebobble" (Puzzle Bobble) existed client-side but was
    // missing server-side, so the API 400'd and high scores were silently lost.
    for (const game of Object.keys(GAME_META)) {
      expect(known(game), `server should know "${game}"`).toBe(true);
    }
  });

  it("recognises Puzzle Bobble specifically", () => {
    expect(known("bubblebobble")).toBe(true);
    expect(orderSql("bubblebobble")).toBe("DESC"); // higher score is better
  });

  it("strips difficulty suffixes when matching", () => {
    expect(baseGame("sudoku:hard")).toBe("sudoku");
    expect(known("sudoku:hard")).toBe(true);
    expect(orderSql("sudoku:hard")).toBe("ASC"); // faster time is better
  });

  it("rejects unknown games", () => {
    expect(known("definitely-not-a-game")).toBe(false);
  });
});
