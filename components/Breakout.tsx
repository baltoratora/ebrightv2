"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bounceOffRect, makeBricks, type Ball, type Brick } from "@/lib/breakout";

const W = 320;
const H = 440;
const BALL_R = 6;
const SPEED = 3.2;
const SUB = 3;
const PADDLE_W = 66;
const PADDLE_H = 12;
const PADDLE_Y = H - 26;
const ROWS = 5;
const COLS = 8;

type Status = "docked" | "playing" | "over" | "won";

export function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball>({ x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, r: BALL_R });
  const padX = useRef(W / 2);
  const bricksRef = useRef<Brick[]>(makeBricks(ROWS, COLS, W, 46, 5, 16));
  const statusRef = useRef<Status>("docked");
  const rafRef = useRef(0);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  const [status, setStatus] = useState<Status>("docked");

  const setStat = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
  };

  const paddleRect = () => ({ x: padX.current - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H });

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0c18";
    ctx.fillRect(0, 0, W, H);
    for (const b of bricksRef.current) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    const p = paddleRect();
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 6);
    ctx.fill();
    const ball = ballRef.current;
    ctx.fillStyle = "#fafafa";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const loop = useCallback(() => {
    const ball = ballRef.current;
    if (statusRef.current === "docked") {
      ball.x = padX.current;
      ball.y = PADDLE_Y - BALL_R;
      draw();
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    if (statusRef.current !== "playing") return;

    let gained = 0;
    for (let k = 0; k < SUB; k++) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + ball.r > W) {
        ball.x = W - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      }
      // paddle
      if (ball.vy > 0 && bounceOffRect(ball, paddleRect())) {
        const off = (ball.x - padX.current) / (PADDLE_W / 2);
        ball.vx = off * SPEED * 0.85;
        ball.vy = -Math.sqrt(Math.max(0.2, SPEED * SPEED - ball.vx * ball.vx));
      }
      // bricks (one per substep)
      for (const br of bricksRef.current) {
        if (br.alive && bounceOffRect(ball, br)) {
          br.alive = false;
          gained += 50;
          break;
        }
      }
      // keep constant speed
      const sp = Math.hypot(ball.vx, ball.vy) || 1;
      ball.vx = (ball.vx / sp) * SPEED;
      ball.vy = (ball.vy / sp) * SPEED;

      if (ball.y - ball.r > H) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setStat("over");
        } else {
          setStat("docked");
        }
        break;
      }
    }
    if (gained) setScore((s) => s + gained);
    if (bricksRef.current.every((b) => !b.alive)) setStat("won");
    draw();
    if (statusRef.current === "playing" || statusRef.current === "docked") {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      draw();
    }
  }, [draw]);

  const launch = () => {
    if (statusRef.current !== "docked") return;
    const ball = ballRef.current;
    ball.vx = (Math.random() - 0.5) * SPEED;
    ball.vy = -Math.sqrt(SPEED * SPEED - ball.vx * ball.vx);
    setStat("playing");
  };

  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    bricksRef.current = makeBricks(ROWS, COLS, W, 46, 5, 16);
    padX.current = W / 2;
    ballRef.current = { x: W / 2, y: PADDLE_Y - BALL_R, vx: 0, vy: 0, r: BALL_R };
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
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") padX.current = Math.max(PADDLE_W / 2, padX.current - 26);
      else if (e.key === "ArrowRight") padX.current = Math.min(W - PADDLE_W / 2, padX.current + 26);
      else if (e.key === " ") {
        e.preventDefault();
        launch();
      }
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
    <div className="breakout">
      <div className="sudoku-bar">
        <span className="wg-progress">
          Score {score} · Lives {"●".repeat(Math.max(0, lives))}
          {status === "won" ? " · 🎉 Cleared!" : status === "over" ? " · Game over" : ""}
        </span>
        <button className="btn ghost" onClick={newGame}>
          New
        </button>
      </div>

      <div className="breakout-stage">
        <canvas
          ref={canvasRef}
          className="breakout-canvas"
          onPointerMove={movePaddle}
          onPointerDown={(e) => {
            movePaddle(e);
            launch();
          }}
        />
        {status === "docked" ? <div className="breakout-hint-overlay">Tap to launch</div> : null}
        {status === "over" || status === "won" ? (
          <div className="breakout-hint-overlay">{status === "won" ? "🎉 Cleared!" : "Game over"}</div>
        ) : null}
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Move the paddle with your finger (or ← →) · tap / Space to launch ·
          clear all the bricks.
        </span>
      </div>
    </div>
  );
}
