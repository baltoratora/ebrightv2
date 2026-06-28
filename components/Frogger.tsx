"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceLane,
  collides,
  onLog,
  laneConfigForLevel,
  CELL,
  COLS,
  ROWS,
  W,
  H,
  START_ROW,
  START_COL,
  GOAL_BAYS,
  type Lane,
} from "@/lib/frogger";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

type Status = "idle" | "playing" | "over";

const FROG_R = 11;

// Car colour palette
const CAR_PALETTE = ["#e53e3e", "#dd6b20", "#3182ce", "#d69e2e", "#805ad5"];

export function Frogger() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── all game state in refs (never cause re-renders) ──────────────────────
  const lanesRef      = useRef<Lane[]>(laneConfigForLevel(1));
  const frogXRef      = useRef(START_COL * CELL + CELL / 2);
  const frogRowRef    = useRef(START_ROW);
  const filledBaysRef = useRef<Set<number>>(new Set());
  const statusRef     = useRef<Status>("idle");
  const levelRef      = useRef(1);
  const scoreRef      = useRef(0);
  const livesRef      = useRef(3);
  const prevTimeRef   = useRef(0);
  const dyingRef      = useRef(false);
  const dyingStartRef = useRef(0);
  const rafRef        = useRef(0);

  // ── react state (drives HUD outside canvas) ───────────────────────────────
  const [score,  setScore ] = useState(0);
  const [lives,  setLives ] = useState(3);
  const [status, setStatus] = useState<Status>("idle");
  const [level,  setLevel ] = useState(1);

  // ── draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const lanes  = lanesRef.current;
    const filled = filledBaysRef.current;

    // ── draw each lane row ────────────────────────────────────────────────
    for (let r = 0; r < ROWS; r++) {
      const lane = lanes[r];
      const y    = r * CELL;

      if (lane.kind === "goal") {
        // Top row background
        ctx.fillStyle = "#1a4731";
        ctx.fillRect(0, y, W, CELL);

        // Obstacle columns (odd columns)
        for (let c = 0; c < COLS; c++) {
          if (!GOAL_BAYS.includes(c)) {
            ctx.fillStyle = "#0f2218";
            ctx.fillRect(c * CELL, y, CELL, CELL);
          }
        }

        // Goal bays
        for (let bi = 0; bi < GOAL_BAYS.length; bi++) {
          const bx = GOAL_BAYS[bi] * CELL;
          if (filled.has(bi)) {
            ctx.fillStyle = "#276749";
            ctx.fillRect(bx + 2, y + 2, CELL - 4, CELL - 4);
            ctx.font = "14px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🐸", bx + CELL / 2, y + CELL / 2);
          } else {
            ctx.strokeStyle = "rgba(74,222,128,0.4)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx + 3, y + 3, CELL - 6, CELL - 6);
          }
        }
      } else if (lane.kind === "river") {
        ctx.fillStyle = "#1a4a7a";
        ctx.fillRect(0, y, W, CELL);

        // River ripple hints
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let rx = 4; rx < W - 4; rx += 24) {
          ctx.fillRect(rx, y + CELL / 2 - 1, 12, 2);
        }

        // Logs
        for (const e of lane.entities) {
          const ex = Math.round(e.x);
          ctx.fillStyle = "#7b4926";
          ctx.fillRect(ex, y + 5, e.len, CELL - 10);
          ctx.fillStyle = "#9b6040";
          ctx.fillRect(ex + 2, y + 6, e.len - 4, 4);
          // Grain lines
          ctx.strokeStyle = "rgba(0,0,0,0.22)";
          ctx.lineWidth = 1;
          for (let gx = ex + 14; gx < ex + e.len - 4; gx += 14) {
            ctx.beginPath();
            ctx.moveTo(gx, y + 5);
            ctx.lineTo(gx, y + CELL - 5);
            ctx.stroke();
          }
        }
      } else if (lane.kind === "road") {
        ctx.fillStyle = "#2d3748";
        ctx.fillRect(0, y, W, CELL);

        // Centre dashes
        ctx.save();
        ctx.setLineDash([8, 10]);
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y + CELL / 2);
        ctx.lineTo(W, y + CELL / 2);
        ctx.stroke();
        ctx.restore();

        // Vehicles
        for (let i = 0; i < lane.entities.length; i++) {
          const e  = lane.entities[i];
          const ex = Math.round(e.x);
          ctx.fillStyle = CAR_PALETTE[i % CAR_PALETTE.length];
          ctx.beginPath();
          ctx.roundRect(ex + 2, y + 6, e.len - 4, CELL - 12, 4);
          ctx.fill();
          // Windshield tint
          ctx.fillStyle = "rgba(180,220,255,0.32)";
          const ww = Math.min(14, (e.len - 10) * 0.35);
          const wx = lane.dir === 1 ? ex + e.len - 4 - ww : ex + 4;
          ctx.fillRect(wx, y + 9, ww, CELL - 18);
        }
      } else {
        // safe (grass)
        ctx.fillStyle = r === START_ROW ? "#276749" : "#1a5e38";
        ctx.fillRect(0, y, W, CELL);
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        for (let lx = 12; lx < W - 12; lx += 38) {
          ctx.beginPath();
          ctx.arc(lx, y + CELL / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Subtle row dividers
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
      ctx.stroke();
    }

    // ── frog ─────────────────────────────────────────────────────────────
    if (statusRef.current !== "idle") {
      const fx    = Math.round(frogXRef.current);
      const fy    = Math.round(frogRowRef.current * CELL + CELL / 2);
      const dying = dyingRef.current;

      ctx.save();
      if (dying) {
        const t = Math.min(1, (Date.now() - dyingStartRef.current) / 700);
        ctx.globalAlpha = 0.8 - t * 0.5;
      }
      ctx.translate(fx, fy);

      // Body
      ctx.fillStyle = dying ? "#fc8181" : "#48bb78";
      ctx.beginPath();
      ctx.arc(0, 0, FROG_R, 0, Math.PI * 2);
      ctx.fill();

      if (!dying) {
        // Eye sockets
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, Math.PI * 2);
        ctx.arc( 5, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(-4, -6, 2, 0, Math.PI * 2);
        ctx.arc( 6, -6, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // ── idle overlay ──────────────────────────────────────────────────────
    if (statusRef.current === "idle") {
      ctx.fillStyle = "rgba(5,6,13,0.72)";
      ctx.fillRect(0, H / 2 - 54, W, 108);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#eef1f8";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("🐸  Frogger", W / 2, H / 2 - 20);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#9aa0b8";
      ctx.fillText("Arrow keys / WASD to hop", W / 2, H / 2 + 10);
      ctx.fillText("Space or tap canvas to start", W / 2, H / 2 + 28);
    }
  }, []);

  // ── game loop ─────────────────────────────────────────────────────────────
  const loop = useCallback(
    (ts: number) => {
      if (prevTimeRef.current === 0) prevTimeRef.current = ts;
      const raw = (ts - prevTimeRef.current) / 1000;
      const dt  = Math.min(raw, 0.05) * 60; // normalised to 60 fps, capped
      prevTimeRef.current = ts;

      if (statusRef.current === "playing") {
        if (dyingRef.current) {
          // Death animation — wait 700 ms then apply penalty
          if (Date.now() - dyingStartRef.current > 700) {
            dyingRef.current = false;
            livesRef.current -= 1;
            setLives(livesRef.current);
            if (livesRef.current <= 0) {
              statusRef.current = "over";
              setStatus("over");
            } else {
              // Respawn frog at start
              frogXRef.current   = START_COL * CELL + CELL / 2;
              frogRowRef.current = START_ROW;
            }
          }
        } else {
          // Advance all lanes
          lanesRef.current = lanesRef.current.map((l) => advanceLane(l, dt));

          // Frog physics based on current row
          const row  = frogRowRef.current;
          const lane = lanesRef.current[row];

          if (lane.kind === "river") {
            const vel = onLog(frogXRef.current, lane);
            if (vel === null) {
              // Centre not on any log → water → die
              dyingRef.current      = true;
              dyingStartRef.current = Date.now();
            } else {
              frogXRef.current += vel * dt;
              // Drifted off the screen → die
              if (frogXRef.current < -CELL / 2 || frogXRef.current > W + CELL / 2) {
                dyingRef.current      = true;
                dyingStartRef.current = Date.now();
              }
            }
          } else if (lane.kind === "road") {
            if (collides(frogXRef.current, lane)) {
              dyingRef.current      = true;
              dyingStartRef.current = Date.now();
            }
          }
          // safe / goal lanes: no continuous hazard
        }
      }

      draw();

      // Keep rAF running unless game is over
      if (statusRef.current !== "over") {
        rafRef.current = requestAnimationFrame(loop);
      }
    },
    [draw],
  );

  // ── hop (grid movement on key / tap) ─────────────────────────────────────
  const hop = useCallback((dr: number, dc: number) => {
    if (statusRef.current !== "playing" || dyingRef.current) return;

    const newRow = Math.max(0, Math.min(ROWS - 1, frogRowRef.current + dr));
    // Column derived from floating x (log drift)
    const curCol = Math.max(0, Math.min(COLS - 1, Math.floor(frogXRef.current / CELL)));
    const newCol = Math.max(0, Math.min(COLS - 1, curCol + dc));
    const newX   = newCol * CELL + CELL / 2;

    if (newRow === 0) {
      // Arriving at goal row
      frogRowRef.current = 0;
      frogXRef.current   = newX;
      const bayIdx = GOAL_BAYS.indexOf(newCol);
      if (bayIdx === -1 || filledBaysRef.current.has(bayIdx)) {
        // Obstacle column or already-filled bay → die
        dyingRef.current      = true;
        dyingStartRef.current = Date.now();
      } else {
        // Score a bay!
        const next = new Set(filledBaysRef.current);
        next.add(bayIdx);
        filledBaysRef.current = next;

        const earned = 200 + levelRef.current * 50;
        scoreRef.current += earned;
        setScore(scoreRef.current);

        // All 5 bays filled → advance level
        if (filledBaysRef.current.size >= GOAL_BAYS.length) {
          levelRef.current += 1;
          setLevel(levelRef.current);
          filledBaysRef.current = new Set();
          lanesRef.current      = laneConfigForLevel(levelRef.current);
        }

        // Reset frog to start
        frogXRef.current   = START_COL * CELL + CELL / 2;
        frogRowRef.current = START_ROW;
      }
      return;
    }

    frogRowRef.current = newRow;
    frogXRef.current   = newX;

    // Immediate road collision check on landing
    const lane = lanesRef.current[newRow];
    if (lane.kind === "road" && collides(newX, lane)) {
      dyingRef.current      = true;
      dyingStartRef.current = Date.now();
    }
  }, []);

  // ── new / restart game ────────────────────────────────────────────────────
  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    levelRef.current      = 1;
    scoreRef.current      = 0;
    livesRef.current      = 3;
    filledBaysRef.current = new Set();
    lanesRef.current      = laneConfigForLevel(1);
    frogXRef.current      = START_COL * CELL + CELL / 2;
    frogRowRef.current    = START_ROW;
    dyingRef.current      = false;
    prevTimeRef.current   = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    statusRef.current = "playing";
    setStatus("playing");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ── mount: kick off render loop to show idle screen ───────────────────────
  useEffect(() => {
    const cv  = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width  = W * dpr;
    cv.height = H * dpr;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs (e.g. the leaderboard name field).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (statusRef.current !== "playing") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          newGame();
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":    case "w": case "W": e.preventDefault(); hop(-1,  0); break;
        case "ArrowDown":  case "s": case "S": e.preventDefault(); hop( 1,  0); break;
        case "ArrowLeft":  case "a": case "A": e.preventDefault(); hop( 0, -1); break;
        case "ArrowRight": case "d": case "D": e.preventDefault(); hop( 0,  1); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hop, newGame]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "↑ ↓ ← →", desc: "Hop frog" },
          { key: "WASD",     desc: "Hop (alternate)" },
          { key: "Space",    desc: "Start / restart" },
        ]}
        tips={[
          "Ride logs across the river — don't fall in!",
          "Watch out for cars in the road lanes",
          "Fill all 5 green bays at the top to level up",
        ]}
      />

      <div className="frog-root">
        <div className="frog-bar">
          <span className="frog-stat" aria-live="polite">
            Score {score} · Lv {level} · {"❤️".repeat(Math.max(0, lives))}
            {status === "over" ? " · Game Over" : ""}
          </span>
          <button className="btn ghost" onClick={newGame}>New</button>
        </div>

        <div className="frog-stage">
          <canvas
            ref={canvasRef}
            className="frog-canvas"
            role="img"
            aria-label="Frogger — use the arrow keys, WASD, or the on-screen D-pad to hop the frog up across the road and river to the goal bays. Avoid the cars and don't fall in the water. Press Space or tap to start."
            style={{ width: W, height: H }}
            onClick={() => {
              if (statusRef.current !== "playing") newGame();
            }}
          />
          {status === "over" && (
            <div className="frog-overlay">
              <div className="frog-overlay-title">Game Over</div>
              <div className="frog-overlay-sub">Final score: {score}</div>
              <button className="btn" onClick={newGame}>Play Again</button>
            </div>
          )}
        </div>

        {/* Touch D-pad for mobile */}
        <div className="frog-dpad" aria-label="D-pad controls">
          <button
            className="frog-dpad-btn"
            style={{ gridArea: "up" }}
            onClick={() => hop(-1, 0)}
            aria-label="Move up"
          >▲</button>
          <button
            className="frog-dpad-btn"
            style={{ gridArea: "left" }}
            onClick={() => hop(0, -1)}
            aria-label="Move left"
          >◀</button>
          <div style={{ gridArea: "center" }} />
          <button
            className="frog-dpad-btn"
            style={{ gridArea: "right" }}
            onClick={() => hop(0, 1)}
            aria-label="Move right"
          >▶</button>
          <button
            className="frog-dpad-btn"
            style={{ gridArea: "down" }}
            onClick={() => hop(1, 0)}
            aria-label="Move down"
          >▼</button>
        </div>

        <div className="frog-hint">
          Arrow keys / WASD to hop · Space or tap canvas to start
        </div>
      </div>

      <GameLeaderboard
        game="frogger"
        value={score}
        over={status === "over"}
        title="Frogger"
      />
    </div>
  );
}
