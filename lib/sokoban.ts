// Pure Sokoban game logic — no DOM, no React.
// Cell encoding (standard Sokoban):
//   #  wall   (space) floor   . target
//   $  crate  *  crate-on-target
//   @  player +  player-on-target

export type Pos = { r: number; c: number };

export type Level = {
  walls: boolean[][];   // walls[r][c]
  targets: boolean[][]; // targets[r][c]
  crates: Pos[];        // movable crate positions
  player: Pos;          // current player position
  w: number;            // grid width
  h: number;            // grid height
};

export type Dir = "up" | "down" | "left" | "right";

// ---------------------------------------------------------------------------
// 8 hand-authored levels of increasing difficulty (all verified solvable).
// ---------------------------------------------------------------------------
export const LEVELS: string[] = [
  // L1 — 1 crate · 1 move (tutorial)
  "#####\n#@$.#\n#####",

  // L2 — 1 crate · 3 moves (navigate above, push down)
  "######\n#@   #\n#    #\n# $  #\n# .  #\n######",

  // L3 — 1 crate · 5 moves (L-shape: push right then down)
  "######\n#@   #\n# $  #\n#  . #\n######",

  // L4 — 1 crate · 8 moves (push left twice, then up twice)
  "#######\n#.    #\n#     #\n#  $  #\n#    @#\n#######",

  // L5 — 2 crates · 7 moves (separate corridors)
  "########\n#      #\n#@$.   #\n#   .  #\n#   $  #\n#      #\n########",

  // L6 — 2 crates · 7 moves (symmetric, push both up)
  "########\n#      #\n# . .  #\n# $@$  #\n#      #\n########",

  // L7 — 2 crates · 14 moves (longer navigation)
  "########\n#  .   #\n# $  . #\n# @  $ #\n#      #\n########",

  // L8 — 3 crates · 10 moves (careful ordering required)
  "#######\n# ..  #\n# $$  #\n# @   #\n# .$  #\n#     #\n#######",
];

// ---------------------------------------------------------------------------
// parseLevel
// ---------------------------------------------------------------------------
export function parseLevel(src: string): Level {
  const rows = src.split("\n");
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));

  const walls: boolean[][] = Array.from({ length: h }, () =>
    Array<boolean>(w).fill(false),
  );
  const targets: boolean[][] = Array.from({ length: h }, () =>
    Array<boolean>(w).fill(false),
  );
  const crates: Pos[] = [];
  let player: Pos = { r: 0, c: 0 };

  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === "#") walls[r][c] = true;
      if (ch === "." || ch === "*" || ch === "+") targets[r][c] = true;
      if (ch === "$" || ch === "*") crates.push({ r, c });
      if (ch === "@" || ch === "+") player = { r, c };
    }
  }

  return { walls, targets, crates, player, w, h };
}

// ---------------------------------------------------------------------------
// move — returns a new Level snapshot; original is never mutated.
// ---------------------------------------------------------------------------
const DELTAS: Record<Dir, Pos> = {
  up:    { r: -1, c: 0 },
  down:  { r: 1,  c: 0 },
  left:  { r: 0,  c: -1 },
  right: { r: 0,  c: 1 },
};

export function move(
  level: Level,
  dir: Dir,
): { level: Level; moved: boolean } {
  const d = DELTAS[dir];
  const nr = level.player.r + d.r;
  const nc = level.player.c + d.c;

  // Out-of-bounds or wall?
  if (nr < 0 || nr >= level.h || nc < 0 || nc >= level.w)
    return { level, moved: false };
  if (level.walls[nr][nc]) return { level, moved: false };

  // Is there a crate at the target cell?
  const crateIdx = level.crates.findIndex((p) => p.r === nr && p.c === nc);
  if (crateIdx !== -1) {
    const cnr = nr + d.r;
    const cnc = nc + d.c;
    // Crate destination must be in-bounds, not a wall, not another crate.
    if (cnr < 0 || cnr >= level.h || cnc < 0 || cnc >= level.w)
      return { level, moved: false };
    if (level.walls[cnr][cnc]) return { level, moved: false };
    if (level.crates.some((p) => p.r === cnr && p.c === cnc))
      return { level, moved: false };

    const newCrates = level.crates.map((p, i) =>
      i === crateIdx ? { r: cnr, c: cnc } : p,
    );
    return {
      level: { ...level, player: { r: nr, c: nc }, crates: newCrates },
      moved: true,
    };
  }

  // Plain move into empty cell.
  return {
    level: { ...level, player: { r: nr, c: nc } },
    moved: true,
  };
}

// ---------------------------------------------------------------------------
// isSolved — every target must have a crate on it.
// ---------------------------------------------------------------------------
export function isSolved(level: Level): boolean {
  return level.crates.every((p) => level.targets[p.r][p.c]);
}
