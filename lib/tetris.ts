// Tetris logic. Pure (no DOM/timers), unit-tested.

export const COLS = 10;
export const ROWS = 20;
export type Cell = string | null; // piece type letter, or null
export type Grid = Cell[][];

interface PieceDef {
  matrix: number[][];
}
export const PIECES: Record<string, PieceDef> = {
  I: { matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { matrix: [[1, 1], [1, 1]] },
  T: { matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const TYPES = Object.keys(PIECES);
const LINE_SCORE = [0, 100, 300, 500, 800];

export interface Game {
  grid: Grid;
  type: string;
  matrix: number[][];
  r: number;
  c: number;
  next: string;
  bag: string[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
}

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const out = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[j][n - 1 - i] = m[i][j];
  return out;
}

export function collides(grid: Grid, matrix: number[][], r: number, c: number): boolean {
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (!matrix[i][j]) continue;
      const gr = r + i;
      const gc = c + j;
      if (gc < 0 || gc >= COLS || gr >= ROWS) return true;
      if (gr >= 0 && grid[gr][gc] !== null) return true;
    }
  }
  return false;
}

export function merge(grid: Grid, matrix: number[][], r: number, c: number, type: string): Grid {
  const g = grid.map((row) => [...row]);
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] && r + i >= 0) g[r + i][c + j] = type;
    }
  }
  return g;
}

export function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - kept.length;
  const empty: Grid = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null));
  return { grid: [...empty, ...kept], cleared };
}

function refill(bag: string[]): string[] {
  if (bag.length) return bag;
  const b = [...TYPES];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function spawn(grid: Grid, type: string, bag: string[]): Partial<Game> {
  const matrix = PIECES[type].matrix;
  const c = Math.floor((COLS - matrix[0].length) / 2);
  const r = 0;
  const b = refill(bag);
  const next = b.pop()!;
  const over = collides(grid, matrix, r, c);
  return { type, matrix, r, c, next, bag: b, over };
}

export function newGame(): Game {
  let bag = refill([]);
  const first = bag.pop()!;
  const grid = emptyGrid();
  const s = spawn(grid, first, bag);
  return {
    grid,
    type: s.type!,
    matrix: s.matrix!,
    r: s.r!,
    c: s.c!,
    next: s.next!,
    bag: s.bag!,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
  };
}

export function tryShift(g: Game, dc: number): Game {
  if (g.over) return g;
  if (!collides(g.grid, g.matrix, g.r, g.c + dc)) return { ...g, c: g.c + dc };
  return g;
}

export function rotate(g: Game): Game {
  if (g.over) return g;
  const m = rotateCW(g.matrix);
  for (const dc of [0, -1, 1, -2, 2]) {
    if (!collides(g.grid, m, g.r, g.c + dc)) return { ...g, matrix: m, c: g.c + dc };
  }
  return g;
}

/** Lock the current piece, clear lines, and spawn the next. */
function lockAndNext(g: Game): Game {
  const merged = merge(g.grid, g.matrix, g.r, g.c, g.type);
  const { grid, cleared } = clearLines(merged);
  const lines = g.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  const score = g.score + LINE_SCORE[cleared] * g.level;
  const s = spawn(grid, g.next, g.bag);
  return { ...g, grid, lines, level, score, type: s.type!, matrix: s.matrix!, r: s.r!, c: s.c!, next: s.next!, bag: s.bag!, over: s.over! };
}

/** Gravity step / soft drop. `scoring` adds a point for a manual soft drop. */
export function drop(g: Game, scoring = false): Game {
  if (g.over) return g;
  if (!collides(g.grid, g.matrix, g.r + 1, g.c)) {
    return { ...g, r: g.r + 1, score: g.score + (scoring ? 1 : 0) };
  }
  return lockAndNext(g);
}

export function hardDrop(g: Game): Game {
  if (g.over) return g;
  let r = g.r;
  while (!collides(g.grid, g.matrix, r + 1, g.c)) r++;
  return lockAndNext({ ...g, r, score: g.score + (r - g.r) * 2 });
}

export function dropInterval(level: number): number {
  return Math.max(90, 800 - (level - 1) * 70);
}
