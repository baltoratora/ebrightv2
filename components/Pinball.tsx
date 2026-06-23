"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collideSeg, collideCircle, flipperSeg, type Ball, type Seg } from "@/lib/pinball";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const W = 300;
const H = 460;
const BALL_R = 7;
const G = 0.055; // floatier
const SUB = 6;
const MAX_SPEED = 6; // slower ball, more reaction time
const WALL_REST = 0.45; // less bouncy
const FLIP_REST = 0.3;
const FLIP_KICK = 3.4; // gentler flip

const LX = 96;
const RX = W - 96;
const LY = H - 70;
const FLEN = 64; // longer flippers cover more of the bottom
const L_REST = 0.45;
const L_UP = -0.55;
const R_REST = Math.PI - 0.45;
const R_UP = Math.PI + 0.55;

const WALLS: Seg[] = [
  { x1: 0, y1: 0, x2: 0, y2: H },
  { x1: W, y1: 0, x2: W, y2: H },
  { x1: 0, y1: 0, x2: W, y2: 0 },
  { x1: 0, y1: H - 150, x2: LX, y2: LY }, // left inlane funnel
  { x1: W, y1: H - 150, x2: RX, y2: LY }, // right inlane funnel
];
const BUMPERS = [
  { x: 80, y: 150, r: 14 },
  { x: 220, y: 150, r: 14 },
  { x: 150, y: 220, r: 16 },
];

function serve(): Ball {
  return { x: W / 2, y: 30, vx: (Math.random() - 0.5) * 2, vy: 0.8, r: BALL_R };
}

export function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball>(serve());
  const leftUp = useRef(false);
  const rightUp = useRef(false);
  const lAng = useRef(L_REST);
  const rAng = useRef(R_REST);
  const rafRef = useRef(0);
  const runningRef = useRef(false);

  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [over, setOver] = useState(false);
  const ballsRef = useRef(3);
  const overRef = useRef(false);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0c18";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,93,143,0.45)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    for (const s of WALLS) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    for (const b of BUMPERS) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = "#b388ff";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // flippers
    ctx.strokeStyle = "#ff5d8f";
    ctx.lineWidth = 9;
    for (const s of [flipperSeg(LX, LY, FLEN, lAng.current), flipperSeg(RX, LY, FLEN, rAng.current)]) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    // ball
    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = "#fafafa";
    ctx.fill();
  }, []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const ball = ballRef.current;
    let gained = 0;
    lAng.current += ((leftUp.current ? L_UP : L_REST) - lAng.current) * 0.4;
    rAng.current += ((rightUp.current ? R_UP : R_REST) - rAng.current) * 0.4;
    const lSeg = flipperSeg(LX, LY, FLEN, lAng.current);
    const rSeg = flipperSeg(RX, LY, FLEN, rAng.current);

    for (let k = 0; k < SUB; k++) {
      ball.vy += G;
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > MAX_SPEED) {
        ball.vx = (ball.vx / sp) * MAX_SPEED;
        ball.vy = (ball.vy / sp) * MAX_SPEED;
      }
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= 0.999;
      for (const s of WALLS) collideSeg(ball, s, WALL_REST);
      collideSeg(ball, lSeg, FLIP_REST, leftUp.current ? FLIP_KICK : 0);
      collideSeg(ball, rSeg, FLIP_REST, rightUp.current ? FLIP_KICK : 0);
      for (const b of BUMPERS) if (collideCircle(ball, b.x, b.y, b.r, 3.2)) gained += 100;

      if (ball.y - ball.r > H + 16) {
        // drained
        ballsRef.current -= 1;
        setBalls(ballsRef.current);
        if (ballsRef.current <= 0) {
          overRef.current = true;
          setOver(true);
          runningRef.current = false;
        } else {
          Object.assign(ball, serve());
        }
        break;
      }
    }
    if (gained) setScore((s) => s + gained);
    draw();
    if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
    else draw();
  }, [draw]);

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    Object.assign(ballRef.current, serve());
    ballsRef.current = 3;
    overRef.current = false;
    setBalls(3);
    setScore(0);
    setOver(false);
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    start();
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard flippers
  useEffect(() => {
    const isLeft = (k: string) => k === "ArrowLeft" || k === "a" || k === "z";
    const isRight = (k: string) => k === "ArrowRight" || k === "l" || k === "/";
    const down = (e: KeyboardEvent) => {
      if (isLeft(e.key)) leftUp.current = true;
      else if (isRight(e.key)) rightUp.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (isLeft(e.key)) leftUp.current = false;
      else if (isRight(e.key)) rightUp.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const hold = (which: "l" | "r", v: boolean) => () => {
    (which === "l" ? leftUp : rightUp).current = v;
  };

  return (
    <div className="game-layout">
    <div className="pinball">
      <div className="sudoku-bar">
        <span className="wg-progress">
          Score {score} · Balls {"●".repeat(Math.max(0, balls))}
          {over ? " · Game over" : ""}
        </span>
        <button className="btn ghost" onClick={start}>
          New
        </button>
      </div>

      <canvas ref={canvasRef} className="pinball-canvas" />

      <div className="pinball-controls">
        <button
          className="t-btn wide"
          onPointerDown={hold("l", true)}
          onPointerUp={hold("l", false)}
          onPointerLeave={hold("l", false)}
        >
          ◀ Left
        </button>
        <button
          className="t-btn wide"
          onPointerDown={hold("r", true)}
          onPointerUp={hold("r", false)}
          onPointerLeave={hold("r", false)}
        >
          Right ▶
        </button>
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Hold the buttons (or ← / →) to flip · keep the ball alive and rack up
          bumper points · 3 balls.
        </span>
      </div>
    </div>
      <GameLeaderboard game="pinball" value={score} over={over} title="Pinball" />
    </div>
  );
}
