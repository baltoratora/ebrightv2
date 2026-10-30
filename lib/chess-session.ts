import { Chess, type Move, type Square } from "chess.js";

/** Return to the human's previous decision, including an unanswered move. */
export function undoBotTurn(game: Chess): Move[] {
  const undone: Move[] = [];
  const last = game.undo();
  if (!last) return undone;
  undone.push(last);
  if (game.turn() === "b") {
    const human = game.undo();
    if (human) undone.push(human);
  }
  return undone;
}

/** Replay identities, not piece types, so same-type pieces never swap in Motion.
 * Undo reconstructs the original identities, including captures and promotion. */
export function chessPieceIds(game: Chess): Partial<Record<Square, string>> {
  const history = game.history({ verbose: true });
  const start = history.length ? new Chess(history[0].before) : game;
  const ids: Partial<Record<Square, string>> = {};
  for (const row of start.board()) for (const piece of row) {
    if (piece) ids[piece.square] = `${piece.color}-${piece.type}-${piece.square}`;
  }
  for (const move of history) {
    const id = ids[move.from];
    delete ids[move.from];
    if (move.isEnPassant()) delete ids[`${move.to[0]}${move.from[1]}` as Square];
    if (id) ids[move.to] = id;
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      const rookFrom = `${move.isKingsideCastle() ? "h" : "a"}${move.from[1]}` as Square;
      const rookTo = `${move.isKingsideCastle() ? "f" : "d"}${move.from[1]}` as Square;
      ids[rookTo] = ids[rookFrom];
      delete ids[rookFrom];
    }
  }
  return ids;
}
