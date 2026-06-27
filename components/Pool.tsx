"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stepOnce, allStopped, type Disc, type Pocket } from "@/lib/physics";
import { GameInfo } from "@/components/GameInfo";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const W = 440;
const H = 240;
const BALL_R = 10;
const POCKET_R = 17;
const DAMPING = 0.98;
const MAX_SPEED = 12;
const SUBSTEPS = 2;
const HEAD_X = W * 0.26; // head string / kitchen boundary

const POCKETS: Pocket[] = [
  { x: 18, y: 18, r: POCKET_R },
  { x: W - 18, y: 18, r: POCKET_R },
  { x: 18, y: H - 18, r: POCKET_R },
  { x: W - 18, y: H - 18, r: POCKET_R },
  { x: W / 2, y: 13, r: POCKET_R },
  { x: W / 2, y: H - 13, r: POCKET_R },
];

// Standard pool ball colors by ball number
const BALL_COLORS: Record<number, string> = {
  1: "#f1c40f", 2: "#2980b9", 3: "#e74c3c", 4: "#8e44ad",
  5: "#e67e22", 6: "#27ae60", 7: "#7d2600", 8: "#1a1a1a",
  9: "#f1c40f", 10: "#2980b9", 11: "#e74c3c", 12: "#8e44ad",
  13: "#e67e22", 14: "#27ae60", 15: "#7d2600",
};

// Rack columns (apex first), each column listed top to bottom
const RACK = [
  [1],
  [9, 2],
  [3, 8, 10],
  [11, 4, 12, 5],
  [7, 6, 14, 13, 15],
];

function numFromKind(kind: string): number {
  if (kind === "eight") return 8;
  return parseInt(kind.split("-")[1]);
}

function drawBall(ctx: CanvasRenderingContext2D, d: Disc, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (d.kind === "cue") {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = "#fafafa";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    return;
  }
  const num = numFromKind(d.kind);
  const color = BALL_COLORS[num] ?? "#888";
  const isStripe = d.kind.startsWith("stripe");
  // Base circle
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fillStyle = isStripe ? "#ffffff" : color;
  ctx.fill();
  if (isStripe) {
    // Colored band clipped to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(d.x - d.r, d.y - d.r * 0.48, d.r * 2, d.r * 0.96);
    ctx.restore();
    // White center circle for number
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  } else {
    // White center circle for number (solid + 8-ball)
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  // Outline
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Number
  ctx.fillStyle = d.kind === "eight" ? "#1a1a1a" : "#222";
  ctx.font = `bold ${Math.round(d.r * 0.75)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), d.x, d.y);
  ctx.restore();
}

function layout(): Disc[] {
  const discs: Disc[] = [
    { id: "cue", x: HEAD_X, y: H / 2, vx: 0, vy: 0, r: BALL_R, mass: 1, alive: true, kind: "cue" },
  ];
  const apexX = W * 0.66;
  const gap = BALL_R * 2 + 1;
  for (let col = 0; col < RACK.length; col++) {
    const balls = RACK[col];
    for (let row = 0; row < balls.length; row++) {
      const num = balls[row];
      const kind = num === 8 ? "eight" : num <= 7 ? `solid-${num}` : `stripe-${num}`;
      discs.push({
        id: `b${num}`,
        x: apexX + col * gap * 0.87,
        y: H / 2 + (row - (balls.length - 1) / 2) * gap,
        vx: 0, vy: 0, r: BALL_R, mass: 1, alive: true,
        kind,
      });
    }
  }
  return discs;
}

export function Pool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const discsRef = useRef<Disc[]>(layout());
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const animRef = useRef(false);
  const rafRef = useRef(0);
  // ball-in-hand state (ref for draw, state for UI)
  const bihRef = useRef({ active: false, x: HEAD_X * 0.5, y: H / 2 });
  const solidsLeftRef = useRef(7);
  const statusRef = useRef<"playing" | "won" | "lost">("playing");
  // Cue pocketed during the current shot — persists across frames until the
  // table settles (a local would reset before allStopped() fires).
  const scratchRef = useRef(false);

  const [shots, setShots] = useState(0);
  const [solidsLeft, setSolidsLeft] = useState(7);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");
  const [bihActive, setBihActive] = useState(false);
  const [power, setPower] = useState(0);

  const won = gameStatus === "won";
  const lost = gameStatus === "lost";
  const over = won || lost;

  const getCue = () => discsRef.current.find((d) => d.id === "cue")!;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Table felt
    ctx.fillStyle = "#155033";
    ctx.fillRect(0, 0, W, H);
    // Rail border
    ctx.strokeStyle = "rgba(255,93,143,0.5)";
    ctx.lineWidth = 5;
    ctx.strokeRect(7, 7, W - 14, H - 14);
    // Head string line shown in ball-in-hand mode
    if (bihRef.current.active) {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(HEAD_X, 10);
      ctx.lineTo(HEAD_X, H - 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Pockets
    for (const p of POCKETS) {
      ctx.fillStyle = "#05060d";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Alive balls
    for (const d of discsRef.current) {
      if (!d.alive) continue;
      drawBall(ctx, d);
    }
    // Ball-in-hand preview: semi-transparent cue ball follows pointer in kitchen
    if (bihRef.current.active) {
      const bih = bihRef.current;
      const preview: Disc = { id: "cue", x: bih.x, y: bih.y, vx: 0, vy: 0, r: BALL_R, mass: 1, alive: true, kind: "cue" };
      drawBall(ctx, preview, 0.5);
    }
    // Aim guide
    if (aimRef.current && !animRef.current && !bihRef.current.active) {
      const c = getCue();
      if (c.alive) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(aimRef.current.x, aimRef.current.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, []);

  const loop = useCallback(() => {
    const discs = discsRef.current;
    const pottedNums: number[] = [];

    for (let k = 0; k < SUBSTEPS; k++) {
      const got = stepOnce(discs, W, H, POCKETS, DAMPING);
      for (const id of got) {
        if (id === "cue") {
          scratchRef.current = true;
        } else {
          const d = discs.find((x) => x.id === id);
          if (d) pottedNums.push(numFromKind(d.kind));
        }
      }
    }

    // Update 8-ball game logic
    if (pottedNums.length > 0 && statusRef.current === "playing") {
      const eightPotted = pottedNums.includes(8);
      const newSolids = pottedNums.filter((n) => n >= 1 && n <= 7).length;
      if (newSolids > 0) {
        solidsLeftRef.current = Math.max(0, solidsLeftRef.current - newSolids);
        setSolidsLeft(solidsLeftRef.current);
      }
      if (eightPotted) {
        if (solidsLeftRef.current === 0 && !scratchRef.current) {
          statusRef.current = "won";
          setGameStatus("won");
        } else {
          // 8-ball pocketed early, or scratch+8-ball = loss
          statusRef.current = "lost";
          setGameStatus("lost");
        }
      }
    }

    draw();

    if (allStopped(discs)) {
      animRef.current = false;
      // Enter ball-in-hand if cue was pocketed at any point during this shot
      if (statusRef.current === "playing" && scratchRef.current) {
        bihRef.current = { active: true, x: HEAD_X * 0.5, y: H / 2 };
        setBihActive(true);
      }
      scratchRef.current = false;
      draw();
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  const toBoard = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (animRef.current || statusRef.current !== "playing") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    if (bihRef.current.active) return; // wait for onUp to place
    aimRef.current = toBoard(e);
    draw();
  };

  const onMove = (e: React.PointerEvent) => {
    if (animRef.current || statusRef.current !== "playing") return;
    if (bihRef.current.active) {
      const pos = toBoard(e);
      // Constrain to kitchen (x < HEAD_X) with wall margin
      const cx = Math.max(BALL_R, Math.min(HEAD_X - BALL_R, pos.x));
      const cy = Math.max(BALL_R, Math.min(H - BALL_R, pos.y));
      bihRef.current = { active: true, x: cx, y: cy };
      draw();
      return;
    }
    if (!aimRef.current) return;
    aimRef.current = toBoard(e);
    const c = getCue();
    const dx = aimRef.current.x - c.x;
    const dy = aimRef.current.y - c.y;
    setPower(Math.min(Math.hypot(dx, dy), 170) / 170);
    draw();
  };

  const onUp = () => {
    // Ball-in-hand placement
    if (bihRef.current.active) {
      const bih = bihRef.current;
      const overlaps = discsRef.current.some(
        (d) => d.alive && d.id !== "cue" && Math.hypot(d.x - bih.x, d.y - bih.y) < BALL_R * 2
      );
      const inPocket = POCKETS.some((p) => Math.hypot(p.x - bih.x, p.y - bih.y) < p.r);
      if (!overlaps && !inPocket) {
        const c = getCue();
        c.x = bih.x;
        c.y = bih.y;
        c.alive = true;
        c.vx = 0;
        c.vy = 0;
        bihRef.current = { active: false, x: HEAD_X * 0.5, y: H / 2 };
        setBihActive(false);
        draw();
      }
      return;
    }
    const aim = aimRef.current;
    aimRef.current = null;
    setPower(0);
    if (!aim || animRef.current || over) return draw();
    const c = getCue();
    const dx = aim.x - c.x;
    const dy = aim.y - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) return draw();
    const p = Math.min(dist, 170) / 170;
    c.vx = (dx / dist) * MAX_SPEED * p;
    c.vy = (dy / dist) * MAX_SPEED * p;
    setShots((n) => n + 1);
    scratchRef.current = false;
    animRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  };

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    animRef.current = false;
    discsRef.current = layout();
    aimRef.current = null;
    bihRef.current = { active: false, x: HEAD_X * 0.5, y: H / 2 };
    solidsLeftRef.current = 7;
    scratchRef.current = false;
    statusRef.current = "playing";
    setShots(0);
    setSolidsLeft(7);
    setGameStatus("playing");
    setBihActive(false);
    setPower(0);
    draw();
  }, [draw]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Drag", desc: "Aim & set shot power" },
          { key: "Release", desc: "Shoot the cue ball" },
        ]}
        tips={[
          "Pocket solids 1–7 then sink the 8-ball to win",
          "Pocketing the 8-ball before clearing solids is an instant loss",
          "Scratch gives ball-in-hand — place the cue behind the head string",
        ]}
      />
      <div className="pool">
        <div className="sudoku-bar">
          <span className="wg-progress">
            {won
              ? `Won in ${shots} shots!`
              : lost
              ? "8-ball pocketed early — game over"
              : bihActive
              ? "Ball in hand — move to the kitchen and click to place"
              : `Solids left: ${solidsLeft} · Shots: ${shots}`}
          </span>
          <button className="btn ghost" onClick={reset}>
            New
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="pool-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />

        <div className="pool-power-bar" aria-label={`Shot power ${Math.round(power * 100)}%`}>
          <div className="pool-power-fill" style={{ width: `${Math.round(power * 100)}%` }} />
        </div>

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            Drag from the cue ball to aim — longer drag = more power ·
            {" "}pocket solids 1–7 then the 8-ball · scratch gives ball-in-hand
          </span>
        </div>
      </div>
      <GameLeaderboard game="pool" value={shots} over={won} title="Pool" />
    </div>
  );
}
