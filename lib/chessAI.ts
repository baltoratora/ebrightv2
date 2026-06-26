import { Chess, type Move } from "chess.js";

// Material values (centipawns). Evaluation is from White's perspective.
const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Opening book: position key (FEN without move counters) → best move in UCI coordinate form
const OPENING_BOOK: Record<string, string> = {
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": "e2e4",
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3": "e7e5",
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3": "d7d5",
  "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -": "d7d5",
  "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3": "e7e5",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6": "g1f3",
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6": "g1f3",
  "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6": "c2c4",
  "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": "c2c4",
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": "b8c6",
  "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3": "e7e6",
  "rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq e6": "g1f3",
};

// Returns the UCI move string from the opening book for the current position, or null.
export function getBookMove(game: Chess): string | null {
  const key = game.fen().split(" ").slice(0, 4).join(" ");
  return OPENING_BOOK[key] ?? null;
}

export function evaluate(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      score += cell.color === "w" ? VALUE[cell.type] : -VALUE[cell.type];
    }
  }
  return score;
}

function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isGameOver()) {
    if (game.isCheckmate()) return game.turn() === "w" ? -1e6 - depth : 1e6 + depth;
    return 0; // stalemate / draw
  }
  if (depth === 0) return evaluate(game);

  const moves = game.moves({ verbose: true });
  if (game.turn() === "w") {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, search(game, depth - 1, alpha, beta));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.min(best, search(game, depth - 1, alpha, beta));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Best move for the side to move, minimax + alpha-beta to `depth` plies. Checks opening book first. */
export function bestMove(game: Chess, depth: number): Move | null {
  // Check opening book before invoking minimax
  const bookUCI = getBookMove(game);
  if (bookUCI) {
    const from = bookUCI.slice(0, 2);
    const to = bookUCI.slice(2, 4);
    const move = game.moves({ verbose: true }).find((m) => m.from === from && m.to === to);
    if (move) return move;
  }
  const moves = shuffle(game.moves({ verbose: true }));
  if (!moves.length) return null;
  const side = game.turn();
  let bestM = moves[0];
  let bestScore = side === "w" ? -Infinity : Infinity;
  for (const m of moves) {
    game.move(m);
    const sc = search(game, depth - 1, -Infinity, Infinity);
    game.undo();
    if (side === "w" ? sc > bestScore : sc < bestScore) {
      bestScore = sc;
      bestM = m;
    }
  }
  return bestM;
}
