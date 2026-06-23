import { Chess, type Move } from "chess.js";

// Material values (centipawns). Evaluation is from White's perspective.
const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

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

/** Best move for the side to move, minimax + alpha-beta to `depth` plies. */
export function bestMove(game: Chess, depth: number): Move | null {
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
