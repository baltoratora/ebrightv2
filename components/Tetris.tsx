"use client";

import { useCallback, useEffect, useState } from "react";
import {
  newGame,
  drop,
  tryShift,
  rotate,
  hardDrop,
  dropInterval,
  PIECES,
  COLS,
  ROWS,
  type Game,
  type Cell,
} from "@/lib/tetris";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const COLOR: Record<string, string> = {
  I: "#22d3ee",
  O: "#fde047",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#f87171",
  J: "#60a5fa",
  L: "#fb923c",
};

// grid with the active piece painted in, for rendering
function display(g: Game): Cell[][] {
  const grid = g.grid.map((row) => [...row]);
  for (let i = 0; i < g.matrix.length; i++) {
    for (let j = 0; j < g.matrix[i].length; j++) {
      if (g.matrix[i][j] && g.r + i >= 0) grid[g.r + i][g.c + j] = g.type;
    }
  }
  return grid;
}

export function Tetris() {
  const [g, setG] = useState<Game>(() => newGame());
  const [paused, setPaused] = useState(false);

  const reset = useCallback(() => {
    setG(newGame());
    setPaused(false);
  }, []);

  // gravity
  useEffect(() => {
    if (paused || g.over) return;
    const id = setInterval(() => setG((prev) => (prev.over ? prev : drop(prev))), dropInterval(g.level));
    return () => clearInterval(id);
  }, [g.level, paused, g.over]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (g.over) return;
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      if (paused) return;
      if (e.key === "ArrowLeft") setG((p) => tryShift(p, -1));
      else if (e.key === "ArrowRight") setG((p) => tryShift(p, 1));
      else if (e.key === "ArrowUp") setG((p) => rotate(p));
      else if (e.key === "ArrowDown") setG((p) => drop(p, true));
      else if (e.key === " ") {
        e.preventDefault();
        setG((p) => hardDrop(p));
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, g.over]);

  const grid = display(g);
  const nextMatrix = PIECES[g.next].matrix;

  const act = (fn: (p: Game) => Game) => () => {
    if (!paused && !g.over) setG(fn);
  };

  return (
    <div className="game-layout">
    <div className="tetris">
      <div className="sudoku-bar">
        <span className="wg-progress">
          Score {g.score} · Lines {g.lines} · Lv {g.level}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => setPaused((p) => !p)} disabled={g.over}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button className="btn ghost" onClick={reset}>
            New
          </button>
        </div>
      </div>

      <div className="tetris-main">
        <div className="tetris-board">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r},${c}`}
                className="t-cell"
                style={cell ? { background: COLOR[cell], borderColor: "rgba(0,0,0,0.3)" } : undefined}
              />
            )),
          )}
          {(g.over || paused) && (
            <div className="tetris-overlay">{g.over ? "Game over" : "Paused"}</div>
          )}
        </div>

        <div className="tetris-side">
          <div className="t-next-label">Next</div>
          <div
            className="t-next"
            style={{ gridTemplateColumns: `repeat(${nextMatrix[0].length}, 1fr)` }}
          >
            {nextMatrix.flatMap((row, i) =>
              row.map((v, j) => (
                <div
                  key={`${i},${j}`}
                  className="t-cell"
                  style={v ? { background: COLOR[g.next] } : { opacity: 0 }}
                />
              )),
            )}
          </div>
        </div>
      </div>

      <div className="tetris-controls">
        <button className="t-btn" onClick={act((p) => tryShift(p, -1))}>◀</button>
        <button className="t-btn" onClick={act((p) => rotate(p))}>⟳</button>
        <button className="t-btn" onClick={act((p) => tryShift(p, 1))}>▶</button>
        <button className="t-btn" onClick={act((p) => drop(p, true))}>▼</button>
        <button className="t-btn wide" onClick={act((p) => hardDrop(p))}>⤓ Drop</button>
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Arrows move/rotate · ↓ soft drop · Space hard drop · P pause — or use
          the buttons.
        </span>
      </div>
    </div>
      <GameLeaderboard game="tetris" value={g.score} over={g.over} title="Tetris" />
    </div>
  );
}
