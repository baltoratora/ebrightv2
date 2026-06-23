// Minimal 2D disc physics for Carrom / Pool. Pure, unit-tested.
// Coordinates are in pixels; the caller runs several steps per animation frame.

export interface Disc {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  alive: boolean;
  kind: string; // e.g. "striker" | "white" | "queen" | "cue" | "solid"
}

export interface Pocket {
  x: number;
  y: number;
  r: number;
}

const RESTITUTION = 0.96; // bounciness of disc-disc collisions
const WALL_BOUNCE = 0.9;
const STOP_EPS = 0.04;

/** Resolve an elastic collision between two overlapping discs (mass-weighted). */
export function collide(a: Disc, b: Disc): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  // push apart so they no longer overlap
  const overlap = a.r + b.r - dist;
  if (overlap > 0) {
    a.x -= (nx * overlap) / 2;
    a.y -= (ny * overlap) / 2;
    b.x += (nx * overlap) / 2;
    b.y += (ny * overlap) / 2;
  }

  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn > 0) return; // already separating

  const imp = (-(1 + RESTITUTION) * vn) / (1 / a.mass + 1 / b.mass);
  const ix = imp * nx;
  const iy = imp * ny;
  a.vx -= ix / a.mass;
  a.vy -= iy / a.mass;
  b.vx += ix / b.mass;
  b.vy += iy / b.mass;
}

/** Advance the simulation one tick. Returns ids pocketed this tick. */
export function stepOnce(
  discs: Disc[],
  w: number,
  h: number,
  pockets: Pocket[],
  damping: number,
): string[] {
  const live = discs.filter((d) => d.alive);
  for (const d of live) {
    d.x += d.vx;
    d.y += d.vy;
    d.vx *= damping;
    d.vy *= damping;
    if (Math.hypot(d.vx, d.vy) < STOP_EPS) {
      d.vx = 0;
      d.vy = 0;
    }
    if (d.x - d.r < 0) {
      d.x = d.r;
      d.vx = Math.abs(d.vx) * WALL_BOUNCE;
    } else if (d.x + d.r > w) {
      d.x = w - d.r;
      d.vx = -Math.abs(d.vx) * WALL_BOUNCE;
    }
    if (d.y - d.r < 0) {
      d.y = d.r;
      d.vy = Math.abs(d.vy) * WALL_BOUNCE;
    } else if (d.y + d.r > h) {
      d.y = h - d.r;
      d.vy = -Math.abs(d.vy) * WALL_BOUNCE;
    }
  }

  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist > 0 && dist < a.r + b.r) collide(a, b);
    }
  }

  const pocketed: string[] = [];
  for (const d of live) {
    for (const p of pockets) {
      if (Math.hypot(d.x - p.x, d.y - p.y) < p.r) {
        d.alive = false;
        d.vx = 0;
        d.vy = 0;
        pocketed.push(d.id);
        break;
      }
    }
  }
  return pocketed;
}

export function allStopped(discs: Disc[]): boolean {
  return discs.filter((d) => d.alive).every((d) => d.vx === 0 && d.vy === 0);
}
