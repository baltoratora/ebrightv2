"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bounceOffRect, getLevelRows, getLevelSpeedMult, makeBricks, type Ball, type Brick } from "@/lib/breakout";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const W = 320;
const H = 440;
const BALL_R = 6;
const SPEED = 1.5;
const SUB = 3;
const PADDLE_W = 84;
const PADDLE_H = 12;
const PADDLE_Y = H - 26;
const COLS = 8;
const PU_SIZE = 12;
const PU_FALL = 1.2; // px per frame

type Status = "docked" | "playing" | "over";

interface FallingPU {
  x: number;
  y: number;
  type: "wide" | "slow" | "multi";
}

export function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([{ x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, r: BALL_R }]);
  const padX = useRef(W / 2);
  const bricksRef = useRef<Brick[]>(makeBricks(getLevelRows(1), COLS, W, 46, 5, 16, 1));
  const statusRef = useRef<Status>("docked");
  const rafRef = useRef(0);
  const levelRef = useRef(1);
  const puRef = useRef<FallingPU[]>([]);
  const widePaddleEndRef = useRef(0);
  const slowEndRef = useRef(0);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  const [status, setStatus] = useState<Status>("docked");
  const [level, setLevel] = useState(1);
  const [levelBanner, setLevelBanner] = useState<number | null>(null);

  const setStat = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
  };

  const effectivePW = () => (Date.now() < widePaddleEndRef.current ? PADDLE_W * 1.5 : PADDLE_W);

  const paddleRect = () => {
    const pw = effectivePW();
    return { x: padX.current - pw / 2, y: PADDLE_Y, w: pw, h: PADDLE_H };
  };

  const levelSpeed = () => SPEED * getLevelSpeedMult(levelRef.current);

  const effectiveSpeed = () => {
    const spd = levelSpeed();
    return Date.now() < slowEndRef.current ? spd * 0.6 : spd;
  };

  const showBanner = (lvl: number) => {
    setLevelBanner(lvl);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setLevelBanner(null), 2000);
  };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0c18";
    ctx.fillRect(0, 0, W, H);

    // Draw bricks; hard bricks show steel color, cracked bricks show normal color with crack mark
    for (const b of bricksRef.current) {
      if (!b.alive) continue;
      ctx.fillStyle = b.maxHits > 1 && b.hits === b.maxHits ? "#8898b8" : b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.maxHits > 1 && b.hits < b.maxHits) {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.35, b.y);
        ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.5);
        ctx.lineTo(b.x + b.w * 0.65, b.y + b.h);
        ctx.stroke();
      }
    }

    // Falling power-up tokens
    for (const pu of puRef.current) {
      ctx.fillStyle = pu.type === "wide" ? "#60a5fa" : pu.type === "slow" ? "#a78bfa" : "#34d399";
      ctx.fillRect(pu.x - PU_SIZE / 2, pu.y - PU_SIZE / 2, PU_SIZE, PU_SIZE);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pu.type[0].toUpperCase(), pu.x, pu.y);
    }

    // Active effect indicators (top-right corner of canvas)
    const now = Date.now();
    let ix = W - 6;
    if (now < widePaddleEndRef.current) {
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(ix - 12, 4, 12, 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("W", ix - 6, 9);
      ix -= 16;
    }
    if (now < slowEndRef.current) {
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(ix - 12, 4, 12, 10);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", ix - 6, 9);
    }

    // Paddle (dynamic width from wide power-up)
    const p = paddleRect();
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 6);
    ctx.fill();

    // All active balls
    ctx.fillStyle = "#fafafa";
    for (const ball of ballsRef.current) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const loop = useCallback(() => {
    if (statusRef.current === "docked") {
      const docked = ballsRef.current[0];
      if (docked) {
        docked.x = padX.current;
        docked.y = PADDLE_Y - BALL_R;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    if (statusRef.current !== "playing") return;

    let gained = 0;
    // Snapshot effective speed and paddle for this frame (stable across substeps)
    const spd = effectiveSpeed();
    const pw = effectivePW();
    const pr = { x: padX.current - pw / 2, y: PADDLE_Y, w: pw, h: PADDLE_H };

    for (let k = 0; k < SUB; k++) {
      const alive: Ball[] = [];

      for (const ball of ballsRef.current) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall bounces
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        else if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

        // Paddle bounce with angle control
        if (ball.vy > 0 && bounceOffRect(ball, pr)) {
          const off = (ball.x - padX.current) / (pw / 2);
          ball.vx = off * spd * 0.85;
          ball.vy = -Math.sqrt(Math.max(0.2, spd * spd - ball.vx * ball.vx));
        }

        // Brick collision with durability
        for (const br of bricksRef.current) {
          if (br.alive && bounceOffRect(ball, br)) {
            br.hits -= 1;
            if (br.hits <= 0) {
              br.alive = false;
              gained += 100;
              if (br.powerup) puRef.current.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type: br.powerup });
            } else {
              gained += 25; // partial-hit bonus
            }
            break;
          }
        }

        // Keep constant speed
        const sp = Math.hypot(ball.vx, ball.vy) || 1;
        ball.vx = (ball.vx / sp) * spd;
        ball.vy = (ball.vy / sp) * spd;

        if (ball.y - ball.r <= H) alive.push(ball);
      }

      ballsRef.current = alive;

      // Lose a life only when ALL balls drain
      if (ballsRef.current.length === 0) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setStat("over");
        } else {
          ballsRef.current = [{ x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, r: BALL_R }];
          puRef.current = [];
          setStat("docked");
        }
        break;
      }
    }

    if (statusRef.current === "playing") {
      // Update falling power-up tokens
      const pr2 = paddleRect();
      const remaining: FallingPU[] = [];
      for (const pu of puRef.current) {
        pu.y += PU_FALL;
        const caught =
          pu.y + PU_SIZE / 2 >= pr2.y &&
          pu.y - PU_SIZE / 2 <= pr2.y + pr2.h &&
          pu.x >= pr2.x &&
          pu.x <= pr2.x + pr2.w;
        if (caught) {
          if (pu.type === "wide") widePaddleEndRef.current = Date.now() + 10_000;
          else if (pu.type === "slow") slowEndRef.current = Date.now() + 8_000;
          else if (pu.type === "multi" && ballsRef.current.length > 0) {
            // Spawn extra ball mirrored from first ball
            const src = ballsRef.current[0];
            ballsRef.current.push({ x: src.x, y: src.y, vx: -src.vx, vy: src.vy, r: BALL_R });
          }
        } else if (pu.y < H + PU_SIZE) {
          remaining.push(pu);
        }
      }
      puRef.current = remaining;

      // All bricks cleared → advance to next level
      if (bricksRef.current.every((b) => !b.alive)) {
        levelRef.current += 1;
        setLevel(levelRef.current);
        bricksRef.current = makeBricks(getLevelRows(levelRef.current), COLS, W, 46, 5, 16, levelRef.current);
        ballsRef.current = [{ x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, r: BALL_R }];
        puRef.current = [];
        showBanner(levelRef.current);
        setStat("docked");
      }
    }

    if (gained) setScore((s) => s + gained);
    draw();
    if (statusRef.current === "playing" || statusRef.current === "docked") {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      draw();
    }
  }, [draw]);

  const launch = () => {
    if (statusRef.current !== "docked") return;
    const spd = levelSpeed();
    const ball = ballsRef.current[0];
    if (!ball) return;
    ball.vx = (Math.random() - 0.5) * spd;
    ball.vy = -Math.sqrt(spd * spd - ball.vx * ball.vx);
    setStat("playing");
  };

  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    levelRef.current = 1;
    setLevel(1);
    setLevelBanner(null);
    bricksRef.current = makeBricks(getLevelRows(1), COLS, W, 46, 5, 16, 1);
    padX.current = W / 2;
    ballsRef.current = [{ x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, r: BALL_R }];
    puRef.current = [];
    widePaddleEndRef.current = 0;
    slowEndRef.current = 0;
    livesRef.current = 3;
    setLives(3);
    setScore(0);
    setStat("docked");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") padX.current = Math.max(PADDLE_W / 2, padX.current - 26);
      else if (e.key === "ArrowRight") padX.current = Math.min(W - PADDLE_W / 2, padX.current + 26);
      else if (e.key === " ") { e.preventDefault(); launch(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const movePaddle = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    padX.current = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
  };

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "← →", desc: "Move paddle" },
          { key: "Space", desc: "Launch ball" },
        ]}
        tips={["Angle into corners to chain bricks", "Catch falling tokens for power-ups (W/S/M)"]}
      />
      <div className="breakout">
        <div className="sudoku-bar">
          <span className="wg-progress">
            Score {score} · Lv {level} · Lives {"●".repeat(Math.max(0, lives))}
            {status === "over" ? " · Game over" : ""}
          </span>
          <button className="btn ghost" onClick={newGame}>New</button>
        </div>

        <div className="breakout-stage">
          <canvas
            ref={canvasRef}
            className="breakout-canvas"
            onPointerMove={movePaddle}
            onPointerDown={(e) => { movePaddle(e); launch(); }}
          />
          {levelBanner !== null ? (
            <div className="breakout-hint-overlay">Level {levelBanner}</div>
          ) : status === "docked" ? (
            <div className="breakout-hint-overlay">Tap to launch</div>
          ) : null}
          {status === "over" ? <div className="breakout-hint-overlay">Game over</div> : null}
        </div>

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            Move paddle with finger (or ← →) · tap / Space to launch · catch W/S/M tokens for power-ups.
          </span>
        </div>
      </div>
      <GameLeaderboard
        game="breakout"
        value={score}
        over={status === "over"}
        title="Brick Breaker"
      />
    </div>
  );
}
