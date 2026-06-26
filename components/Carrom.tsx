"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stepOnce, allStopped, type Disc, type Pocket } from "@/lib/physics";
import { GameInfo } from "@/components/GameInfo";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const DIM = 400;
const STRIKER_R = 18;
const COIN_R = 12;
const POCKET_R = 22;
const BASE_Y = DIM - 46;
const BASE_MIN = 60;
const BASE_MAX = DIM - 60;
const DAMPING = 0.972;
const MAX_SPEED = 11;
const CX = 200;
const CY = 195;
const POCKETS: Pocket[] = [
  { x: 24, y: 24, r: POCKET_R },
  { x: DIM - 24, y: 24, r: POCKET_R },
  { x: 24, y: DIM - 24, r: POCKET_R },
  { x: DIM - 24, y: DIM - 24, r: POCKET_R },
];

function layout(): Disc[] {
  const discs: Disc[] = [];
  discs.push({ id: "queen", x: CX, y: CY, vx: 0, vy: 0, r: COIN_R, mass: 1, alive: true, kind: "queen" });
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    discs.push({ id: `c${i}`, x: CX + 30 * Math.cos(a), y: CY + 30 * Math.sin(a), vx: 0, vy: 0, r: COIN_R, mass: 1, alive: true, kind: i % 2 ? "white" : "black" });
  }
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i;
    discs.push({ id: `o${i}`, x: CX + 58 * Math.cos(a), y: CY + 58 * Math.sin(a), vx: 0, vy: 0, r: COIN_R, mass: 1, alive: true, kind: i % 2 ? "white" : "black" });
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

  // queen cover state (refs for loop access, state for UI)
  const coverNeededRef = useRef(false); // grace shot pending (1-player only)
  const queenConfirmedRef = useRef(false); // queen permanently pocketed
  // per-shot flags reset before each shot in onUp
  const queenThisShotRef = useRef(false);
  const coverCoinThisShotRef = useRef(false); // own coin pocketed (counts as cover)
  const ownCoinThisShotRef = useRef(false); // own coin pocketed (grants extra shot)
  // pocketed own-coin pool for foul return
  const pocketedCoinsRef = useRef<Disc[]>([]);
  // 2-player
  const twoPlayerRef = useRef(false);
  const currentPlayerRef = useRef<1 | 2>(1);

  const [strikes, setStrikes] = useState(0);
  const [coinsLeft, setCoinsLeft] = useState(19);
  const [queenDone, setQueenDone] = useState(false);
  const [coverNeeded, setCoverNeeded] = useState(false);
  const [score, setScore] = useState(0);
  const [twoPlayer, setTwoPlayer] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  const striker = () => discsRef.current.find((d) => d.id === "striker")!;
  const won = coinsLeft === 0;

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#2a2440";
    ctx.fillRect(0, 0, DIM, DIM);
    ctx.strokeStyle = "rgba(255,93,143,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, DIM - 12, DIM - 12);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(200, 195, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(BASE_MIN, BASE_Y);
    ctx.lineTo(BASE_MAX, BASE_Y);
    ctx.stroke();
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
      ctx.fillStyle =
        d.kind === "queen" ? "#ff5d8f" :
        d.kind === "white" ? "#f0eef7" :
        d.kind === "striker" ? "#fff8e6" : "#2a2730";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = d.kind === "striker" ? "#caa23a" : "rgba(0,0,0,0.4)";
      ctx.stroke();
    }
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

  // Place a disc safely near board center without overlapping any alive disc
  const placeAtCenterSafely = useCallback((disc: Disc) => {
    const discs = discsRef.current;
    const minDist = 2 * COIN_R + 4;
    const isClear = (px: number, py: number) =>
      discs.every(d => d === disc || !d.alive || Math.hypot(d.x - px, d.y - py) >= minDist);
    if (isClear(CX, CY)) {
      disc.x = CX;
      disc.y = CY;
    } else {
      let placed = false;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = CX + Math.cos(a) * minDist;
        const y = CY + Math.sin(a) * minDist;
        if (isClear(x, y)) {
          disc.x = x;
          disc.y = y;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const a = Math.random() * Math.PI * 2;
        disc.x = CX + Math.cos(a) * minDist;
        disc.y = CY + Math.sin(a) * minDist;
      }
    }
    disc.alive = true;
    disc.vx = 0;
    disc.vy = 0;
  }, []);

  // Re-activate one own coin from pocketed pool near center.
  // In 2P mode pass playerColor to return only that player's own coin.
  const returnCoin = useCallback((playerColor?: string) => {
    const pool = pocketedCoinsRef.current;
    let idx = -1;
    if (playerColor !== undefined) {
      for (let i = pool.length - 1; i >= 0; i--) {
        if (pool[i].kind === playerColor) { idx = i; break; }
      }
    } else {
      idx = pool.length - 1;
    }
    if (idx < 0) return;
    const coin = pool.splice(idx, 1)[0];
    placeAtCenterSafely(coin);
  }, [placeAtCenterSafely]);

  const loop = useCallback(() => {
    const discs = discsRef.current;
    let anyEvent = false;

    for (let k = 0; k < 4; k++) {
      const got = stepOnce(discs, DIM, DIM, POCKETS, DAMPING);
      for (const id of got) {
        anyEvent = true;
        if (id === "striker") {
          // foul: return striker to baseline + return one own coin from pool
          const s = striker();
          s.alive = true;
          s.x = Math.min(BASE_MAX, Math.max(BASE_MIN, s.x));
          s.y = BASE_Y;
          s.vx = s.vy = 0;
          const ownColor = twoPlayerRef.current ? (currentPlayerRef.current === 1 ? "black" : "white") : undefined;
          returnCoin(ownColor);
        } else if (id === "queen") {
          queenThisShotRef.current = true;
        } else {
          const disc = discs.find(d => d.id === id);
          if (!disc) continue;
          const tp = twoPlayerRef.current;
          const cp = currentPlayerRef.current;
          const own = !tp || (cp === 1 && disc.kind === "black") || (cp === 2 && disc.kind === "white");
          if (!own) {
            // 2-player foul: opponent coin pocketed — re-activate it and return one own coin
            placeAtCenterSafely(disc);
            returnCoin(cp === 1 ? "black" : "white");
          } else {
            coverCoinThisShotRef.current = true;
            ownCoinThisShotRef.current = true;
            pocketedCoinsRef.current.push(disc);
            if (tp) {
              if (cp === 1) setP1Score(n => n + 1);
              else setP2Score(n => n + 1);
            } else {
              setScore(n => n + 1);
            }
          }
        }
      }
    }

    if (anyEvent) {
      setCoinsLeft(discs.filter(d => d.kind !== "striker" && d.alive).length);
    }

    draw();

    if (allStopped(discs)) {
      animRef.current = false;
      const s = striker();
      s.y = BASE_Y;
      s.x = Math.min(BASE_MAX, Math.max(BASE_MIN, s.x));
      s.vx = s.vy = 0;

      // queen cover resolution at shot end
      if (queenThisShotRef.current && !queenConfirmedRef.current) {
        if (coverCoinThisShotRef.current) {
          // queen covered same shot
          queenConfirmedRef.current = true;
          coverNeededRef.current = false;
          setCoverNeeded(false);
          if (twoPlayerRef.current) {
            if (currentPlayerRef.current === 1) setP1Score(n => n + 3);
            else setP2Score(n => n + 3);
          } else {
            setScore(n => n + 3);
          }
          setQueenDone(true);
        } else if (!twoPlayerRef.current) {
          // 1-player: grace — must cover on next shot
          coverNeededRef.current = true;
          setCoverNeeded(true);
        } else {
          // 2-player: no grace — respot immediately
          const queen = discs.find(d => d.id === "queen");
          if (queen) { placeAtCenterSafely(queen); }
        }
      } else if (!queenThisShotRef.current && coverNeededRef.current) {
        // 1-player grace shot result
        if (coverCoinThisShotRef.current) {
          queenConfirmedRef.current = true;
          coverNeededRef.current = false;
          setCoverNeeded(false);
          setScore(n => n + 3);
          setQueenDone(true);
        } else {
          // no cover — respot queen
          const queen = discs.find(d => d.id === "queen");
          if (queen) { placeAtCenterSafely(queen); }
          coverNeededRef.current = false;
          setCoverNeeded(false);
        }
      }

      // always sync coinsLeft after queen respot logic may have changed alive flags
      setCoinsLeft(discs.filter(d => d.kind !== "striker" && d.alive).length);

      // 2-player turn: pass if no own coin pocketed
      if (twoPlayerRef.current && !ownCoinThisShotRef.current) {
        currentPlayerRef.current = currentPlayerRef.current === 1 ? 2 : 1;
        setCurrentPlayer(currentPlayerRef.current);
      }

      draw();
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [draw, returnCoin, placeAtCenterSafely]);

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
      dragStrikerRef.current = true;
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
    const power = Math.min(dist, 150) / 150;
    s.vx = (dx / dist) * MAX_SPEED * power;
    s.vy = (dy / dist) * MAX_SPEED * power;
    // reset per-shot flags before each new shot
    queenThisShotRef.current = false;
    coverCoinThisShotRef.current = false;
    ownCoinThisShotRef.current = false;
    setStrikes(n => n + 1);
    animRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  };

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    animRef.current = false;
    discsRef.current = layout();
    aimRef.current = null;
    coverNeededRef.current = false;
    queenConfirmedRef.current = false;
    queenThisShotRef.current = false;
    coverCoinThisShotRef.current = false;
    ownCoinThisShotRef.current = false;
    pocketedCoinsRef.current = [];
    currentPlayerRef.current = 1;
    setStrikes(0);
    setCoinsLeft(19);
    setQueenDone(false);
    setCoverNeeded(false);
    setScore(0);
    setCurrentPlayer(1);
    setP1Score(0);
    setP2Score(0);
    draw();
  }, [draw]);

  const toggleTwoPlayer = useCallback(() => {
    twoPlayerRef.current = !twoPlayerRef.current;
    setTwoPlayer(twoPlayerRef.current);
    reset();
  }, [reset]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = DIM * dpr;
    cv.height = DIM * dpr;
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Drag", desc: "Aim & set shot power" },
          { key: "Release", desc: "Flick the striker" },
        ]}
        tips={["Aim for clusters to pocket multiple coins", "Cover the Queen by pocketing a coin same shot"]}
      />
      <div className="carrom">
        <div className="sudoku-bar">
          <span className="wg-progress">
            {won
              ? `Cleared in ${strikes} strikes!`
              : twoPlayer
              ? `P${currentPlayer} (${currentPlayer === 1 ? "black" : "white"}) · Coins: ${coinsLeft}`
              : `Coins: ${coinsLeft} · Strikes: ${strikes}`}
            {queenDone && !won ? " · Q" : ""}
            {coverNeeded ? " · cover!" : ""}
          </span>
          <div className="carrom-bar-right">
            <button className={`btn ghost${twoPlayer ? " on" : ""}`} onClick={toggleTwoPlayer}>
              {twoPlayer ? "2P" : "1P"}
            </button>
            <button className="btn ghost" onClick={reset}>New</button>
          </div>
        </div>

        <div className="carrom-scores">
          {twoPlayer ? (
            <>
              <span className={`carrom-score${currentPlayer === 1 ? " active" : ""}`}>P1 (blk): {p1Score}pts</span>
              <span className={`carrom-score${currentPlayer === 2 ? " active" : ""}`}>P2 (wht): {p2Score}pts</span>
            </>
          ) : (
            <span className="carrom-score">Score: {score}pts</span>
          )}
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
      <GameLeaderboard game="carrom" value={strikes} over={won && !twoPlayer} title="Carrom" />
    </div>
  );
}
