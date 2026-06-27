// Pure logic for 2048.
export type Grid = number[][];

function defaultRng() {
  return Math.random();
}

function emptyGrid(): Grid {
  return [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
}

function emptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] === 0) cells.push([r, c]);
  return cells;
}

// Spawn a 2 (90%) or 4 (10%) at a random empty cell.
export function spawnTile(grid: Grid, rng: () => number = defaultRng): Grid {
  const empty = emptyCells(grid);
  if (empty.length === 0) return grid;
  const idx = Math.floor(rng() * empty.length);
  const [r, c] = empty[idx];
  const next = grid.map(row => [...row]);
  next[r][c] = rng() < 0.9 ? 2 : 4;
  return next;
}

// Empty grid with two randomly-placed tiles.
export function newGame(rng: () => number = defaultRng): Grid {
  let g = emptyGrid();
  g = spawnTile(g, rng);
  g = spawnTile(g, rng);
  return g;
}

// Slide a single row left: compact, merge equal adjacent once, pad zeros.
function slideRow(row: number[]): { row: number[]; gained: number } {
  const tiles = row.filter(v => v !== 0);
  let gained = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const val = tiles[i] * 2;
      merged.push(val);
      gained += val;
      i += 2;
    } else {
      merged.push(tiles[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, gained };
}

function transpose(grid: Grid): Grid {
  return Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => grid[c][r])
  );
}

export function slide(
  grid: Grid,
  dir: "up" | "down" | "left" | "right",
): { grid: Grid; moved: boolean; gained: number } {
  // Normalise so we always slide left, then undo.
  let work = grid.map(row => [...row]);
  if (dir === "up") work = transpose(work);
  else if (dir === "down") work = transpose(work).map(row => [...row].reverse());
  else if (dir === "right") work = work.map(row => [...row].reverse());

  let totalGained = 0;
  const slid = work.map(row => {
    const r = slideRow(row);
    totalGained += r.gained;
    return r.row;
  });

  let result: Grid = slid;
  if (dir === "up") result = transpose(slid);
  else if (dir === "down") result = transpose(slid.map(row => [...row].reverse()));
  else if (dir === "right") result = slid.map(row => [...row].reverse());

  const moved = result.some((row, r) => row.some((v, c) => v !== grid[r][c]));
  return { grid: result, moved, gained: totalGained };
}

// True if any slide is still possible.
export function canMove(grid: Grid): boolean {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return true;
      if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return true;
    }
  return false;
}

// True if any cell contains 2048 (keep playing after, but flag win).
export function isWin(grid: Grid): boolean {
  return grid.some(row => row.some(v => v === 2048));
}
