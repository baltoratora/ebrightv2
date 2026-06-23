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
export type BubbleColor = (typeof COLORS)[number];
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

export function newGrid(filledRows = 7): Grid {
  return Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: colsForRow(r) }, () =>
      r < filledRows ? randomColor() : null,
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

/** BFS: all connected same-color bubbles starting at (row, col). */
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
    if (!validCell(grid, r, c) || grid[r][c] !== color) continue;
    out.push([r, c]);
    for (const [nr, nc] of neighbors(r, c))
      if (!seen.has(`${nr},${nc}`)) q.push([nr, nc]);
  }
  return out;
}

/** Find all bubbles not connected to the ceiling (row 0) — they fall. */
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

/**
 * Place bubble at (row, col). Pop groups ≥ 3, then remove floating.
 * Mutates grid in place. Returns points earned.
 */
export function placeBubble(
  grid: Grid,
  row: number,
  col: number,
  color: BubbleColor,
): number {
  grid[row][col] = color;
  const group = findGroup(grid, row, col);
  if (group.length < 3) return 0;
  for (const [r, c] of group) grid[r][c] = null;
  const floating = findFloating(grid);
  for (const [r, c] of floating) grid[r][c] = null;
  return group.length * 10 + floating.length * 20;
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

/**
 * Snap ball at pixel (px, py) to the nearest anchorable empty cell.
 * Anchorable = row 0, or adjacent to a filled bubble.
 */
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
