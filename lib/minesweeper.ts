// Minesweeper logic. Pure (no DOM), unit-tested.

export type Difficulty = "easy" | "medium" | "hard";

export interface Config {
  rows: number;
  cols: number;
  mines: number;
}

// Square boards so they fit phones well (no ultra-wide expert grid).
export const DIFFICULTIES: Record<Difficulty, Config> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 16, mines: 65 },
};

export type CellState = "hidden" | "revealed" | "flagged";

export interface Cell {
  mine: boolean;
  adjacent: number;
  state: CellState;
}

export type Board = Cell[][];

export function createBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      adjacent: 0,
      state: "hidden" as CellState,
    })),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((c) => ({ ...c })));
}

export function neighbors(
  r: number,
  c: number,
  rows: number,
  cols: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Recompute each non-mine cell's adjacent-mine count. */
export function computeAdjacency(board: Board): void {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      board[r][c].adjacent = neighbors(r, c, rows, cols).filter(
        ([nr, nc]) => board[nr][nc].mine,
      ).length;
    }
  }
}

/**
 * Place mines on a fresh board, keeping the first-clicked cell AND its
 * neighbors mine-free (first-click-safe). Returns a new board with adjacency
 * computed.
 */
export function placeMines(
  board: Board,
  mines: number,
  safeR: number,
  safeC: number,
): Board {
  const b = cloneBoard(board);
  const rows = b.length;
  const cols = b[0].length;

  const forbidden = new Set<string>([`${safeR},${safeC}`]);
  for (const [nr, nc] of neighbors(safeR, safeC, rows, cols)) {
    forbidden.add(`${nr},${nc}`);
  }

  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!forbidden.has(`${r},${c}`)) candidates.push([r, c]);
    }
  }

  const count = Math.min(mines, candidates.length);
  for (const [r, c] of shuffle(candidates).slice(0, count)) {
    b[r][c].mine = true;
  }
  computeAdjacency(b);
  return b;
}

/**
 * Reveal a cell. Flood-fills through zero-adjacent cells. Returns the new
 * board and whether a mine was hit.
 */
export function reveal(
  board: Board,
  r: number,
  c: number,
): { board: Board; hitMine: boolean } {
  const b = cloneBoard(board);
  const rows = b.length;
  const cols = b[0].length;

  if (b[r][c].state !== "hidden") return { board: b, hitMine: false };
  if (b[r][c].mine) {
    b[r][c].state = "revealed";
    return { board: b, hitMine: true };
  }

  const stack: [number, number][] = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop()!;
    const cell = b[cr][cc];
    if (cell.state !== "hidden") continue; // skip revealed/flagged
    cell.state = "revealed";
    if (cell.adjacent === 0) {
      for (const [nr, nc] of neighbors(cr, cc, rows, cols)) {
        if (b[nr][nc].state === "hidden") stack.push([nr, nc]);
      }
    }
  }
  return { board: b, hitMine: false };
}

/** Toggle a flag on a hidden/flagged cell (revealed cells are untouched). */
export function toggleFlag(board: Board, r: number, c: number): Board {
  const b = cloneBoard(board);
  const cell = b[r][c];
  if (cell.state === "hidden") cell.state = "flagged";
  else if (cell.state === "flagged") cell.state = "hidden";
  return b;
}

/** Win when every non-mine cell has been revealed. */
export function isWin(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.mine && cell.state !== "revealed") return false;
    }
  }
  return true;
}

export function countFlags(board: Board): number {
  let n = 0;
  for (const row of board) for (const cell of row) if (cell.state === "flagged") n++;
  return n;
}

/** Reveal all mines (used when the game is lost). */
export function revealAllMines(board: Board): Board {
  const b = cloneBoard(board);
  for (const row of b) for (const cell of row) if (cell.mine) cell.state = "revealed";
  return b;
}
