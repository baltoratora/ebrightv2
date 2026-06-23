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

/** Fire at (r,c). Mutates the board. Returns null if already fired there. */
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

/** Hunt/target AI: fire queued targets first, otherwise hunt on a parity grid. */
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
