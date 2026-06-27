"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { spawnTile, slide, canMove, isWin, type Grid } from "@/lib/g2048";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

// Classic 2048 tile background colours.
const TILE_BG: Record<number, string> = {
  0: "var(--surface-2)",
  2: "#eee4da",
  4: "#ede0c8",
  8: "#f2b179",
  16: "#f59563",
  32: "#f67c5f",
  64: "#f65e3b",
  128: "#edcf72",
  256: "#edcc61",
  512: "#edc850",
  1024: "#edc53f",
  2048: "#edc22e",
};

// Dark text for light tiles, light for the rest.
const TILE_FG: Record<number, string> = {
  0: "transparent",
  2: "#776e65",
  4: "#776e65",
};

function tileBg(v: number) { return TILE_BG[v] ?? "#3c3a32"; }
function tileFg(v: number) { return TILE_FG[v] ?? "#f9f6f2"; }

type State = {
  grid: Grid;
  score: number;
  best: number;
  over: boolean;
  won: boolean;
  winSeen: boolean;
};

const BLANK: Grid = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
const LS_KEY = "g2048_state";

export function Game2048() {
  const [state, setState] = useState<State | null>(null);
  const [showWin, setShowWin] = useState(false);
  const ptrRef = useRef<{ x: number; y: number } | null>(null);

  // Restore from localStorage or generate a fresh game (effect = client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as State;
        setState(s);
        if (s.won && !s.winSeen) setShowWin(true);
        return;
      }
    } catch {}
    setState({ grid: spawnTile(spawnTile(BLANK)), score: 0, best: 0, over: false, won: false, winSeen: false });
  }, []);

  // Persist whenever state changes.
  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  // Show win banner the first time 2048 is reached.
  useEffect(() => {
    if (state?.won && !state.winSeen) {
      setShowWin(true);
      setState(prev => prev ? { ...prev, winSeen: true } : prev);
    }
  }, [state?.won, state?.winSeen]);

  const startNew = useCallback(() => {
    setState(prev => ({
      grid: spawnTile(spawnTile(BLANK)),
      score: 0,
      best: prev?.best ?? 0,
      over: false,
      won: false,
      winSeen: false,
    }));
    setShowWin(false);
  }, []);

  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    setState(prev => {
      if (!prev || prev.over) return prev;
      const { grid, moved, gained } = slide(prev.grid, dir);
      if (!moved) return prev;
      const nextGrid = spawnTile(grid);
      const newScore = prev.score + gained;
      return {
        grid: nextGrid,
        score: newScore,
        best: Math.max(prev.best, newScore),
        over: !canMove(nextGrid),
        won: prev.won || isWin(nextGrid),
        winSeen: prev.winSeen,
      };
    });
  }, []);

  // Arrow-key input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp")    { e.preventDefault(); move("up"); }
      else if (e.key === "ArrowDown")  { e.preventDefault(); move("down"); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); move("left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); move("right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  // Swipe input via pointer events.
  const onPtrDown = useCallback((e: React.PointerEvent) => {
    ptrRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onPtrUp = useCallback((e: React.PointerEvent) => {
    const start = ptrRef.current;
    ptrRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }, [move]);

  if (!state) {
    return (
      <div className="game-layout">
        <div className="g2048">
          <div className="g2048-board g2048-board--loading"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  const { grid, score, best, over } = state;

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "← → ↑ ↓", desc: "Slide tiles" },
          { key: "Swipe", desc: "Slide on mobile" },
        ]}
        tips={[
          "Merge matching tiles to score points",
          "Keep your largest tile in a corner",
        ]}
      />

      <div className="g2048">
        <div className="sudoku-bar">
          <div className="g2048-scores">
            <div className="g2048-score-box">
              <span className="g2048-score-label">SCORE</span>
              <span className="g2048-score-val">{score}</span>
            </div>
            <div className="g2048-score-box">
              <span className="g2048-score-label">BEST</span>
              <span className="g2048-score-val">{best}</span>
            </div>
          </div>
          <button className="btn ghost" onClick={startNew}>New</button>
        </div>

        {showWin && (
          <div className="g2048-win-banner">
            <span>🎉 You reached 2048! Keep going!</span>
            <button className="btn ghost" onClick={() => setShowWin(false)}>Continue</button>
          </div>
        )}

        <div
          className="g2048-board"
          onPointerDown={onPtrDown}
          onPointerUp={onPtrUp}
          style={{ touchAction: "none" }}
        >
          {grid.flat().map((val, i) => (
            <div
              key={i}
              className="g2048-tile"
              style={{ background: tileBg(val), color: tileFg(val) }}
            >
              {val !== 0 ? val : ""}
            </div>
          ))}
          {over && <div className="g2048-overlay">Game over</div>}
        </div>

        <div className="g2048-arrows">
          <button className="t-btn" onClick={() => move("up")}>↑</button>
          <div className="g2048-arrows-row">
            <button className="t-btn" onClick={() => move("left")}>←</button>
            <button className="t-btn" onClick={() => move("down")}>↓</button>
            <button className="t-btn" onClick={() => move("right")}>→</button>
          </div>
        </div>

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">Arrow keys or swipe to slide · merge matching tiles</span>
        </div>
      </div>

      <GameLeaderboard game="2048" value={score} over={over} title="2048" />
    </div>
  );
}
