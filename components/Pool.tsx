"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stepOnce, allStopped, type Disc, type Pocket } from "@/lib/physics";

const W = 440;
const H = 240;
const BALL_R = 10;
const POCKET_R = 17;
const DAMPING = 0.98; // slower roll
const MAX_SPEED = 12;

const POCKETS: Pocket[] = [
  { x: 18, y: 18, r: POCKET_R },
  { x: W - 18, y: 18, r: POCKET_R },
  { x: 18, y: H - 18, r: POCKET_R },
  { x: W - 18, y: H - 18, r: POCKET_R },
  { x: W / 2, y: 13, r: POCKET_R },
  { x: W / 2, y: H - 13, r: POCKET_R },
];

const COLORS = ["#f1c40f", "#e67e22", "#e74c3c", "#9b59b6", "#3498db", "#2ecc71", "#e84393", "#1abc9c", "#d35400", "#c0392b"];
const HEAD = { x: W * 0.26, y: H / 2 };

function layout(): Disc[] {
  const discs: Disc[] = [
    { id: "cue", x: HEAD.x, y: HEAD.y, vx: 0, vy: 0, r: BALL_R, mass: 1, alive: true, kind: "cue" },
  ];
  const apexX = W * 0.66;
  const gap = BALL_R * 2 + 1;
  let n = 0;
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row <= col; row++) {
      discs.push({
        id: `b${n}`,
        x: apexX + col * gap * 0.87,
        y: H / 2 + (row - col / 2) * gap,
        vx: 0,
        vy: 0,
        r: BALL_R,
        mass: 1,
        alive: true,
        kind: "obj" + (n % COLORS.length),
      });
      n++;
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
  const [shots, setShots] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(10);

  const cue = () => discsRef.current.find((d) => d.id === "cue")!;
  const won = ballsLeft === 0;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#155033";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,93,143,0.5)";
    ctx.lineWidth = 5;
    ctx.strokeRect(7, 7, W - 14, H - 14);
    for (const p of POCKETS) {
      ctx.fillStyle = "#05060d";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of discsRef.current) {
      if (!d.alive) continue;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.kind === "cue" ? "#fafafa" : COLORS[Number(d.kind.replace("obj", ""))];
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.stroke();
    }
    if (aimRef.current && !animRef.current) {
      const c = cue();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(aimRef.current.x, aimRef.current.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);

  const loop = useCallback(() => {
    const discs = discsRef.current;
    let potted = false;
    for (let k = 0; k < 4; k++) {
      const got = stepOnce(discs, W, H, POCKETS, DAMPING);
      for (const id of got) {
        if (id === "cue") {
          const c = cue();
          c.alive = true;
          c.x = HEAD.x;
          c.y = HEAD.y;
          c.vx = c.vy = 0;
        } else potted = true;
      }
    }
    if (potted) setBallsLeft(discsRef.current.filter((d) => d.kind !== "cue" && d.alive).length);
    draw();
    if (allStopped(discs)) {
      animRef.current = false;
      const c = cue();
      c.vx = c.vy = 0;
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
    if (animRef.current || won) return;
    aimRef.current = toBoard(e);
    draw();
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (animRef.current || won || !aimRef.current) return;
    aimRef.current = toBoard(e);
    draw();
  };
  const onUp = () => {
    const aim = aimRef.current;
    aimRef.current = null;
    if (!aim || animRef.current || won) return draw();
    const c = cue();
    const dx = aim.x - c.x;
    const dy = aim.y - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) return draw();
    const power = Math.min(dist, 170) / 170;
    c.vx = (dx / dist) * MAX_SPEED * power;
    c.vy = (dy / dist) * MAX_SPEED * power;
    setShots((n) => n + 1);
    animRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  };

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    animRef.current = false;
    discsRef.current = layout();
    aimRef.current = null;
    setShots(0);
    setBallsLeft(10);
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
    <div className="pool">
      <div className="sudoku-bar">
        <span className="wg-progress">
          {won ? `🎉 Cleared in ${shots} shots!` : `Balls left: ${ballsLeft} · Shots: ${shots}`}
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

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Drag from the white cue ball to aim (longer = harder), release to shoot ·
          sink all the balls · scratch returns the cue ball.
        </span>
      </div>
    </div>
  );
}
