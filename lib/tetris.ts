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
const TSPIN_SCORE = [0, 200, 400, 800];

// SRS kick tables — [Δrow, Δcol] per attempt, CW rotation only
// Key: "fromRot" + "toRot", e.g. "01" = state 0 → state 1
type KickOffset = [number, number];
const KICK_JLSTZ: Record<string, KickOffset[]> = {
  "01": [[0, 0], [0, -1], [-1, -1], [2, 0], [2, -1]],
  "12": [[0, 0], [0, 1], [1, 1], [-2, 0], [-2, 1]],
  "23": [[0, 0], [0, 1], [-1, 1], [2, 0], [2, 1]],
  "30": [[0, 0], [0, -1], [1, -1], [-2, 0], [-2, -1]],
};
const KICK_I: Record<string, KickOffset[]> = {
  "01": [[0, 0], [0, -2], [0, 1], [1, -2], [-2, 1]],
  "12": [[0, 0], [0, -1], [0, 2], [-2, -1], [1, 2]],
  "23": [[0, 0], [0, 2], [0, -1], [-1, 2], [2, -1]],
  "30": [[0, 0], [0, 1], [0, -2], [2, 1], [-1, -2]],
};

export interface Game {
  grid: Grid;
  type: string;
  matrix: number[][];
  rot: number; // SRS rotation state 0-3
  r: number;
  c: number;
  next: string; // first upcoming piece (kept for backward compat)
  nextPieces: string[]; // [next, 2nd, 3rd] preview
  bag: string[];
  score: number;
  lines: number;
  level: number;
  over: boolean;
  hold: string | null;
  holdUsed: boolean;
  lastWasRotation: boolean;
  tspinFlash: string | null;
  tspinCount: number; // incremented per T-spin; component uses as effect dep
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

function shuffleBatch(): string[] {
  const b = [...TYPES];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function ensureBag(bag: string[], minSize: number): string[] {
  let b = [...bag];
  while (b.length < minSize) b = [...shuffleBatch(), ...b];
  return b;
}

function spawn(grid: Grid, type: string, bag: string[]): Partial<Game> {
  const matrix = PIECES[type].matrix;
  const c = Math.floor((COLS - matrix[0].length) / 2);
  const r = 0;
  let b = ensureBag(bag, 3); // need 1 for next + 2 for peek
  const next = b.pop()!;
  b = ensureBag(b, 2);
  const over = collides(grid, matrix, r, c);
  return {
    type, matrix, rot: 0, r, c,
    next, nextPieces: [next, b[b.length - 1], b[b.length - 2]],
    bag: b, over,
  };
}

export function newGame(): Game {
  const bag = ensureBag([], 1);
  const first = bag.pop()!;
  const grid = emptyGrid();
  const s = spawn(grid, first, bag);
  return {
    grid,
    type: s.type!,
    matrix: s.matrix!,
    rot: 0,
    r: s.r!,
    c: s.c!,
    next: s.next!,
    nextPieces: s.nextPieces!,
    bag: s.bag!,
    score: 0,
    lines: 0,
    level: 1,
    over: false,
    hold: null,
    holdUsed: false,
    lastWasRotation: false,
    tspinFlash: null,
    tspinCount: 0,
  };
}

// Returns the row where the active piece would land (hard-drop position).
export function ghostRow(g: Game): number {
  let r = g.r;
  while (!collides(g.grid, g.matrix, r + 1, g.c)) r++;
  return r;
}

export function tryShift(g: Game, dc: number): Game {
  if (g.over) return g;
  if (!collides(g.grid, g.matrix, g.r, g.c + dc))
    return { ...g, c: g.c + dc, lastWasRotation: false };
  return g;
}

export function rotate(g: Game): Game {
  if (g.over) return g;
  if (g.type === "O") return { ...g, lastWasRotation: true }; // O has no kick table
  const m = rotateCW(g.matrix);
  const toRot = (g.rot + 1) % 4;
  const key = `${g.rot}${toRot}`;
  const kicks = g.type === "I" ? KICK_I[key] : KICK_JLSTZ[key];
  for (const [dr, dc] of kicks) {
    if (!collides(g.grid, m, g.r + dr, g.c + dc))
      return { ...g, matrix: m, rot: toRot, r: g.r + dr, c: g.c + dc, lastWasRotation: true };
  }
  return g;
}

// 3-corner T-spin rule: check 4 diagonal corners of T center; 3+ occupied = T-spin.
function detectTspin(g: Game, lockedR: number, lockedC: number): boolean {
  if (g.type !== "T" || !g.lastWasRotation) return false;
  const corners: [number, number][] = [
    [lockedR, lockedC],
    [lockedR, lockedC + 2],
    [lockedR + 2, lockedC],
    [lockedR + 2, lockedC + 2],
  ];
  let occupied = 0;
  for (const [cr, cc] of corners) {
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) occupied++;
    else if (g.grid[cr][cc] !== null) occupied++;
  }
  return occupied >= 3;
}

function lockAndNext(g: Game): Game {
  const isTspin = detectTspin(g, g.r, g.c);
  const merged = merge(g.grid, g.matrix, g.r, g.c, g.type);
  const { grid, cleared } = clearLines(merged);
  const lines = g.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  let tspinFlash: string | null = null;
  let tspinCount = g.tspinCount;
  let bonus = 0;
  if (isTspin && cleared > 0) {
    const idx = Math.min(cleared, 3);
    bonus = TSPIN_SCORE[idx] * g.level;
    tspinFlash = ["", "T-Spin!", "T-Spin Double!", "T-Spin Triple!"][idx];
    tspinCount++;
  }
  const score = g.score + (isTspin && cleared > 0 ? bonus : LINE_SCORE[cleared] * g.level);
  const s = spawn(grid, g.next, g.bag);
  return {
    ...g,
    grid, lines, level, score,
    type: s.type!, matrix: s.matrix!, rot: 0, r: s.r!, c: s.c!,
    next: s.next!, nextPieces: s.nextPieces!, bag: s.bag!, over: s.over!,
    holdUsed: false,
    lastWasRotation: false,
    tspinFlash,
    tspinCount,
  };
}

// Swap active piece with the hold slot (once per placed piece).
export function holdPiece(g: Game): Game {
  if (g.over || g.holdUsed) return g;
  const held = g.hold;
  if (held === null) {
    // No held piece — put current into hold, consume next from queue
    const matrix = PIECES[g.next].matrix;
    const c = Math.floor((COLS - matrix[0].length) / 2);
    const r = 0;
    let b = ensureBag([...g.bag], 2);
    const newNext = b.pop()!;
    b = ensureBag(b, 2);
    const over = collides(g.grid, matrix, r, c);
    return {
      ...g,
      type: g.next, matrix, rot: 0, r, c,
      next: newNext, nextPieces: [newNext, b[b.length - 1], b[b.length - 2]],
      bag: b,
      hold: g.type, holdUsed: true,
      lastWasRotation: false, tspinFlash: null, over,
    };
  }
  // Swap current piece with held piece; queue doesn't advance
  const matrix = PIECES[held].matrix;
  const c = Math.floor((COLS - matrix[0].length) / 2);
  const r = 0;
  const over = collides(g.grid, matrix, r, c);
  return {
    ...g,
    type: held, matrix, rot: 0, r, c,
    hold: g.type, holdUsed: true,
    lastWasRotation: false, tspinFlash: null, over,
  };
}

/** Gravity step / soft drop. `scoring` adds a point for a manual soft drop. */
export function drop(g: Game, scoring = false): Game {
  if (g.over) return g;
  if (!collides(g.grid, g.matrix, g.r + 1, g.c))
    return { ...g, r: g.r + 1, score: g.score + (scoring ? 1 : 0), lastWasRotation: false };
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
