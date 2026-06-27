// Tower Defense — pure game logic. No Math.random or Date.now at module scope.
// Rendering and rAF animation live in components/TowerDefense.tsx.

export const COLS = 18;
export const ROWS = 14;
export const CELL = 32;
export const W = COLS * CELL; // 576
export const H = ROWS * CELL; // 448

export const STARTING_GOLD = 150;
export const STARTING_LIVES = 20;

// ─── PATH ────────────────────────────────────────────────────────────────────
// Fixed waypoints as [col, row]. Enemies travel through them in order.
export const PATH_WAYPOINTS: [number, number][] = [
  [0,  2],
  [5,  2],
  [5,  7],
  [10, 7],
  [10, 11],
  [17, 11],
];

// Pixel-centre coordinates for each waypoint.
export const PATH_PX: [number, number][] = PATH_WAYPOINTS.map(
  ([c, r]) => [c * CELL + CELL / 2, r * CELL + CELL / 2] as [number, number],
);

// All grid cells that lie on a path segment (not buildable).
function buildPathCells(): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const [c1, r1] = PATH_WAYPOINTS[i];
    const [c2, r2] = PATH_WAYPOINTS[i + 1];
    if (c1 === c2) {
      const rMin = Math.min(r1, r2);
      const rMax = Math.max(r1, r2);
      for (let r = rMin; r <= rMax; r++) s.add(`${c1},${r}`);
    } else {
      const cMin = Math.min(c1, c2);
      const cMax = Math.max(c1, c2);
      for (let c = cMin; c <= cMax; c++) s.add(`${c},${r1}`);
    }
  }
  return s;
}

const PATH_CELLS = buildPathCells();

export function isPathCell(col: number, row: number): boolean {
  return PATH_CELLS.has(`${col},${row}`);
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type TowerKind = "basic" | "sniper" | "splash";

export interface TowerDef {
  kind: TowerKind;
  label: string;
  range: number;    // pixels
  damage: number;
  fireRate: number; // shots per second
  cost: number;
  color: string;
  splashRadius: number; // 0 for non-splash
}

export const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  basic: {
    kind: "basic",
    label: "Basic",
    range: 120,
    damage: 12,
    fireRate: 1.5,
    cost: 50,
    color: "#3182ce",
    splashRadius: 0,
  },
  sniper: {
    kind: "sniper",
    label: "Sniper",
    range: 200,
    damage: 45,
    fireRate: 0.5,
    cost: 100,
    color: "#d69e2e",
    splashRadius: 0,
  },
  splash: {
    kind: "splash",
    label: "Splash",
    range: 90,
    damage: 18,
    fireRate: 0.8,
    cost: 75,
    color: "#e53e3e",
    splashRadius: 50,
  },
};

export interface Tower {
  id: number;
  kind: TowerKind;
  col: number;
  row: number;
  lastFired: number; // ms timestamp — set/read only inside rAF loop, never at module scope
}

export interface Enemy {
  id: number;
  x: number;           // pixel x (centre)
  y: number;           // pixel y (centre)
  hp: number;
  maxHp: number;
  speed: number;       // px per second
  pathIndex: number;   // index of the NEXT waypoint to head toward
  reward: number;      // gold awarded on kill
  dead: boolean;
  reachedEnd: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  tx: number;        // target pixel x (fixed at fire time)
  ty: number;        // target pixel y (fixed at fire time)
  speed: number;     // px per second
  damage: number;
  targetEnemyId: number;
  isSplash: boolean;
  splashRadius: number;
}

export interface WaveConfig {
  count: number;
  hp: number;
  speed: number;  // px per second
  reward: number; // gold per kill
}

// ─── WAVE CONFIG ─────────────────────────────────────────────────────────────

export function waveConfig(waveNum: number): WaveConfig {
  const n = Math.max(1, waveNum);
  return {
    count: 5 + (n - 1) * 3,
    hp: 50 + (n - 1) * 30,
    speed: 55 + (n - 1) * 8,
    reward: 10 + Math.floor((n - 1) / 5) * 5,
  };
}

// ─── ENEMY MOVEMENT ──────────────────────────────────────────────────────────

export function advanceEnemy(enemy: Enemy, dt: number): Enemy {
  if (enemy.dead || enemy.reachedEnd) return enemy;

  let { x, y, pathIndex } = enemy;
  let dist = enemy.speed * dt;

  while (dist > 0 && pathIndex < PATH_PX.length) {
    const [tx, ty] = PATH_PX[pathIndex];
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d <= dist) {
      x = tx;
      y = ty;
      dist -= d;
      pathIndex += 1;
    } else {
      const ratio = dist / d;
      x += dx * ratio;
      y += dy * ratio;
      dist = 0;
    }
  }

  const reachedEnd = pathIndex >= PATH_PX.length;
  return { ...enemy, x, y, pathIndex, reachedEnd };
}

// ─── TOWER TARGETING ─────────────────────────────────────────────────────────

/** All live enemies within this tower's range, sorted furthest-along-path first. */
export function enemiesInRange(tower: Tower, enemies: Enemy[]): Enemy[] {
  const def = TOWER_DEFS[tower.kind];
  const tx = tower.col * CELL + CELL / 2;
  const ty = tower.row * CELL + CELL / 2;
  return enemies
    .filter((e) => {
      if (e.dead || e.reachedEnd) return false;
      const dx = e.x - tx;
      const dy = e.y - ty;
      return Math.sqrt(dx * dx + dy * dy) <= def.range;
    })
    .sort((a, b) => b.pathIndex - a.pathIndex);
}

// ─── DAMAGE ──────────────────────────────────────────────────────────────────

export function applyDamage(enemy: Enemy, damage: number): Enemy {
  const newHp = Math.max(0, enemy.hp - damage);
  return { ...enemy, hp: newHp, dead: newHp <= 0 };
}

// ─── PLACEMENT ───────────────────────────────────────────────────────────────

export function canPlaceTower(
  state: { towers: Tower[]; gold: number; selectedTowerKind: TowerKind },
  col: number,
  row: number,
): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  if (isPathCell(col, row)) return false;
  if (state.towers.some((t) => t.col === col && t.row === row)) return false;
  const cost = TOWER_DEFS[state.selectedTowerKind].cost;
  return state.gold >= cost;
}

// ─── ECONOMY HELPERS ─────────────────────────────────────────────────────────

export function canAfford(gold: number, kind: TowerKind): boolean {
  return gold >= TOWER_DEFS[kind].cost;
}

/** Gold refunded when selling a tower (60% of build cost, floored). */
export function sellRefund(tower: Tower): number {
  return Math.floor(TOWER_DEFS[tower.kind].cost * 0.6);
}
