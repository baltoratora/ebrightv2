// Brick Breaker (Breakout) collision math + brick layout. Pure, unit-tested.

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Brick extends Rect {
  alive: boolean;
  color: string;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function circleRectHit(ball: Ball, rect: Rect): boolean {
  const cx = clamp(ball.x, rect.x, rect.x + rect.w);
  const cy = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

/** Reflect the ball off a rectangle if touching. Returns true on contact. */
export function bounceOffRect(ball: Ball, rect: Rect): boolean {
  const cx = clamp(ball.x, rect.x, rect.x + rect.w);
  const cy = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > ball.r * ball.r) return false;

  const dist = Math.sqrt(d2);
  if (dist > 1e-4) {
    // ball center outside the rect → reflect along the contact normal
    const nx = dx / dist;
    const ny = dy / dist;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= 2 * vn * nx;
      ball.vy -= 2 * vn * ny;
    }
    ball.x += nx * (ball.r - dist);
    ball.y += ny * (ball.r - dist);
  } else {
    // center inside the rect → flip on the shallowest axis
    const left = ball.x - rect.x;
    const right = rect.x + rect.w - ball.x;
    const top = ball.y - rect.y;
    const bottom = rect.y + rect.h - ball.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left || m === right) ball.vx = -ball.vx;
    else ball.vy = -ball.vy;
  }
  return true;
}

const COLORS = ["#ff5d8f", "#fb923c", "#fde047", "#4ade80", "#22d3ee", "#b388ff"];

export function makeBricks(
  rows: number,
  cols: number,
  areaW: number,
  top: number,
  gap: number,
  brickH: number,
): Brick[] {
  const bw = (areaW - gap * (cols + 1)) / cols;
  const out: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        x: gap + c * (bw + gap),
        y: top + r * (brickH + gap),
        w: bw,
        h: brickH,
        alive: true,
        color: COLORS[r % COLORS.length],
      });
    }
  }
  return out;
}
