"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stepOnce, allStopped, type Disc, type Pocket } from "@/lib/physics";

const DIM = 400;
const STRIKER_R = 18;
const COIN_R = 12;
const POCKET_R = 22;
const BASE_Y = DIM - 46;
const BASE_MIN = 60;
const BASE_MAX = DIM - 60;
const DAMPING = 0.972; // more friction — slower, settles sooner
const MAX_SPEED = 11;
const POCKETS: Pocket[] = [
  { x: 24, y: 24, r: POCKET_R },
  { x: DIM - 24, y: 24, r: POCKET_R },
  { x: 24, y: DIM - 24, r: POCKET_R },
  { x: DIM - 24, y: DIM - 24, r: POCKET_R },
];

function layout(): Disc[] {
  const discs: Disc[] = [];
  const cx = 200, cy = 195;
  discs.push({ id: "queen", x: cx, y: cy, vx: 0, vy: 0, r: COIN_R, mass: 1, alive: true, kind: "queen" });
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    discs.push({ id: `c${i}`, x: cx + 30 * Math.cos(a), y: cy + 30 * Math.sin(a), vx: 0, vy: 0, r: COIN_R, mass: 1, alive: true, kind: i % 2 ? "white" : "black" });
  }
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i;
    discs.push({ id: `o${i}`, x: cx + 58 * Math.cos(a), y: cy + 58 * Math.sin(a), vx: 0, vy: 0, r: COIN_R, mass: 1, alive: true, kind: i % 2 ? "white" : "black" });
  }
  discs.push({ id: "striker", x: DIM / 2, y: BASE_Y, vx: 0, vy: 0, r: STRIKER_R, mass: 2.5, alive: true, kind: "striker" });
  return discs;
}

export function Carrom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const discsRef = useRef<Disc[]>(layout());
  const aimRef = useRef<{ active: boolean; x: number; y: number } | null>(null);
  const dragStrikerRef = useRef(false);
  const animRef = useRef(false);
  const rafRef = useRef(0);

  const [strikes, setStrikes] = useState(0);
  const [coinsLeft, setCoinsLeft] = useState(19);
  const [queenDone, setQueenDone] = useState(false);

  const striker = () => discsRef.current.find((d) => d.id === "striker")!;
  const won = coinsLeft === 0;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // board
    ctx.fillStyle = "#2a2440";
    ctx.fillRect(0, 0, DIM, DIM);
    ctx.strokeStyle = "rgba(255,93,143,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, DIM - 12, DIM - 12);
    // center circle
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(200, 195, 78, 0, Math.PI * 2);
    ctx.stroke();
    // baseline
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(BASE_MIN, BASE_Y);
    ctx.lineTo(BASE_MAX, BASE_Y);
    ctx.stroke();
    // pockets
    for (const p of POCKETS) {
      ctx.fillStyle = "#05060d";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // discs
    for (const d of discsRef.current) {
      if (!d.alive) continue;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle =
        d.kind === "queen" ? "#ff5d8f" : d.kind === "white" ? "#f0eef7" : d.kind === "striker" ? "#fff8e6" : "#2a2730";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = d.kind === "striker" ? "#caa23a" : "rgba(0,0,0,0.4)";
      ctx.stroke();
    }
    // aim arrow
    const aim = aimRef.current;
    if (aim?.active) {
      const s = striker();
      ctx.strokeStyle = "rgba(255,93,143,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(aim.x, aim.y);
      ctx.stroke();
    }
  }, []);

  const loop = useCallback(() => {
    const discs = discsRef.current;
    let pocketedAny = false;
    for (let k = 0; k < 4; k++) {
      const got = stepOnce(discs, DIM, DIM, POCKETS, DAMPING);
      for (const id of got) {
        if (id === "striker") {
          // foul: striker pocketed — bring it back
          const s = striker();
          s.alive = true;
          s.x = Math.min(BASE_MAX, Math.max(BASE_MIN, s.x));
          s.y = BASE_Y;
          s.vx = s.vy = 0;
        } else {
          pocketedAny = true;
          if (id === "queen") setQueenDone(true);
        }
      }
    }
    if (pocketedAny) {
      setCoinsLeft(discsRef.current.filter((d) => d.kind !== "striker" && d.alive).length);
    }
    draw();
    if (allStopped(discs)) {
      animRef.current = false;
      const s = striker();
      s.y = BASE_Y;
      s.x = Math.min(BASE_MAX, Math.max(BASE_MIN, s.x));
      s.vx = s.vy = 0;
      draw();
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [draw]);

  // pointer position in board units
  const toBoard = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * DIM,
      y: ((e.clientY - rect.top) / rect.height) * DIM,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (animRef.current || won) return;
    const p = toBoard(e);
    const s = striker();
    if (Math.hypot(p.x - s.x, p.y - s.y) <= s.r + 6) {
      dragStrikerRef.current = true; // reposition on baseline
    } else {
      aimRef.current = { active: true, x: p.x, y: p.y };
    }
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (animRef.current) return;
    const p = toBoard(e);
    if (dragStrikerRef.current) {
      striker().x = Math.min(BASE_MAX, Math.max(BASE_MIN, p.x));
      draw();
    } else if (aimRef.current?.active) {
      aimRef.current = { active: true, x: p.x, y: p.y };
      draw();
    }
  };

  const onUp = () => {
    if (dragStrikerRef.current) {
      dragStrikerRef.current = false;
      return;
    }
    const aim = aimRef.current;
    aimRef.current = null;
    if (!aim || animRef.current || won) {
      draw();
      return;
    }
    const s = striker();
    const dx = aim.x - s.x;
    const dy = aim.y - s.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      draw();
      return;
    }
    const power = Math.min(dist, 150) / 150; // 0..1
    s.vx = (dx / dist) * MAX_SPEED * power;
    s.vy = (dy / dist) * MAX_SPEED * power;
    setStrikes((n) => n + 1);
    animRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  };

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    animRef.current = false;
    discsRef.current = layout();
    aimRef.current = null;
    setStrikes(0);
    setCoinsLeft(19);
    setQueenDone(false);
    draw();
  }, [draw]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = DIM * dpr;
    cv.height = DIM * dpr;
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="carrom">
      <div className="sudoku-bar">
        <span className="wg-progress">
          {won ? `🎉 Cleared in ${strikes} strikes!` : `Coins left: ${coinsLeft} · Strikes: ${strikes}`}
          {queenDone && !won ? " · 👑" : ""}
        </span>
        <button className="btn ghost" onClick={reset}>
          New
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="carrom-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Tap the striker to slide it along the baseline · drag from it to aim
          (longer = harder) and release to flick · pocket all the coins.
        </span>
      </div>
    </div>
  );
}
