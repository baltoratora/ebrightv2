// Battleship logic. Pure, unit-tested. 10x10, classic 5-ship fleet.

export const SIZE = 10;
export const FLEET: [string, number][] = [
  ["Carrier", 5],
  ["Battleship", 4],
  ["Cruiser", 3],
  ["Submarine", 3],
  ["Destroyer", 2],
];

export type Cell = "hit" | "miss" | null;

export interface Ship {
  name: string;
  size: number;
  cells: [number, number][];
  hits: number;
}

export interface Board {
  grid: number[][]; // ship index, or -1 for water
  ships: Ship[];
  shots: Cell[][];
}

export const inB = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

function emptyGrid(): number[][] {
  return Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(-1));
}
function emptyShots(): Cell[][] {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(null));
}

// Create a board with all ships unplaced (cells = []) for manual placement
export function emptyBoard(): Board {
  const ships: Ship[] = FLEET.map(([name, size]) => ({ name, size, cells: [], hits: 0 }));
  return { grid: emptyGrid(), ships, shots: emptyShots() };
}

// True when every ship has been placed (cells non-empty)
export function allPlaced(board: Board): boolean {
  return board.ships.length === FLEET.length && board.ships.every((s) => s.cells.length > 0);
}

// Place ship[shipIndex] at (row, col); mutates board; returns false if invalid or OOB
export function tryPlaceShip(
  board: Board,
  shipIndex: number,
  row: number,
  col: number,
  horizontal: boolean,
): boolean {
  const size = FLEET[shipIndex][1];
  const old = board.ships[shipIndex].cells;
  // Temporarily clear this ship's current cells so we can re-place it
  old.forEach(([r, c]) => (board.grid[r][c] = -1));
  const cells: [number, number][] = [];
  for (let k = 0; k < size; k++) {
    const r = horizontal ? row : row + k;
    const c = horizontal ? col + k : col;
    if (!inB(r, c) || board.grid[r][c] !== -1) {
      // Restore old cells and bail
      old.forEach(([r2, c2]) => (board.grid[r2][c2] = shipIndex));
      return false;
    }
    cells.push([r, c]);
  }
  cells.forEach(([r, c]) => (board.grid[r][c] = shipIndex));
  board.ships[shipIndex].cells = cells;
  return true;
}

export function placeFleet(): Board {
  const grid = emptyGrid();
  const ships: Ship[] = [];
  FLEET.forEach(([name, size], idx) => {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      const cells: [number, number][] = [];
      let ok = true;
      for (let k = 0; k < size; k++) {
        const rr = horiz ? r : r + k;
        const cc = horiz ? c + k : c;
        if (!inB(rr, cc) || grid[rr][cc] !== -1) {
          ok = false;
          break;
        }
        cells.push([rr, cc]);
      }
      if (ok) {
        cells.forEach(([rr, cc]) => (grid[rr][cc] = idx));
        ships.push({ name, size, cells, hits: 0 });
        placed = true;
      }
    }
  });
  return { grid, ships, shots: emptyShots() };
}

// Fire at (r,c); mutates board; null if already fired there
export function fire(
  board: Board,
  r: number,
  c: number,
): { result: "hit" | "miss"; sunk: string | null } | null {
  if (board.shots[r][c] !== null) return null;
  const idx = board.grid[r][c];
  if (idx === -1) {
    board.shots[r][c] = "miss";
    return { result: "miss", sunk: null };
  }
  board.shots[r][c] = "hit";
  const ship = board.ships[idx];
  ship.hits++;
  return { result: "hit", sunk: ship.hits === ship.size ? ship.name : null };
}

export function allSunk(board: Board): boolean {
  return board.ships.every((s) => s.hits === s.size);
}

export function shipsRemaining(board: Board): number {
  return board.ships.filter((s) => s.hits < s.size).length;
}

export function neighbors(r: number, c: number): [number, number][] {
  return ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as [number, number][]).filter(
    ([rr, cc]) => inB(rr, cc),
  );
}

export interface AIMemory {
  queue: [number, number][];
}

// Medium AI: hunt/target — fire queued targets first, then parity hunt
export function aiChooseShot(shots: Cell[][], mem: AIMemory): [number, number] {
  mem.queue = mem.queue.filter(([r, c]) => shots[r][c] === null);
  if (mem.queue.length) return mem.queue[0];

  const parity: [number, number][] = [];
  const any: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (shots[r][c] !== null) continue;
      any.push([r, c]);
      if ((r + c) % 2 === 0) parity.push([r, c]);
    }
  }
  const pool = parity.length ? parity : any;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Easy AI: pick any unshot cell at random
export function aiEasyShot(shots: Cell[][]): [number, number] {
  const pool: [number, number][] = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (shots[r][c] === null) pool.push([r, c]);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Hard AI: probability density — fire at the cell with most possible remaining ship placements
export function aiHardShot(board: Board): [number, number] {
  const sizes = board.ships.filter((s) => s.hits < s.size).map((s) => s.size);
  const density = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  for (const size of sizes) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        for (const horiz of [true, false]) {
          let ok = true;
          const cells: [number, number][] = [];
          for (let k = 0; k < size; k++) {
            const rr = horiz ? r : r + k;
            const cc = horiz ? c + k : c;
            if (!inB(rr, cc) || board.shots[rr][cc] === "miss") { ok = false; break; }
            cells.push([rr, cc]);
          }
          if (ok) for (const [rr, cc] of cells) if (board.shots[rr][cc] === null) density[rr][cc]++;
        }
      }
    }
  }
  let best: [number, number] = [0, 0];
  let bestVal = -1;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board.shots[r][c] === null && density[r][c] > bestVal) {
        bestVal = density[r][c];
        best = [r, c];
      }
  return best;
}
