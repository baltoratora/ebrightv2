"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  R, CANVAS_W, DANGER_ROW,
  bubbleX, bubbleY, colsForRow,
  newGridForLevel, randomColorForLevel, placeBubbleEx,
  advanceCeiling, gridFromLevel, LEVELS,
  isDanger, isCleared, snapToGrid,
  BOMB, WILD,
  type BubbleColor, type Grid,
} from "@/lib/bubblebobble";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const W = CANVAS_W;        // 308
const H = 500;
const SX = W / 2;          // shooter x
const SY = H - 44;         // shooter y
const SPEED = 7;
const MIN_UP = 20 * (Math.PI / 180);

// ── helpers ────────────────────────────────────────────────────────────────

const _lightenCache: Record<string, string> = {};
function lighten(hex: string): string {
  if (_lightenCache[hex]) return _lightenCache[hex];
  if (hex.length < 4 || hex[0] !== "#") return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + 70);
  const g = Math.min(255, ((n >> 8) & 0xff) + 70);
  const b = Math.min(255, (n & 0xff) + 70);
  return (_lightenCache[hex] = `rgb(${r},${g},${b})`);
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

// Draw a bubble that may be a special type (bomb or wild).
function drawBubbleOfColor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, radius: number,
  color: BubbleColor, alpha = 1,
) {
  if (color === BOMB) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const grd = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, radius * 0.05, x, y, radius);
    grd.addColorStop(0, "#636e72");
    grd.addColorStop(1, "#2d3436");
    ctx.beginPath();
    ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,100,100,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `${Math.round(radius * 1.1)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💥", x, y + 1);
    ctx.restore();
  } else if (color === WILD) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const grd = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.35, radius * 0.05, x, y, radius);
    grd.addColorStop(0, "#fff");
    grd.addColorStop(0.35, "#ffa502");
    grd.addColorStop(0.65, "#1e90ff");
    grd.addColorStop(1, "#2ed573");
    ctx.beginPath();
    ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `${Math.round(radius * 1.1)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐", x, y + 1);
    ctx.restore();
  } else {
    drawBubble(ctx, x, y, radius, color, alpha);
  }
}

/** Trace a bounced aim-line from (sx,sy) in direction (nx,ny). */
function aimPath(nx: number, ny: number): [number, number][] {
  const pts: [number, number][] = [[SX, SY]];
  let x = SX, y = SY;
  let vx = nx * 10;
  const vy = ny * 10;
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
  if (ny > -Math.sin(MIN_UP)) {
    ny = -Math.sin(MIN_UP);
    nx = nx < 0 ? -Math.cos(MIN_UP) : Math.cos(MIN_UP);
  }
  return [nx, ny];
}

// ── types ──────────────────────────────────────────────────────────────────

interface Floater { id: number; x: number; y: number; text: string; }

// ── component ──────────────────────────────────────────────────────────────

export function PuzzleBobble() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Grid>(gridFromLevel(LEVELS[0]));
  const ballRef = useRef({ x: SX, y: SY, vx: 0, vy: 0, active: false });
  const curColorRef = useRef<BubbleColor>(randomColorForLevel(1));
  const nextColorRef = useRef<BubbleColor>(randomColorForLevel(1));
  const aimRef = useRef<[number, number]>([0, -1]);
  const rafRef = useRef(0);
  const aimRafRef = useRef(0);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const shotsRef = useRef(0);
  const floaterIdRef = useRef(0);
  const levelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [shots, setShots] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);

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

    // Grid bubbles (special types rendered distinctly)
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const col = grid[r][c];
        if (!col) continue;
        drawBubbleOfColor(ctx, bubbleX(r, c), bubbleY(r), R, col);
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

    if (!ball.active && !over && !levelComplete) {
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
    drawBubbleOfColor(
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
    drawBubbleOfColor(ctx, W - 28, SY, R * 0.72, nextColorRef.current);
  }, [over, levelComplete]);

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
    const result = placeBubbleEx(grid, row, col, curColorRef.current);
    scoreRef.current += result.points;
    setScore(scoreRef.current);

    // Show combo floater for group pop
    if (result.groupCells.length > 0) {
      const cx = result.groupCells.reduce((s, [r, c]) => s + bubbleX(r, c), 0) / result.groupCells.length;
      const cy = result.groupCells.reduce((s, [r]) => s + bubbleY(r), 0) / result.groupCells.length;
      const id = ++floaterIdRef.current;
      setFloaters(prev => [...prev, { id, x: cx, y: cy, text: `+${result.groupCells.length * 10}` }]);
      setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 1000);
    }

    // Show combo floater for dropped floating bubbles
    if (result.floatCells.length > 0) {
      const fx = result.floatCells.reduce((s, [r, c]) => s + bubbleX(r, c), 0) / result.floatCells.length;
      const fy = result.floatCells.reduce((s, [r]) => s + bubbleY(r), 0) / result.floatCells.length;
      const id = ++floaterIdRef.current;
      setFloaters(prev => [...prev, { id, x: fx, y: fy, text: `+${result.floatCells.length * 20}` }]);
      setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 1000);
    }

    // Shot counter; advance ceiling when limit hit
    shotsRef.current += 1;
    setShots(shotsRef.current);
    const lv = levelRef.current;
    const limit = 20 + (10 - Math.min(lv, 10)) * 2;
    if (shotsRef.current % limit === 0) {
      const topRow = Array.from({ length: colsForRow(0) }, () => randomColorForLevel(lv));
      advanceCeiling(grid, topRow);
    }

    if (isCleared(grid)) {
      ballRef.current.active = false;
      setLevelComplete(true);
      draw();
      const nl = lv + 1;
      // Tracked so "New" (or unmount) during the 2s level-complete pause can
      // cancel it — otherwise it later overwrites the fresh game with level nl.
      levelTimerRef.current = setTimeout(() => {
        const idx = nl - 1;
        gridRef.current = idx < LEVELS.length ? gridFromLevel(LEVELS[idx]) : newGridForLevel(nl);
        levelRef.current = nl;
        shotsRef.current = 0;
        curColorRef.current = randomColorForLevel(nl);
        nextColorRef.current = randomColorForLevel(nl);
        ballRef.current = { x: SX, y: SY, vx: 0, vy: 0, active: false };
        setLevel(nl);
        setShots(0);
        setLevelComplete(false);
        draw();
      }, 2000);
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
    nextColorRef.current = randomColorForLevel(lv);
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
    if (ballRef.current.active || over || levelComplete) return;
    const [nx, ny] = clampDir(targetX - SX, targetY - SY);
    ballRef.current.active = true;
    ballRef.current.vx = nx * SPEED;
    ballRef.current.vy = ny * SPEED;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  }, [over, levelComplete, loop]);

  // ── new game ─────────────────────────────────────────────────────────────

  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (levelTimerRef.current) clearTimeout(levelTimerRef.current);
    runningRef.current = false;
    gridRef.current = gridFromLevel(LEVELS[0]);
    curColorRef.current = randomColorForLevel(1);
    nextColorRef.current = randomColorForLevel(1);
    ballRef.current = { x: SX, y: SY, vx: 0, vy: 0, active: false };
    aimRef.current = [0, -1];
    scoreRef.current = 0;
    levelRef.current = 1;
    shotsRef.current = 0;
    floaterIdRef.current = 0;
    setScore(0);
    setOver(false);
    setLevel(1);
    setShots(0);
    setLevelComplete(false);
    setFloaters([]);
  }, []);

  // ── canvas setup + redraw on state change ────────────────────────────────

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    draw();
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (levelTimerRef.current) clearTimeout(levelTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { draw(); }, [score, over, level, shots, levelComplete, draw]);

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
    if (ballRef.current.active || over || levelComplete) return;
    const { x, y } = cvCoords(e);
    aimRef.current = clampDir(x - SX, y - SY);
    cancelAnimationFrame(aimRafRef.current);
    aimRafRef.current = requestAnimationFrame(() => draw());
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

  const shotLimit = 20 + (10 - Math.min(level, 10)) * 2;

  return (
    <div className="game-layout game-layout--col">
      <GameInfo
        controls={[
          { key: "Mouse", desc: "Aim direction" },
          { key: "Click", desc: "Fire bubble" },
        ]}
        tips={["Bank shots off walls to reach tricky spots", "Popping 3+ same-color bubbles scores chain points", "💥 Bomb clears all 6 neighbours · ⭐ Wild matches any colour"]}
      />
      <div className="pb-wrap">
        <div className="sudoku-bar">
          <span className="wg-progress" aria-live="polite">Score {score}</span>
          <span className="wg-progress">Lv {level}</span>
          <span className="wg-progress">Shots {shots}/{shotLimit}</span>
          <button className="btn ghost" onClick={newGame}>New</button>
        </div>

        <div style={{ position: "relative", display: "block" }}>
          <canvas
            ref={cvRef}
            className="pb-canvas"
            role="img"
            aria-label="Puzzle Bobble — move the mouse or drag to aim, then click or tap to fire the bubble. Match three or more of the same colour to pop them; clear the board before the bubbles cross the danger line. Pointer or touch only."
            style={{ width: W, height: H, maxWidth: "100%" }}
            onMouseMove={onMouseMove}
            onClick={onClick}
            onTouchStart={onTouch}
            onTouchMove={onTouch}
            onTouchEnd={onTouch}
          />
          {floaters.map(f => (
            <span
              key={f.id}
              className="pb-floater"
              style={{ left: f.x, top: f.y }}
            >
              {f.text}
            </span>
          ))}
        </div>

        {over && (
          <div className="sudoku-win lost" role="alert">
            💥 Game over — bubbles reached the line
          </div>
        )}
        {levelComplete && (
          <div className="sudoku-win" role="status" aria-live="polite">
            🎉 Level {level} complete! Loading level {level + 1}…
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
