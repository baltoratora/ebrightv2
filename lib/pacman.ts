// lib/pacman.ts — pure Pac-Man logic (no DOM, no side-effects at module scope)

// ── Maze ─────────────────────────────────────────────────────────────────────
// Legend:
//   # = wall
//   . = pellet
//   o = power pellet
//   G = ghost house interior (ghosts start here)
//   P = Pac-Man spawn
//   T = tunnel (wrap-around)
//   (space) = open floor (no pellet)

export const MAZE_SRC = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "######.##### ## #####.######",
  "######.##    GG    ##.######",
  "######.## ###GG### ##.######",
  "T      .## # GG # ##.      T",
  "######.## ######## ##.######",
  "######.## ######## ##.######",
  "######.##          ##.######",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##................##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#P.........................#",
  "############################",
] as const;

export const COLS = MAZE_SRC[0].length; // 28
export const ROWS = MAZE_SRC.length;    // 29

export type Tile = { row: number; col: number };
export type Dir = "up" | "down" | "left" | "right" | "none";

export interface MazeParsed {
  walls: boolean[][];          // walls[row][col]
  pellets: Set<string>;        // key = tileKey(r,c)
  powerPellets: Set<string>;
  ghostSpawns: Tile[];
  pacSpawn: Tile;
  tunnelRows: number[];
}

export function tileKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseMaze(src: readonly string[]): MazeParsed {
  const walls: boolean[][] = [];
  const pellets = new Set<string>();
  const powerPellets = new Set<string>();
  const ghostSpawns: Tile[] = [];
  let pacSpawn: Tile = { row: 27, col: 1 };
  const tunnelRows: number[] = [];

  for (let r = 0; r < src.length; r++) {
    const row = src[r];
    walls[r] = [];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      walls[r][c] = ch === "#";
      if (ch === ".") pellets.add(tileKey(r, c));
      else if (ch === "o") powerPellets.add(tileKey(r, c));
      else if (ch === "G") ghostSpawns.push({ row: r, col: c });
      else if (ch === "P") pacSpawn = { row: r, col: c };
      if (ch === "T") tunnelRows.push(r);
    }
  }

  // Deduplicate tunnelRows
  const uniqueTunnelRows = [...new Set(tunnelRows)];

  return { walls, pellets, powerPellets, ghostSpawns, pacSpawn, tunnelRows: uniqueTunnelRows };
}

// ── Movement helpers ──────────────────────────────────────────────────────────

const DIR_DELTA: Record<Dir, [number, number]> = {
  up:    [-1, 0],
  down:  [ 1, 0],
  left:  [ 0,-1],
  right: [ 0, 1],
  none:  [ 0, 0],
};

export function nextTile(pos: Tile, dir: Dir): Tile {
  const [dr, dc] = DIR_DELTA[dir];
  let row = pos.row + dr;
  let col = pos.col + dc;
  // Horizontal tunnel wraparound
  if (col < 0) col = COLS - 1;
  if (col >= COLS) col = 0;
  // Vertical clamp
  if (row < 0) row = 0;
  if (row >= ROWS) row = ROWS - 1;
  return { row, col };
}

export function canMove(walls: boolean[][], pos: Tile, dir: Dir): boolean {
  if (dir === "none") return true;
  const next = nextTile(pos, dir);
  return !walls[next.row]?.[next.col];
}

/**
 * When a ghost's logical tile advances across the horizontal tunnel, the column
 * jumps by more than one (e.g. 0 -> COLS-1). Its pixel-x must jump to the
 * matching edge so the ghost wraps around instead of sliding all the way across
 * the maze (through walls). Returns the pixel-x delta to apply (0 when the step
 * is a normal adjacent move). Mirrors how Pac-Man's own position wraps by pixels.
 */
export function tunnelPxShift(fromCol: number, toCol: number, mazeWidthPx: number): number {
  const delta = toCol - fromCol;
  if (delta > 1) return mazeWidthPx; // wrapped off the LEFT edge (moving left)
  if (delta < -1) return -mazeWidthPx; // wrapped off the RIGHT edge (moving right)
  return 0;
}

export function oppositeDir(dir: Dir): Dir {
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  if (dir === "left") return "right";
  if (dir === "right") return "left";
  return "none";
}

// ── Ghost targeting (pure functions) ─────────────────────────────────────────

function tileDist(a: Tile, b: Tile): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/** Blinky: directly targets Pac-Man's current tile */
export function blinkyTarget(pacTile: Tile): Tile {
  return { ...pacTile };
}

/** Pinky: targets 4 tiles ahead of Pac-Man's direction */
export function pinkyTarget(pacTile: Tile, pacDir: Dir): Tile {
  const [dr, dc] = DIR_DELTA[pacDir === "none" ? "up" : pacDir];
  return {
    row: pacTile.row + dr * 4,
    col: pacTile.col + dc * 4,
  };
}

/** Inky: uses Blinky's position + Pac-Man direction vector doubled */
export function inkyTarget(pacTile: Tile, pacDir: Dir, blinkyTile: Tile): Tile {
  const [dr, dc] = DIR_DELTA[pacDir === "none" ? "up" : pacDir];
  // 2 tiles ahead of Pac-Man
  const pivot = { row: pacTile.row + dr * 2, col: pacTile.col + dc * 2 };
  // Double the vector from Blinky to pivot
  return {
    row: pivot.row + (pivot.row - blinkyTile.row),
    col: pivot.col + (pivot.col - blinkyTile.col),
  };
}

/** Clyde: chases when far (>8 tiles), scatters to corner when close */
export function clydeTarget(ghostTile: Tile, pacTile: Tile, scatterCorner: Tile): Tile {
  return tileDist(ghostTile, pacTile) > 8 ? { ...pacTile } : { ...scatterCorner };
}

export type GhostName = "blinky" | "pinky" | "inky" | "clyde";
export type GhostMode = "chase" | "scatter" | "frightened";

/** Unified ghost target selector */
export function ghostTarget(
  name: GhostName,
  pacTile: Tile,
  pacDir: Dir,
  blinkyTile: Tile,
  ghostTile: Tile,
  scatterCorner: Tile,
  mode: GhostMode,
): Tile {
  if (mode === "scatter") return { ...scatterCorner };
  if (mode === "frightened") {
    // Caller supplies random; we return the ghost tile itself as a sentinel
    // (actual random wander is chosen by chooseGhostDir with undefined target)
    return ghostTile;
  }
  switch (name) {
    case "blinky": return blinkyTarget(pacTile);
    case "pinky":  return pinkyTarget(pacTile, pacDir);
    case "inky":   return inkyTarget(pacTile, pacDir, blinkyTile);
    case "clyde":  return clydeTarget(ghostTile, pacTile, scatterCorner);
  }
}

const ALL_DIRS: Dir[] = ["up", "down", "left", "right"];

/**
 * Choose the next direction for a ghost at an intersection.
 * Rules: can't reverse, can't enter walls; picks direction minimising
 * Manhattan distance to targetTile. When frightened, pick randomly (caller
 * must pass a pre-generated random value via `rng`).
 */
export function chooseGhostDir(
  walls: boolean[][],
  ghostTile: Tile,
  ghostDir: Dir,
  targetTile: Tile,
  frightened = false,
  rng?: number, // pre-generated Math.random() value when frightened
): Dir {
  const reverse = oppositeDir(ghostDir);
  const legal = ALL_DIRS.filter(
    (d) => d !== reverse && canMove(walls, ghostTile, d),
  );
  if (legal.length === 0) return ghostDir; // stuck (shouldn't happen)
  if (frightened && rng !== undefined) {
    return legal[Math.floor(rng * legal.length)];
  }
  // Greedy: minimise distance to target
  let best = legal[0];
  let bestDist = Infinity;
  for (const d of legal) {
    const t = nextTile(ghostTile, d);
    const dist = tileDist(t, targetTile);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

// ── Global scatter/chase scheduler ───────────────────────────────────────────
// Classic Pac-Man alternates scatter and chase waves on a fixed timer. Without
// this, ghosts only ever leave "scatter" after a frightened period, so they
// never pursue Pac-Man in normal play. Cumulative seconds (level-1 schedule):
// scatter 7, chase 20, scatter 7, chase 20, scatter 5, chase 20, scatter 5,
// then chase forever.
const GHOST_PHASE_SCHEDULE: { phase: "scatter" | "chase"; until: number }[] = [
  { phase: "scatter", until: 7 },
  { phase: "chase", until: 27 },
  { phase: "scatter", until: 34 },
  { phase: "chase", until: 54 },
  { phase: "scatter", until: 59 },
  { phase: "chase", until: 79 },
  { phase: "scatter", until: 84 },
];

/** Current non-frightened ghost phase for a level, given seconds elapsed. */
export function globalGhostPhase(elapsedSec: number): "scatter" | "chase" {
  for (const w of GHOST_PHASE_SCHEDULE) {
    if (elapsedSec < w.until) return w.phase;
  }
  return "chase";
}

// ── Pellet eating ─────────────────────────────────────────────────────────────

export const PELLET_SCORE = 10;
export const POWER_PELLET_SCORE = 50;
export const GHOST_EAT_SCORES = [200, 400, 800, 1600]; // combo multipliers

export interface EatResult {
  score: number;
  atePellet: boolean;
  atePowerPellet: boolean;
  pelletsLeft: number;
  powerPelletsLeft: number;
}

export function eatPellet(
  pos: Tile,
  pellets: Set<string>,
  powerPellets: Set<string>,
): EatResult {
  const key = tileKey(pos.row, pos.col);
  const pelletsCopy = new Set(pellets);
  const powerCopy = new Set(powerPellets);
  let score = 0;
  let atePellet = false;
  let atePowerPellet = false;

  if (pelletsCopy.has(key)) {
    pelletsCopy.delete(key);
    score += PELLET_SCORE;
    atePellet = true;
  } else if (powerCopy.has(key)) {
    powerCopy.delete(key);
    score += POWER_PELLET_SCORE;
    atePowerPellet = true;
  }

  // Mutate the original sets in place (pure in terms of return value)
  if (atePellet) pellets.delete(key);
  if (atePowerPellet) powerPellets.delete(key);

  return {
    score,
    atePellet,
    atePowerPellet,
    pelletsLeft: pelletsCopy.size,
    powerPelletsLeft: powerCopy.size,
  };
}

/** True when all pellets and power pellets are eaten */
export function isLevelComplete(pellets: Set<string>, powerPellets: Set<string>): boolean {
  return pellets.size === 0 && powerPellets.size === 0;
}
