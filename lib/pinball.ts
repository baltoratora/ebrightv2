// Pinball math: ball vs line-segment and circle (bumper) collisions. Pure, tested.

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function closestOnSeg(px: number, py: number, s: Seg): { x: number; y: number } {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len2 = dx * dx + dy * dy || 1e-6;
  let t = ((px - s.x1) * dx + (py - s.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: s.x1 + t * dx, y: s.y1 + t * dy };
}

/** Reflect the ball off a segment if touching. `kick` adds outward speed
 *  (used for swinging flippers). Returns true on contact. */
export function collideSeg(ball: Ball, s: Seg, restitution: number, kick = 0): boolean {
  const cp = closestOnSeg(ball.x, ball.y, s);
  let nx = ball.x - cp.x;
  let ny = ball.y - cp.y;
  let dist = Math.hypot(nx, ny);
  if (dist > ball.r) return false;
  if (dist < 1e-6) {
    nx = 0;
    ny = -1;
    dist = 1;
  } else {
    nx /= dist;
    ny /= dist;
  }
  ball.x = cp.x + nx * ball.r;
  ball.y = cp.y + ny * ball.r;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
  }
  if (kick) {
    ball.vx += nx * kick;
    ball.vy += ny * kick;
  }
  return true;
}

/** Bounce off a circular bumper with a little extra energy. Returns true on hit. */
export function collideCircle(ball: Ball, cx: number, cy: number, cr: number, kick: number): boolean {
  let nx = ball.x - cx;
  let ny = ball.y - cy;
  let dist = Math.hypot(nx, ny);
  if (dist > ball.r + cr) return false;
  if (dist < 1e-6) {
    nx = 0;
    ny = -1;
    dist = 1;
  } else {
    nx /= dist;
    ny /= dist;
  }
  ball.x = cx + nx * (ball.r + cr);
  ball.y = cy + ny * (ball.r + cr);
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= 1.25 * vn * nx;
    ball.vy -= 1.25 * vn * ny;
  }
  ball.vx += nx * kick;
  ball.vy += ny * kick;
  return true;
}

export function flipperSeg(px: number, py: number, len: number, angleRad: number): Seg {
  return { x1: px, y1: py, x2: px + Math.cos(angleRad) * len, y2: py + Math.sin(angleRad) * len };
}

// Returns the current bumper score multiplier based on total bumper hits.
export function bumperMultiplier(hits: number): number {
  if (hits >= 50) return 5;
  if (hits >= 25) return 3;
  if (hits >= 10) return 2;
  return 1;
}
