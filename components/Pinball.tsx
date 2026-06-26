"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collideSeg, collideCircle, flipperSeg, bumperMultiplier, type Ball, type Seg } from "@/lib/pinball";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const W = 300;
const H = 460;
const BALL_R = 7;
const G = 0.055; // floatier
const SUB = 6;
const MAX_SPEED = 6; // slower ball, more reaction time
const WALL_REST = 0.45;
const FLIP_REST = 0.3;
const FLIP_KICK = 3.4;
const SLING_KICK = 4.2; // extra speed kick for slingshot walls
const BALL_SAVE_MS = 3000;
const LAUNCH_X = W - BALL_R - 3; // ball sits against right wall in lane
const LAUNCH_Y = H - 35;
const PLUNGER_RATE = 0.013; // charge per frame

const LX = 96;
const RX = W - 96;
const LY = H - 70;
const FLEN = 64;
const L_REST = 0.45;
const L_UP = -0.55;
const R_REST = Math.PI - 0.45;
const R_UP = Math.PI + 0.55;

// Outer boundary walls (no slingshot effect)
const OUTER_WALLS: Seg[] = [
  { x1: 0, y1: 0, x2: 0, y2: H },
  { x1: W, y1: 0, x2: W, y2: H },
  { x1: 0, y1: 0, x2: W, y2: 0 },
];
// Angled funnel walls above flippers — these are the active slingshots
const SLINGS: Seg[] = [
  { x1: 0, y1: H - 150, x2: LX, y2: LY },
  { x1: W, y1: H - 150, x2: RX, y2: LY },
];
const WALLS: Seg[] = [...OUTER_WALLS, ...SLINGS];

const BUMPERS = [
  { x: 80, y: 150, r: 14 },
  { x: 220, y: 150, r: 14 },
  { x: 150, y: 220, r: 16 },
];

function makeLaunchBall(): Ball {
  return { x: LAUNCH_X, y: LAUNCH_Y, vx: 0, vy: 0, r: BALL_R };
}

export function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball>(makeLaunchBall());
  const leftUp = useRef(false);
  const rightUp = useRef(false);
  const lAng = useRef(L_REST);
  const rAng = useRef(R_REST);
  const rafRef = useRef(0);
  const runningRef = useRef(false);

  // plunger launch state
  const launchingRef = useRef(true);
  const plungerChargingRef = useRef(false);
  const plungerPowerRef = useRef(0);

  // ball save grace period
  const ballSaveUntilRef = useRef(0);

  // bumper flash: timestamp until each bumper glows white
  const bumperFlashRef = useRef<number[]>([0, 0, 0]);

  // total bumper hits for multiplier escalation
  const bumperHitsRef = useRef(0);
  const prevMultRef = useRef(1);

  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [over, setOver] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [ballSaveOn, setBallSaveOn] = useState(false);
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

    // bumpers — flash bright white for 120ms after a hit
    const now = Date.now();
    for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const flashing = now < bumperFlashRef.current[i];
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = flashing ? "#ffffff" : "#b388ff";
      ctx.fill();
      ctx.strokeStyle = flashing ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.5)";
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

    // plunger power bar while in launch mode
    if (launchingRef.current) {
      const pw = plungerPowerRef.current;
      const bx = W - 28;
      const barH = 80;
      const barY = H - 55 - barH;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(bx, barY, 12, barH);
      ctx.fillStyle = pw > 0.7 ? "#ff4444" : pw > 0.4 ? "#ffaa00" : "#44ff88";
      ctx.fillRect(bx, barY + barH * (1 - pw), 12, barH * pw);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, barY, 12, barH);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HOLD", bx + 6, barY - 6);
      ctx.fillText("SPC", bx + 6, barY - 16);
      ctx.textAlign = "left";
    }

    // ball save countdown banner
    if (ballSaveUntilRef.current > now) {
      const sec = Math.ceil((ballSaveUntilRef.current - now) / 1000);
      ctx.fillStyle = "#00ffcc";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`BALL SAVE ${sec}`, W / 2, 20);
      ctx.textAlign = "left";
    }
  }, []);

  const launch = useCallback(() => {
    if (!launchingRef.current) return;
    const power = Math.max(0.25, plungerPowerRef.current);
    ballRef.current.vy = -MAX_SPEED * power;
    ballRef.current.vx = 0;
    launchingRef.current = false;
    plungerPowerRef.current = 0;
    plungerChargingRef.current = false;
  }, []);

  const loop = useCallback(() => {
    if (!runningRef.current) return;

    // expire ball save display
    if (ballSaveUntilRef.current > 0 && Date.now() >= ballSaveUntilRef.current) {
      ballSaveUntilRef.current = 0;
      setBallSaveOn(false);
    }

    // in launch mode: charge plunger and wait for release
    if (launchingRef.current) {
      if (plungerChargingRef.current) {
        plungerPowerRef.current = Math.min(1, plungerPowerRef.current + PLUNGER_RATE);
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const ball = ballRef.current;
    let gained = 0;
    const hitTime = Date.now();
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

      for (const s of OUTER_WALLS) collideSeg(ball, s, WALL_REST);
      // slingshot walls: kick ball away and award points
      for (const s of SLINGS) {
        if (collideSeg(ball, s, WALL_REST, SLING_KICK)) gained += 50;
      }
      collideSeg(ball, lSeg, FLIP_REST, leftUp.current ? FLIP_KICK : 0);
      collideSeg(ball, rSeg, FLIP_REST, rightUp.current ? FLIP_KICK : 0);

      // bumpers: score × multiplier, trigger flash
      for (let i = 0; i < BUMPERS.length; i++) {
        const b = BUMPERS[i];
        if (collideCircle(ball, b.x, b.y, b.r, 3.2)) {
          bumperHitsRef.current += 1;
          const mult = bumperMultiplier(bumperHitsRef.current);
          gained += 100 * mult;
          bumperFlashRef.current[i] = hitTime + 120;
          if (mult !== prevMultRef.current) {
            prevMultRef.current = mult;
            setMultiplier(mult);
          }
        }
      }

      if (ball.y - ball.r > H + 16) {
        // drained — check ball save
        if (hitTime < ballSaveUntilRef.current) {
          // grace period: respawn without losing life
          Object.assign(ball, makeLaunchBall());
          launchingRef.current = true;
          plungerPowerRef.current = 0;
          ballSaveUntilRef.current = 0;
          setBallSaveOn(false);
        } else {
          ballsRef.current -= 1;
          setBalls(ballsRef.current);
          if (ballsRef.current <= 0) {
            overRef.current = true;
            setOver(true);
            runningRef.current = false;
          } else {
            Object.assign(ball, makeLaunchBall());
            launchingRef.current = true;
            plungerPowerRef.current = 0;
            // grant ball save for the new ball
            ballSaveUntilRef.current = Date.now() + BALL_SAVE_MS;
            setBallSaveOn(true);
          }
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
    Object.assign(ballRef.current, makeLaunchBall());
    ballsRef.current = 3;
    overRef.current = false;
    launchingRef.current = true;
    plungerPowerRef.current = 0;
    plungerChargingRef.current = false;
    ballSaveUntilRef.current = 0;
    bumperHitsRef.current = 0;
    bumperFlashRef.current = [0, 0, 0];
    prevMultRef.current = 1;
    setBalls(3);
    setScore(0);
    setOver(false);
    setMultiplier(1);
    setBallSaveOn(false);
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

  // keyboard: flippers + Space plunger
  useEffect(() => {
    const isLeft = (k: string) => k === "ArrowLeft" || k === "a" || k === "z";
    const isRight = (k: string) => k === "ArrowRight" || k === "l" || k === "/";
    const down = (e: KeyboardEvent) => {
      if (isLeft(e.key)) leftUp.current = true;
      else if (isRight(e.key)) rightUp.current = true;
      else if (e.key === " ") {
        e.preventDefault();
        if (launchingRef.current) plungerChargingRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (isLeft(e.key)) leftUp.current = false;
      else if (isRight(e.key)) rightUp.current = false;
      else if (e.key === " ") {
        if (launchingRef.current) launch();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [launch]);

  const hold = (which: "l" | "r", v: boolean) => () => {
    (which === "l" ? leftUp : rightUp).current = v;
  };

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "← / A / Z", desc: "Left flipper" },
          { key: "→ / L", desc: "Right flipper" },
          { key: "Space", desc: "Charge & launch" },
        ]}
        tips={["Hold Space to charge plunger, release to launch", "Hit bumpers for combo points"]}
      />
    <div className="pinball">
      <div className="sudoku-bar">
        <span className="wg-progress">
          Score {score}
          {multiplier > 1 ? ` · ${multiplier}×` : ""}
          {" · Balls "}{"●".repeat(Math.max(0, balls))}
          {ballSaveOn ? " · SAVE" : ""}
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
          onPointerDown={() => { if (launchingRef.current) plungerChargingRef.current = true; }}
          onPointerUp={() => { if (launchingRef.current) launch(); }}
          onPointerLeave={() => { if (launchingRef.current && plungerChargingRef.current) launch(); }}
        >
          Launch
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
          Hold Space (or Launch) to charge · release to shoot · ← / → for flippers · 3 balls.
        </span>
      </div>
    </div>
      <GameLeaderboard game="pinball" value={score} over={over} title="Pinball" />
    </div>
  );
}
