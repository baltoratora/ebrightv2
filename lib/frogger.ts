// Frogger — pure game-state logic: lane definitions, collision detection, wrap-around.
// Rendering and rAF animation live in components/Frogger.tsx.

export const COLS = 10;
export const ROWS = 13;
export const CELL = 32;
export const W = COLS * CELL; // 320 px
export const H = ROWS * CELL; // 416 px

// Frog hitbox half-width (used for road collision)
export const FROG_HALF = 12;

export const START_ROW = ROWS - 1; // 12
export const START_COL = Math.floor(COLS / 2); // 5

// Goal bays at even columns (0, 2, 4, 6, 8); odd columns are fatal obstacles.
export const GOAL_BAYS = [0, 2, 4, 6, 8];

export type Lane = {
  kind: "road" | "river" | "safe" | "goal";
  dir: 1 | -1;
  speed: number; // px per 60fps tick (dt = 1)
  entities: { x: number; len: number }[];
};

// Advance entity positions by dt (60fps units). Returns new Lane — original not mutated.
export function advanceLane(lane: Lane, dt: number): Lane {
  if (lane.speed === 0) return lane;
  const dist = lane.dir * lane.speed * dt;
  const entities = lane.entities.map((e) => {
    let nx = e.x + dist;
    if (lane.dir === 1) {
      // Right-moving: wrap from past-right back to off-left
      if (nx > W) nx -= W + e.len;
      if (nx < -(e.len)) nx += W + e.len;
    } else {
      // Left-moving: wrap from past-left back to off-right
      if (nx + e.len < 0) nx += W + e.len;
      if (nx > W) nx -= W + e.len;
    }
    return { x: nx, len: e.len };
  });
  return { ...lane, entities };
}

// Road collision: true if frog (centred at frogX) overlaps any car. False for non-road.
export function collides(frogX: number, lane: Lane): boolean {
  if (lane.kind !== "road") return false;
  const fl = frogX - FROG_HALF;
  const fr = frogX + FROG_HALF;
  return lane.entities.some((e) => fr > e.x + 2 && fl < e.x + e.len - 2);
}

// River riding: returns carry velocity (dir×speed) when frog is on a log; null = water death.
export function onLog(frogX: number, lane: Lane): number | null {
  if (lane.kind !== "river") return null;
  for (const e of lane.entities) {
    // Frog centre must be within log interior (2 px inset)
    if (frogX > e.x + 2 && frogX < e.x + e.len - 2) {
      return lane.dir * lane.speed;
    }
  }
  return null; // centre not on any log → water → death
}

// Build 13-lane config for a given level; higher levels are faster (capped at 2.5×).
export function laneConfigForLevel(level: number): Lane[] {
  const m = Math.min(1 + (level - 1) * 0.15, 2.5);
  return [
    // Row 0: goal row — no moving entities
    { kind: "goal", dir: 1, speed: 0, entities: [] },
    // Rows 1–5: river (logs move; frog must ride them)
    { kind: "river", dir:  1, speed: 1.0 * m, entities: [{ x: 0,   len: 80 }, { x: 140, len: 64 }, { x: 240, len: 80 }] },
    { kind: "river", dir: -1, speed: 0.8 * m, entities: [{ x: 40,  len: 64 }, { x: 170, len: 80 }] },
    { kind: "river", dir:  1, speed: 1.3 * m, entities: [{ x: 20,  len: 48 }, { x: 130, len: 64 }, { x: 250, len: 48 }] },
    { kind: "river", dir: -1, speed: 1.0 * m, entities: [{ x: 10,  len: 96 }, { x: 190, len: 80 }] },
    { kind: "river", dir:  1, speed: 0.7 * m, entities: [{ x: 0,   len: 96 }, { x: 160, len: 80 }] },
    // Row 6: safe median strip
    { kind: "safe", dir: 1, speed: 0, entities: [] },
    // Rows 7–11: road (cars move; collision = instant death)
    { kind: "road", dir: -1, speed: 1.4 * m, entities: [{ x: 40,  len: 32 }, { x: 160, len: 32 }, { x: 270, len: 32 }] },
    { kind: "road", dir:  1, speed: 1.1 * m, entities: [{ x: 80,  len: 48 }, { x: 220, len: 32 }] },
    { kind: "road", dir: -1, speed: 0.8 * m, entities: [{ x: 20,  len: 32 }, { x: 150, len: 48 }, { x: 265, len: 32 }] },
    { kind: "road", dir:  1, speed: 1.6 * m, entities: [{ x: 60,  len: 32 }, { x: 190, len: 32 }] },
    { kind: "road", dir: -1, speed: 1.2 * m, entities: [{ x: 100, len: 64 }, { x: 250, len: 32 }] },
    // Row 12: safe start zone
    { kind: "safe", dir: 1, speed: 0, entities: [] },
  ];
}
