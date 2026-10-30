import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { undoBotTurn, chessPieceIds } from "./chess-session";

describe("Chess bot undo", () => {
  it("takes back an unanswered human move", () => {
    const game = new Chess(); const start = game.fen();
    game.move("e4");
    expect(undoBotTurn(game).map((m) => m.san)).toEqual(["e4"]);
    expect(game.fen()).toBe(start);
  });
  it("takes back a bot reply and the human move, preserving earlier history", () => {
    const game = new Chess(); game.move("e4"); game.move("e5");
    const before = game.fen(); game.move("Nf3"); game.move("Nc6");
    expect(undoBotTurn(game).map((m) => m.san)).toEqual(["Nc6", "Nf3"]);
    expect(game.fen()).toBe(before);
    expect(game.history()).toEqual(["e4", "e5"]);
  });
  it("works after checkmate and safely does nothing on an empty history", () => {
    const game = new Chess();
    expect(undoBotTurn(game)).toEqual([]);
    ["f3", "e5", "g4", "Qh4#"].forEach((m) => game.move(m));
    undoBotTurn(game);
    expect(game.isGameOver()).toBe(false);
    expect(game.turn()).toBe("w");
    expect(game.history()).toEqual(["f3", "e5"]);
  });
});

describe("Chess animation identities", () => {
  it("preserves moving identities and restores captures on undo", () => {
    const game = new Chess(); const start = chessPieceIds(game);
    ["e4", "d5", "exd5"].forEach((m) => game.move(m));
    expect(chessPieceIds(game).d5).toBe(start.e2);
    expect(Object.values(chessPieceIds(game))).not.toContain(start.d7);
    game.undo();
    expect(chessPieceIds(game).d5).toBe(start.d7);
    expect(chessPieceIds(game).e4).toBe(start.e2);
  });
  it("moves king and rook identities when castling", () => {
    const game = new Chess("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const start = chessPieceIds(game); game.move("O-O");
    expect(chessPieceIds(game).g1).toBe(start.e1);
    expect(chessPieceIds(game).f1).toBe(start.h1);
    expect(chessPieceIds(game).h1).toBeUndefined();
  });
  it("removes an en passant victim and keeps a promoted pawn's identity", () => {
    const ep = new Chess(); const initial = chessPieceIds(ep);
    ["e4", "a6", "e5", "d5", "exd6"].forEach((m) => ep.move(m));
    expect(chessPieceIds(ep).d6).toBe(initial.e2);
    expect(chessPieceIds(ep).d5).toBeUndefined();
    const promotion = new Chess("4k3/P7/8/8/8/8/8/4K3 w - - 0 1");
    const id = chessPieceIds(promotion).a7; promotion.move("a8=Q+");
    expect(chessPieceIds(promotion).a8).toBe(id);
    promotion.undo(); expect(chessPieceIds(promotion).a7).toBe(id);
  });
});
