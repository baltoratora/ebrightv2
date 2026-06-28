// Checkers / English draughts (8x8). Pure, unit-tested.
// Red ("r") starts at the bottom, Black ("b") at the top. Mandatory captures.

export type Color = "r" | "b";
export interface Piece {
  color: Color;
  king: boolean;
}
export type Board = (Piece | null)[][];
export interface Move {
  from: [number, number];
  to: [number, number];
  captures: [number, number][];
}

const KING_ROW: Record<Color, number> = { r: 0, b: 7 };
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function newBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) b[r][c] = { color: "b", king: false };
        else if (r > 4) b[r][c] = { color: "r", king: false };
      }
    }
  }
  return b;
}

export function cloneBoard(b: Board): Board {
  return b.map((row) => row.map((c) => (c ? { ...c } : null)));
}

function dirsFor(p: Piece): [number, number][] {
  if (p.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return p.color === "r" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

function jumpSeqs(b: Board, r: number, c: number, p: Piece, captured: [number, number][]): Move[] {
  const out: Move[] = [];
  for (const [dr, dc] of dirsFor(p)) {
    const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
    if (!inB(lr, lc)) continue;
    const mid = b[mr][mc];
    if (!mid || mid.color === p.color) continue;
    if (captured.some(([cr, cc]) => cr === mr && cc === mc)) continue;
    if (b[lr][lc] !== null) continue; // landing must be empty
    const nextCap: [number, number][] = [...captured, [mr, mc]];
    // A man that reaches the king row mid-jump promotes and stops.
    if (!p.king && lr === KING_ROW[p.color]) {
      out.push({ from: [r, c], to: [lr, lc], captures: nextCap });
      continue;
    }
    const further = jumpSeqs(b, lr, lc, p, nextCap);
    if (further.length) {
      for (const f of further) out.push({ from: [r, c], to: f.to, captures: f.captures });
    } else {
      out.push({ from: [r, c], to: [lr, lc], captures: nextCap });
    }
  }
  return out;
}

/** All legal moves for `color`; if any capture exists, only captures (mandatory). */
export function generateMoves(b: Board, color: Color): Move[] {
  const jumps: Move[] = [];
  const simple: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.color !== color) continue;
      jumps.push(...jumpSeqs(b, r, c, p, []));
      for (const [dr, dc] of dirsFor(p)) {
        const nr = r + dr, nc = c + dc;
        if (inB(nr, nc) && b[nr][nc] === null) {
          simple.push({ from: [r, c], to: [nr, nc], captures: [] });
        }
      }
    }
  }
  return jumps.length ? jumps : simple;
}

export function applyMove(b: Board, m: Move): Board {
  const n = cloneBoard(b);
  const [fr, fc] = m.from;
  const p = n[fr][fc]!;
  n[fr][fc] = null;
  for (const [cr, cc] of m.captures) n[cr][cc] = null;
  const [tr, tc] = m.to;
  n[tr][tc] = { ...p };
  if (!p.king && tr === KING_ROW[p.color]) n[tr][tc]!.king = true;
  return n;
}

/**
 * A man (non-king) that reaches its king row by a jump promotes, and its capture
 * chain ends immediately — even though it could now jump backward as a king.
 * `jumpSeqs` honours this (the king-row stop above); the interactive multi-jump
 * UI must use this too so it doesn't force an illegal extra capture.
 */
export function promotesAndStops(pieceWasKing: boolean, landingRow: number, color: Color): boolean {
  return !pieceWasKing && landingRow === KING_ROW[color];
}

export function countPieces(b: Board): { r: number; b: number } {
  let red = 0, black = 0;
  for (const row of b) for (const p of row) if (p) p.color === "r" ? red++ : black++;
  return { r: red, b: black };
}

/** The side to move loses when it has no legal moves. */
export function winner(b: Board, toMove: Color): Color | null {
  if (generateMoves(b, toMove).length === 0) return toMove === "r" ? "b" : "r";
  return null;
}

function evaluate(b: Board): number {
  let s = 0; // from Red's perspective
  for (const row of b) {
    for (const p of row) {
      if (!p) continue;
      const v = p.king ? 1.7 : 1;
      s += p.color === "r" ? v : -v;
    }
  }
  return s;
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function search(b: Board, color: Color, depth: number, alpha: number, beta: number): number {
  const moves = generateMoves(b, color);
  if (!moves.length) return color === "r" ? -1000 : 1000; // color to move has lost
  if (depth === 0) return evaluate(b);
  if (color === "r") {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, search(applyMove(b, m), "b", depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      best = Math.min(best, search(applyMove(b, m), "r", depth - 1, alpha, beta));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function bestMove(b: Board, color: Color, depth: number): Move | null {
  const moves = shuffle(generateMoves(b, color));
  if (!moves.length) return null;
  let bestM = moves[0];
  let bestS = color === "r" ? -Infinity : Infinity;
  for (const m of moves) {
    const s = search(applyMove(b, m), color === "r" ? "b" : "r", depth - 1, -Infinity, Infinity);
    if (color === "r" ? s > bestS : s < bestS) {
      bestS = s;
      bestM = m;
    }
  }
  return bestM;
}
