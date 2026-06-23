"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  R, CANVAS_W, ROW_H, DANGER_ROW,
  bubbleX, bubbleY, colsForRow,
  newGrid, randomColor, placeBubble, isDanger, isCleared, snapToGrid,
  type BubbleColor, type Grid,
} from "@/lib/bubblebobble";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const W = CANVAS_W;        // 308
const H = 500;
const SX = W / 2;          // shooter x
const SY = H - 44;         // shooter y
const SPEED = 7;
const MIN_UP = 20 * (Math.PI / 180); // minimum upward angle from horizontal

// ── helpers ────────────────────────────────────────────────────────────────

function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + 70);
  const g = Math.min(255, ((n >> 8) & 0xff) + 70);
  const b = Math.min(255, (n & 0xff) + 70);
  return `rgb(${r},${g},${b})`;
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  color: string, alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grd = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, radius * 0.05, x, y, radius);
  grd.addColorStop(0, lighten(color));
  grd.addColorStop(1, color);
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Trace a bounced aim-line from (sx,sy) in direction (nx,ny). */
function aimPath(nx: number, ny: number): [number, number][] {
  const pts: [number, number][] = [[SX, SY]];
  let x = SX, y = SY;
  let vx = nx * 10, vy = ny * 10;
  for (let i = 0; i < 50; i++) {
    x += vx; y += vy;
    if (x - R < 0) { x = R; vx = Math.abs(vx); }
    if (x + R > W) { x = W - R; vx = -Math.abs(vx); }
    pts.push([x, y]);
    if (y < 0) break;
  }
  return pts;
}

function clampDir(dx: number, dy: number): [number, number] {
  const len = Math.hypot(dx, dy);
  if (len < 1) return [0, -1];
  let nx = dx / len, ny = dy / len;
  // Must shoot upward; clamp to MIN_UP from horizontal
  if (ny > -Math.sin(MIN_UP)) {
    ny = -Math.sin(MIN_UP);
    nx = nx < 0 ? -Math.cos(MIN_UP) : Math.cos(MIN_UP);
  }
  return [nx, ny];
}

// ── component ──────────────────────────────────────────────────────────────

export function PuzzleBobble() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Grid>(newGrid());
  const ballRef = useRef({ x: SX, y: SY, vx: 0, vy: 0, active: false });
  const curColorRef = useRef<BubbleColor>(randomColor());
  const nextColorRef = useRef<BubbleColor>(randomColor());
  const aimRef = useRef<[number, number]>([0, -1]); // normalised direction
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);

  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [cleared, setCleared] = useState(false);

  // ── draw ─────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = "#070917";
    ctx.fillRect(0, 0, W, H);

    const grid = gridRef.current;

    // Grid bubbles
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const col = grid[r][c];
        if (!col) continue;
        drawBubble(ctx, bubbleX(r, c), bubbleY(r), R, col);
      }
    }

    // Danger line
    const dangerY = bubbleY(DANGER_ROW) + R + 4;
    ctx.save();
    ctx.strokeStyle = "rgba(255,71,87,0.4)";
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(W, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const ball = ballRef.current;

    if (!ball.active && !over) {
      // Aim trajectory
      const [nx, ny] = aimRef.current;
      const pts = aimPath(nx, ny);
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.setLineDash([5, 8]);
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Active ball or waiting ball at shooter
    drawBubble(
      ctx,
      ball.active ? ball.x : SX,
      ball.active ? ball.y : SY,
      R,
      curColorRef.current,
    );

    // Shooter bracket
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SX - 20, SY + 18);
    ctx.lineTo(SX, SY + 8);
    ctx.lineTo(SX + 20, SY + 18);
    ctx.stroke();
    ctx.restore();

    // NEXT label + preview bubble
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", W - 46, SY - 18);
    drawBubble(ctx, W - 28, SY, R * 0.72, nextColorRef.current);
  }, [over]);

  // ── land ─────────────────────────────────────────────────────────────────

  const land = useCallback((px: number, py: number) => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);

    const grid = gridRef.current;
    const snap = snapToGrid(grid, px, py);

    if (!snap) {
      ballRef.current.active = false;
      draw();
      return;
    }

    const [row, col] = snap;
    const pts = placeBubble(grid, row, col, curColorRef.current);
    scoreRef.current += pts;
    setScore(scoreRef.current);

    if (isCleared(grid)) {
      ballRef.current.active = false;
      setCleared(true);
      setOver(true);
      draw();
      return;
    }

    if (isDanger(grid)) {
      ballRef.current.active = false;
      setOver(true);
      draw();
      return;
    }

    // Ready next ball
    curColorRef.current = nextColorRef.current;
    nextColorRef.current = randomColor();
    ballRef.current = { x: SX, y: SY, vx: 0, vy: 0, active: false };
    draw();
  }, [draw]);

  // ── loop ─────────────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const ball = ballRef.current;
    const grid = gridRef.current;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - R < 0) { ball.x = R; ball.vx = Math.abs(ball.vx); }
    if (ball.x + R > W) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }

    // Hit ceiling
    if (ball.y - R <= 0) { land(ball.x, R); return; }

    // Hit grid bubble
    outer: for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < colsForRow(r); c++) {
        if (!grid[r][c]) continue;
        const dx = ball.x - bubbleX(r, c);
        const dy = ball.y - bubbleY(r);
        if (dx * dx + dy * dy < (2 * R - 1) ** 2) {
          land(ball.x, ball.y);
          break outer;
        }
      }
    }

    if (runningRef.current) {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [draw, land]);

  // ── fire ─────────────────────────────────────────────────────────────────

  const fire = useCallback((targetX: number, targetY: number) => {
    if (ballRef.current.active || over) return;
    const [nx, ny] = clampDir(targetX - SX, targetY - SY);
    ballRef.current.active = true;
    ballRef.current.vx = nx * SPEED;
    ballRef.current.vy = ny * SPEED;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  }, [over, loop]);

  // ── new game ─────────────────────────────────────────────────────────────

  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    runningRef.current = false;
    gridRef.current = newGrid();
    curColorRef.current = randomColor();
    nextColorRef.current = randomColor();
    ballRef.current = { x: SX, y: SY, vx: 0, vy: 0, active: false };
    aimRef.current = [0, -1];
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    setCleared(false);
    // draw happens via the useEffect below
  }, []);

  // ── canvas setup + redraw on state change ────────────────────────────────

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    draw();
    return () => { runningRef.current = false; cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { draw(); }, [score, over, draw]);

  // ── input helpers ─────────────────────────────────────────────────────────

  const cvCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const cv = cvRef.current!;
    const rect = cv.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const src = "touches" in e
      ? (e.touches[0] ?? e.changedTouches[0])
      : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (ballRef.current.active || over) return;
    const { x, y } = cvCoords(e);
    aimRef.current = clampDir(x - SX, y - SY);
    draw();
  };

  const onClick = (e: React.MouseEvent) => {
    const { x, y } = cvCoords(e);
    fire(x, y);
  };

  const onTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = cvCoords(e);
    aimRef.current = clampDir(x - SX, y - SY);
    if (e.type === "touchend") fire(x, y);
    else draw();
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="game-layout game-layout--col">
      <div className="pb-wrap">
        <div className="sudoku-bar">
          <span className="wg-progress">Score {score}</span>
          <button className="btn ghost" onClick={newGame}>New</button>
        </div>

        <canvas
          ref={cvRef}
          className="pb-canvas"
          style={{ width: W, height: H, maxWidth: "100%" }}
          onMouseMove={onMouseMove}
          onClick={onClick}
          onTouchStart={onTouch}
          onTouchMove={onTouch}
          onTouchEnd={onTouch}
        />

        {over && (
          <div className={`sudoku-win${cleared ? "" : " lost"}`}>
            {cleared ? "🎉 Cleared! Amazing!" : "💥 Game over — bubbles reached the line"}
          </div>
        )}

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            Move mouse to aim · click or tap to fire · match 3+ same colour to pop
          </span>
        </div>
      </div>

      <GameLeaderboard
        game="bubblebobble"
        value={score}
        over={over}
        title="Puzzle Bobble"
      />
    </div>
  );
}
