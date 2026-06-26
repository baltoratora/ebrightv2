"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  newGame,
  drop,
  tryShift,
  rotate,
  hardDrop,
  holdPiece,
  ghostRow,
  dropInterval,
  PIECES,
  COLS,
  ROWS,
  type Game,
  type Cell,
} from "@/lib/tetris";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const COLOR: Record<string, string> = {
  I: "#22d3ee",
  O: "#fde047",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#f87171",
  J: "#60a5fa",
  L: "#fb923c",
};

// Grid with the active piece painted in, for rendering.
function display(g: Game): Cell[][] {
  const grid = g.grid.map((row) => [...row]);
  for (let i = 0; i < g.matrix.length; i++) {
    for (let j = 0; j < g.matrix[i].length; j++) {
      if (g.matrix[i][j] && g.r + i >= 0) grid[g.r + i][g.c + j] = g.type;
    }
  }
  return grid;
}

// Compute the set of ghost-piece grid positions as "row,col" strings.
function ghostCells(g: Game): Set<string> {
  const gr = ghostRow(g);
  const cells = new Set<string>();
  if (gr === g.r) return cells; // ghost coincides with piece — skip
  for (let i = 0; i < g.matrix.length; i++) {
    for (let j = 0; j < g.matrix[i].length; j++) {
      if (g.matrix[i][j] && gr + i >= 0) cells.add(`${gr + i},${g.c + j}`);
    }
  }
  return cells;
}

// Mini piece preview grid (used for both Hold and Next panels).
function PieceMini({ type }: { type: string }) {
  const m = PIECES[type].matrix;
  const cols = m[0].length;
  return (
    <div
      className="t-next"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {m.flatMap((row, i) =>
        row.map((v, j) => (
          <div
            key={`${i},${j}`}
            className="t-cell"
            style={v ? { background: COLOR[type] } : { opacity: 0 }}
          />
        )),
      )}
    </div>
  );
}

export function Tetris() {
  const [g, setG] = useState<Game>(() => newGame());
  const [paused, setPaused] = useState(false);
  const [tspinMsg, setTspinMsg] = useState<string | null>(null);
  const tspinCountRef = useRef(0);

  const reset = useCallback(() => {
    setG(newGame());
    setPaused(false);
    setTspinMsg(null);
  }, []);

  // Show T-spin flash when tspinCount increments.
  useEffect(() => {
    if (g.tspinCount > tspinCountRef.current) {
      tspinCountRef.current = g.tspinCount;
      setTspinMsg(g.tspinFlash);
      const t = setTimeout(() => setTspinMsg(null), 1500);
      return () => clearTimeout(t);
    }
  }, [g.tspinCount, g.tspinFlash]);

  // Gravity
  useEffect(() => {
    if (paused || g.over) return;
    const id = setInterval(() => setG((prev) => (prev.over ? prev : drop(prev))), dropInterval(g.level));
    return () => clearInterval(id);
  }, [g.level, paused, g.over]);

  // Keyboard
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
      else if (e.key === "c" || e.key === "C") setG((p) => holdPiece(p));
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
  const ghosts = ghostCells(g);

  const act = (fn: (p: Game) => Game) => () => {
    if (!paused && !g.over) setG(fn);
  };

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "← →", desc: "Move" },
          { key: "↑ / Z", desc: "Rotate" },
          { key: "↓", desc: "Soft drop" },
          { key: "Space", desc: "Hard drop" },
          { key: "C", desc: "Hold" },
          { key: "P", desc: "Pause" },
        ]}
        tips={["Clear 4 rows at once for a Tetris", "Use C to hold a piece"]}
      />
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
        {/* Left side: hold */}
        <div className="tetris-side">
          <div className="t-next-label">Hold</div>
          {g.hold ? (
            <div style={{ opacity: g.holdUsed ? 0.4 : 1 }}>
              <PieceMini type={g.hold} />
            </div>
          ) : (
            <div className="t-hold-empty" />
          )}
          <button className="t-btn t-hold-btn" onClick={act((p) => holdPiece(p))} title="Hold (C)">
            C
          </button>
        </div>

        {/* Board */}
        <div className="tetris-board">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const isGhost = !cell && ghosts.has(key);
              return (
                <div
                  key={key}
                  className={`t-cell${isGhost ? " t-cell--ghost" : ""}`}
                  style={
                    cell
                      ? { background: COLOR[cell], borderColor: "rgba(0,0,0,0.3)" }
                      : isGhost
                      ? { borderColor: COLOR[g.type], borderStyle: "dashed" }
                      : undefined
                  }
                />
              );
            }),
          )}
          {(g.over || paused) && (
            <div className="tetris-overlay">{g.over ? "Game over" : "Paused"}</div>
          )}
          {tspinMsg && <div className="t-tspin-flash">{tspinMsg}</div>}
        </div>

        {/* Right side: 3-piece next preview */}
        <div className="tetris-side">
          <div className="t-next-label">Next</div>
          {g.nextPieces.map((pieceType, idx) => (
            <PieceMini key={idx} type={pieceType} />
          ))}
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
          Arrows move/rotate · ↓ soft drop · Space hard drop · C hold · P pause — or use
          the buttons.
        </span>
      </div>
    </div>
      <GameLeaderboard game="tetris" value={g.score} over={g.over} title="Tetris" />
    </div>
  );
}
