export const R = 14;
export const COLS_EVEN = 11;
export const COLS_ODD = 10;
export const ROW_H = R * Math.sqrt(3); // ≈ 24.25
export const CANVAS_W = COLS_EVEN * 2 * R; // 308
export const GRID_ROWS = 13;
export const DANGER_ROW = 11;

export const COLORS = [
  "#ff4757", "#1e90ff", "#2ed573",
  "#ffa502", "#a29bfe", "#fd79a8",
] as const;

export const BOMB = "bomb" as const;
export const WILD = "wild" as const;
export type SpecialBubble = typeof BOMB | typeof WILD;
export type BubbleColor = (typeof COLORS)[number] | SpecialBubble;
export type Bubble = BubbleColor | null;
export type Grid = Bubble[][];

export function colsForRow(row: number) {
  return row % 2 === 0 ? COLS_EVEN : COLS_ODD;
}

export function bubbleX(row: number, col: number) {
  return col * 2 * R + (row % 2 === 1 ? R : 0) + R;
}

export function bubbleY(row: number) {
  return row * ROW_H + R;
}

export function randomColor(): BubbleColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Random color; levels 5+ occasionally yield bomb or wild.
export function randomColorForLevel(level: number): BubbleColor {
  if (level >= 5) {
    const chance = Math.min(0.04 + (level - 5) * 0.005, 0.12);
    const roll = Math.random();
    if (roll < chance) return BOMB;
    if (roll < chance * 2) return WILD;
  }
  return randomColor();
}

export function newGrid(filledRows = 7): Grid {
  return Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: colsForRow(r) }, () =>
      r < filledRows ? randomColor() : null,
    ),
  );
}

// Generate a harder random grid for levels beyond the authored set.
export function newGridForLevel(level: number): Grid {
  const rows = Math.min(5 + Math.floor((level - 1) / 2), 11);
  return Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: colsForRow(r) }, () =>
      r < rows ? randomColorForLevel(level) : null,
    ),
  );
}

export function validCell(grid: Grid, r: number, c: number) {
  return r >= 0 && r < grid.length && c >= 0 && c < (grid[r]?.length ?? 0);
}

export function neighbors(row: number, col: number): [number, number][] {
  return row % 2 === 0
    ? [
        [row - 1, col - 1], [row - 1, col],
        [row,     col - 1], [row,     col + 1],
        [row + 1, col - 1], [row + 1, col],
      ]
    : [
        [row - 1, col    ], [row - 1, col + 1],
        [row,     col - 1], [row,     col + 1],
        [row + 1, col    ], [row + 1, col + 1],
      ];
}

// BFS: all connected same-color bubbles. WILD matches any color.
export function findGroup(grid: Grid, row: number, col: number): [number, number][] {
  const color = grid[row]?.[col];
  if (!color) return [];
  const seen = new Set<string>();
  const q: [number, number][] = [[row, col]];
  const out: [number, number][] = [];
  while (q.length) {
    const [r, c] = q.shift()!;
    const k = `${r},${c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!validCell(grid, r, c)) continue;
    const cellColor = grid[r][c];
    if (!cellColor) continue;
    // Include if same color, or either side is WILD
    if (cellColor !== color && cellColor !== WILD && color !== WILD) continue;
    out.push([r, c]);
    for (const [nr, nc] of neighbors(r, c))
      if (!seen.has(`${nr},${nc}`)) q.push([nr, nc]);
  }
  return out;
}

// Find all bubbles not connected to the ceiling (row 0) — they fall.
export function findFloating(grid: Grid): [number, number][] {
  const seen = new Set<string>();
  const q: [number, number][] = [];
  for (let c = 0; c < grid[0].length; c++) {
    if (grid[0][c]) { q.push([0, c]); seen.add(`0,${c}`); }
  }
  while (q.length) {
    const [r, c] = q.shift()!;
    for (const [nr, nc] of neighbors(r, c)) {
      const k = `${nr},${nc}`;
      if (!seen.has(k) && validCell(grid, nr, nc) && grid[nr][nc]) {
        seen.add(k); q.push([nr, nc]);
      }
    }
  }
  const out: [number, number][] = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] && !seen.has(`${r},${c}`)) out.push([r, c]);
  return out;
}

// Rich result from placing a bubble: popped group, floated cells, points.
export interface PopResult {
  points: number;
  groupCells: [number, number][];
  floatCells: [number, number][];
}

// Place bubble, pop groups ≥ 3, trigger bomb explosions, remove floating.
export function placeBubbleEx(
  grid: Grid,
  row: number,
  col: number,
  color: BubbleColor,
): PopResult {
  grid[row][col] = color;
  const group = findGroup(grid, row, col);
  if (group.length < 3) return { points: 0, groupCells: [], floatCells: [] };
  // Collect bomb neighbor positions before clearing the group
  const bombExtra = new Set<string>();
  for (const [r, c] of group) {
    if (grid[r][c] === BOMB) {
      for (const [nr, nc] of neighbors(r, c)) {
        if (validCell(grid, nr, nc) && grid[nr][nc]) bombExtra.add(`${nr},${nc}`);
      }
    }
  }
  for (const [r, c] of group) grid[r][c] = null;
  // Clear bomb-triggered neighbors that survived the group clear
  const extraCells: [number, number][] = [];
  for (const key of bombExtra) {
    const [r, c] = key.split(",").map(Number);
    if (validCell(grid, r, c) && grid[r][c] !== null) {
      extraCells.push([r, c]);
      grid[r][c] = null;
    }
  }
  const floating = findFloating(grid);
  for (const [r, c] of floating) grid[r][c] = null;
  const points = (group.length + extraCells.length) * 10 + floating.length * 20;
  return { points, groupCells: [...group, ...extraCells], floatCells: floating };
}

// Backward-compatible wrapper — mutates grid, returns points earned.
export function placeBubble(
  grid: Grid,
  row: number,
  col: number,
  color: BubbleColor,
): number {
  return placeBubbleEx(grid, row, col, color).points;
}

export function isDanger(grid: Grid, dangerRow = DANGER_ROW): boolean {
  for (let r = dangerRow; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c]) return true;
  return false;
}

export function isCleared(grid: Grid): boolean {
  for (const row of grid) for (const b of row) if (b) return false;
  return true;
}

export function snapToGrid(
  grid: Grid,
  px: number,
  py: number,
): [number, number] | null {
  let bestR = -1, bestC = -1, bestD = Infinity;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== null) continue;
      const anchorable =
        r === 0 ||
        neighbors(r, c).some(
          ([nr, nc]) => validCell(grid, nr, nc) && grid[nr][nc] !== null,
        );
      if (!anchorable) continue;
      const dx = px - bubbleX(r, c);
      const dy = py - bubbleY(r);
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; bestR = r; bestC = c; }
    }
  }
  return bestR >= 0 ? [bestR, bestC] : null;
}

// Ceiling descends: push every row down one and add a fresh full row on top.
// Row 0 stays occupied so the mass remains anchored — never a false clear.
export function advanceCeiling(grid: Grid, topRow: Bubble[]): void {
  for (let r = grid.length - 1; r > 0; r--) {
    const src = grid[r - 1];
    const cols = colsForRow(r);
    grid[r] = Array.from({ length: cols }, (_, c) => src[c] ?? null);
  }
  const cols0 = colsForRow(0);
  grid[0] = Array.from({ length: cols0 }, (_, c) => topRow[c] ?? null);
}

// Single-char colour codes for level string data.
const _CLR: Record<string, BubbleColor | null> = {
  r: "#ff4757", b: "#1e90ff", g: "#2ed573",
  o: "#ffa502", p: "#a29bfe", k: "#fd79a8",
  X: BOMB, W: WILD, _: null,
};

// Build a full grid from authored row strings (extra cols padded with null).
export function gridFromLevel(rows: string[]): Grid {
  return Array.from({ length: GRID_ROWS }, (_, r) => {
    const cols = colsForRow(r);
    if (r < rows.length) {
      const src = [...rows[r]].map(ch => _CLR[ch] ?? null);
      return Array.from({ length: cols }, (_, c) => src[c] ?? null);
    }
    return Array<Bubble>(cols).fill(null);
  });
}

// 10 authored levels (row 0=11 cols even, row 1=10 cols odd, alternating).
// r=red b=blue g=green o=orange p=purple k=pink X=bomb W=wild
export const LEVELS: string[][] = [
  // Level 1 – 2 colours, 4 rows
  ["rrrrrbbbbbb", "bbbbbrrrrr", "rrrrbbbbrrr", "bbbrrrrrbb"],
  // Level 2 – 3 colours, 5 rows
  ["rrrrgggbbbb", "gggrrrrbbb", "bbbgggrrrbb", "rrrbbbbggg", "gggrrrrgggg"],
  // Level 3 – 4 colours (add pink k), 5 rows
  ["rrrggkkkbbb", "ggrrkkbbgg", "bbkkggrrbbb", "kkbbrrggkk", "rrgggkkrrrb"],
  // Level 4 – 5 colours, 6 rows
  ["rrrooobbbbb", "oorrrbbbpp", "bbbpppoogrr", "ppoogrrrbb", "grrrbbooppp", "pppoobbbgg"],
  // Level 5 – 5 colours + first bombs/wilds, 6 rows
  ["rrbbggooppp", "bXggrrppoo", "ggWbbpporrr", "ppoorrbbXg", "rrbbgWooppp", "ooXpprrbbb"],
  // Level 6 – 5 colours + specials, 7 rows
  ["rrppoobbggg", "ppXoobbbgg", "oobbWpprrrr", "bbrrooppWg", "rroobXgggpp", "oogppbrrrX", "pppoobbrrgg"],
  // Level 7 – 6 colours + specials, 7 rows
  ["rrkbboooggp", "kkrrbboogp", "bbXkkppgrrr", "ggppkrbXoo", "kkrroopbggg", "rXppkoobbb", "pppkkobrrgg"],
  // Level 8 – 6 colours + specials, 8 rows
  ["rrbbgXkkpoo", "bbXkpgrroo", "ggoopkWbrrr", "pprrkXobgg", "kkrroobWppp", "oobbkrppgX", "rrgXpkoobbg", "bbppkgorrX"],
  // Level 9 – 6 colours + many specials, 8 rows
  ["rXbgXpkoooo", "XkrboopWgg", "gopWbXrrkpp", "pXgookbrrW", "kkoWrrbpppg", "bXpkoogrXr", "rrXbbkppoog", "pgWkorrXbb"],
  // Level 10 – all colours, heavy specials, 9 rows
  ["rXbXgXpXkXo", "XrXbXgXpXk", "bWrWgWoWpWk", "WkWoWbWrWg", "rrbbggooXkp", "ppkkoorrXg", "gXpXkXrXbXo", "XoXgXbXpXr", "rrrbbgggkkp"],
];
