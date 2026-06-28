"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LEVELS,
  parseLevel,
  move,
  isSolved,
  type Level,
  type Dir,
} from "@/lib/sokoban";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

const STORAGE_KEY = "sokoban_progress";

type Progress = {
  currentLevel: number;
  bestMoves: Record<number, number>;
};

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {}
  return { currentLevel: 0, bestMoves: {} };
}

// Emoji-tile renderer helpers
function CellContent({
  isWall,
  isPlayer,
  hasCrate,
  isTarget,
}: {
  isWall: boolean;
  isPlayer: boolean;
  hasCrate: boolean;
  isTarget: boolean;
}) {
  if (isWall) return null;
  if (isPlayer && isTarget) return <span>😊</span>;
  if (isPlayer) return <span>🧑</span>;
  if (hasCrate && isTarget) return <span title="crate on target">📦</span>;
  if (hasCrate) return <span>📦</span>;
  if (isTarget) return <span>⭕</span>;
  return null;
}

export function Sokoban() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [level, setLevel] = useState<Level>(() => parseLevel(LEVELS[0]));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});
  const [newBest, setNewBest] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // History stored in a ref — level snapshots for undo
  const historyRef = useRef<Level[]>([]);

  // Restore persisted progress on mount
  useEffect(() => {
    const prog = loadProgress();
    const idx = Math.min(prog.currentLevel, LEVELS.length - 1);
    setBestMoves(prog.bestMoves);
    setLevelIdx(idx);
    setLevel(parseLevel(LEVELS[idx]));
    setMoves(0);
    setSolved(false);
    historyRef.current = [];
    setCanUndo(false);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress whenever level index or best scores change
  useEffect(() => {
    if (!loaded) return;
    try {
      const prog: Progress = { currentLevel: levelIdx, bestMoves };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
    } catch {}
  }, [levelIdx, bestMoves, loaded]);

  // Record best move count on solve, and whether this solve set a NEW record.
  // We compare against the best BEFORE overwriting it — the badge needs this
  // because bestMoves[levelIdx] becomes === moves right after, and a first-ever
  // solve (prevBest undefined) is also a record.
  useEffect(() => {
    if (!solved || moves === 0) return;
    const prevBest = bestMoves[levelIdx];
    const isRecord = prevBest === undefined || moves < prevBest;
    setNewBest(isRecord);
    if (isRecord) setBestMoves((prev) => ({ ...prev, [levelIdx]: moves }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, moves, levelIdx]);

  const loadLevel = useCallback((idx: number) => {
    setLevelIdx(idx);
    setLevel(parseLevel(LEVELS[idx]));
    setMoves(0);
    setSolved(false);
    setNewBest(false);
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  const doMove = useCallback(
    (dir: Dir) => {
      if (solved) return;
      const { level: next, moved } = move(level, dir);
      if (!moved) return;
      historyRef.current = [...historyRef.current, level];
      setCanUndo(true);
      setLevel(next);
      setMoves((m) => m + 1);
      if (isSolved(next)) setSolved(true);
    },
    [level, solved],
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setLevel(prev);
    setMoves((m) => Math.max(0, m - 1));
    setSolved(false);
    setCanUndo(historyRef.current.length > 0);
  }, []);

  const reset = useCallback(() => {
    setLevel(parseLevel(LEVELS[levelIdx]));
    setMoves(0);
    setSolved(false);
    setNewBest(false);
    historyRef.current = [];
    setCanUndo(false);
  }, [levelIdx]);

  // Keyboard handler — arrow keys, WASD, Z=undo, R=reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs (e.g. the leaderboard name field).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          doMove("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          doMove("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          doMove("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          doMove("right");
          break;
        case "z":
        case "Z":
          undo();
          break;
        case "r":
        case "R":
          reset();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove, undo, reset]);

  const best = bestMoves[levelIdx];

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "← → ↑ ↓", desc: "Move player" },
          { key: "WASD", desc: "Move (alternate)" },
          { key: "Z", desc: "Undo last move" },
          { key: "R", desc: "Reset level" },
        ]}
        tips={[
          "Push crates onto ⭕ targets",
          "Plan ahead — you can't pull crates back",
          "Use Undo freely to correct mistakes",
        ]}
      />

      <div className="sok-root">
        {/* Top bar */}
        <div className="sok-bar">
          <span className="sok-stat">
            Level <strong>{levelIdx + 1}</strong>/{LEVELS.length}
          </span>
          <span className="sok-stat" aria-live="polite">
            Moves: <strong>{moves}</strong>
          </span>
          {best !== undefined && (
            <span className="sok-stat muted">Best: {best}</span>
          )}
          <select
            className="sok-select"
            value={levelIdx}
            onChange={(e) => loadLevel(Number(e.target.value))}
            aria-label="Select level"
          >
            {LEVELS.map((_, i) => (
              <option key={i} value={i}>
                Level {i + 1}
              </option>
            ))}
          </select>
          <button
            className="btn ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Z)"
          >
            ↶ Undo
          </button>
          <button className="btn ghost" onClick={reset} title="Reset (R)">
            ↺ Reset
          </button>
        </div>

        {/* Grid */}
        <div className="sok-grid-wrap">
          <div
            className="sok-grid"
            style={{ gridTemplateColumns: `repeat(${level.w}, 1fr)` }}
          >
            {Array.from({ length: level.h }, (_, r) =>
              Array.from({ length: level.w }, (_, c) => {
                const isWall = level.walls[r][c];
                const isTarget = level.targets[r][c];
                const hasCrate = level.crates.some(
                  (p) => p.r === r && p.c === c,
                );
                const isPlayer = level.player.r === r && level.player.c === c;

                let cls = "sok-cell";
                if (isWall) cls += " sok-cell--wall";
                else if (hasCrate && isTarget) cls += " sok-cell--crate-target";
                else if (hasCrate) cls += " sok-cell--crate";
                else if (isTarget) cls += " sok-cell--target";
                else cls += " sok-cell--floor";

                return (
                  <div key={`${r},${c}`} className={cls}>
                    <CellContent
                      isWall={isWall}
                      isPlayer={isPlayer}
                      hasCrate={hasCrate}
                      isTarget={isTarget}
                    />
                  </div>
                );
              }),
            )}
          </div>

          {/* Solved overlay */}
          {solved && (
            <div className="sok-overlay" aria-live="polite">
              <div className="sok-overlay-title">🎉 Level Complete!</div>
              <div className="sok-overlay-sub">Solved in {moves} moves</div>
              {newBest && (
                <div className="sok-overlay-sub" style={{ color: "var(--green)" }}>
                  New best!
                </div>
              )}
              <div className="sok-overlay-actions">
                {levelIdx + 1 < LEVELS.length && (
                  <button className="btn" onClick={() => loadLevel(levelIdx + 1)}>
                    Next Level →
                  </button>
                )}
                <button className="btn ghost" onClick={reset}>
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* D-pad for touch/mobile */}
        <div className="sok-dpad" aria-label="D-pad controls">
          <button
            className="sok-dpad-btn"
            style={{ gridArea: "up" }}
            onClick={() => doMove("up")}
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            className="sok-dpad-btn"
            style={{ gridArea: "left" }}
            onClick={() => doMove("left")}
            aria-label="Move left"
          >
            ◀
          </button>
          <div style={{ gridArea: "center" }} />
          <button
            className="sok-dpad-btn"
            style={{ gridArea: "right" }}
            onClick={() => doMove("right")}
            aria-label="Move right"
          >
            ▶
          </button>
          <button
            className="sok-dpad-btn"
            style={{ gridArea: "down" }}
            onClick={() => doMove("down")}
            aria-label="Move down"
          >
            ▼
          </button>
        </div>

        <div className="sok-hint">
          Arrow keys / WASD · Z undo · R reset — or tap the D-pad
        </div>
      </div>

      <GameLeaderboard game="sokoban" value={moves} over={solved} title="Sokoban" />
    </div>
  );
}
