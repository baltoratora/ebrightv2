"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FLEET,
  placeFleet,
  emptyBoard,
  allPlaced,
  tryPlaceShip,
  fire,
  allSunk,
  aiChooseShot,
  aiEasyShot,
  aiHardShot,
  neighbors,
  shipsRemaining,
  SIZE,
  inB,
  type Board,
} from "@/lib/battleship";
import { GameInfo } from "@/components/GameInfo";
import { GameLeaderboard } from "@/components/GameLeaderboard";

type Phase = "setup" | "playing" | "over";
type Difficulty = "easy" | "medium" | "hard";

export function Battleship() {
  const enemy = useRef<Board>(placeFleet());
  const player = useRef<Board>(emptyBoard());
  const aiMem = useRef<{ queue: [number, number][] }>({ queue: [] });
  const [phase, setPhase] = useState<Phase>("setup");
  const [winner, setWinner] = useState<"you" | "bot" | null>(null);
  const [thinking, setThinking] = useState(false);
  const [shots, setShots] = useState(0);
  const [, setV] = useState(0);
  const bump = () => setV((v) => v + 1);

  // Manual placement state
  const [selectedShip, setSelectedShip] = useState<number | null>(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  // AI difficulty (only changeable during setup)
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  // Track the most-recently-shot cell key for animations
  const [lastEnemyShot, setLastEnemyShot] = useState<string | null>(null);
  const [lastPlayerShot, setLastPlayerShot] = useState<string | null>(null);

  // R key toggles ship orientation during setup
  useEffect(() => {
    if (phase !== "setup") return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") setHorizontal((v) => !v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [phase]);

  const newGame = useCallback(() => {
    enemy.current = placeFleet();
    player.current = emptyBoard();
    aiMem.current = { queue: [] };
    setWinner(null);
    setThinking(false);
    setPhase("setup");
    setShots(0);
    setSelectedShip(0);
    setHorizontal(true);
    setHoverCell(null);
    setLastEnemyShot(null);
    setLastPlayerShot(null);
    bump();
  }, []);

  const randomize = () => {
    player.current = placeFleet();
    setSelectedShip(null);
    setHoverCell(null);
    bump();
  };

  // Place the selected ship at (r,c) during setup
  const handleSetupClick = (r: number, c: number) => {
    if (selectedShip === null || phase !== "setup") return;
    const ok = tryPlaceShip(player.current, selectedShip, r, c, horizontal);
    if (ok) {
      // Auto-advance to next unplaced ship
      const next = FLEET.findIndex((_s, i) => player.current.ships[i].cells.length === 0);
      setSelectedShip(next >= 0 ? next : null);
      bump();
    }
  };

  const playerFire = (r: number, c: number) => {
    if (phase !== "playing" || thinking) return;
    const res = fire(enemy.current, r, c);
    if (!res) return;
    const eKey = `${r},${c}`;
    setLastEnemyShot(eKey);
    setTimeout(() => setLastEnemyShot((k) => (k === eKey ? null : k)), 500);
    setShots((s) => s + 1);
    bump();
    if (allSunk(enemy.current)) {
      setWinner("you");
      setPhase("over");
      return;
    }
    setThinking(true);
    setTimeout(() => {
      const [br, bc] =
        difficulty === "easy"
          ? aiEasyShot(player.current.shots)
          : difficulty === "hard"
            ? aiHardShot(player.current)
            : aiChooseShot(player.current.shots, aiMem.current);
      const bres = fire(player.current, br, bc);
      // Medium AI adds neighbors to queue on unsunk hits
      if (difficulty === "medium" && bres?.result === "hit" && !bres.sunk) {
        for (const [nr, nc] of neighbors(br, bc)) {
          if (player.current.shots[nr][nc] === null) aiMem.current.queue.push([nr, nc]);
        }
      }
      if (bres?.sunk) aiMem.current.queue = [];
      const pKey = `${br},${bc}`;
      setLastPlayerShot(pKey);
      setTimeout(() => setLastPlayerShot((k) => (k === pKey ? null : k)), 500);
      setThinking(false);
      if (allSunk(player.current)) {
        setWinner("bot");
        setPhase("over");
      }
      bump();
    }, 480);
  };

  const status =
    phase === "setup"
      ? "Arrange your fleet, then Start"
      : phase === "over"
        ? winner === "you"
          ? "🎉 You win!"
          : "💀 Bot wins"
        : thinking
          ? "Incoming fire…"
          : "Fire at the enemy waters";

  // Compute hover preview cells for manual placement
  const previewMap = new Map<string, "valid" | "invalid">();
  if (phase === "setup" && hoverCell && selectedShip !== null) {
    const size = FLEET[selectedShip][1];
    const [hr, hc] = hoverCell;
    const inBoundsCells: [number, number][] = [];
    let allInBounds = true;
    for (let k = 0; k < size; k++) {
      const r = horizontal ? hr : hr + k;
      const c = horizontal ? hc + k : hc;
      if (!inB(r, c)) { allInBounds = false; } else { inBoundsCells.push([r, c]); }
    }
    const ownCells = new Set(
      player.current.ships[selectedShip].cells.map(([r, c]) => `${r},${c}`)
    );
    const hasOverlap = inBoundsCells.some(
      ([r, c]) => player.current.grid[r][c] !== -1 && !ownCells.has(`${r},${c}`)
    );
    const valid = allInBounds && !hasOverlap;
    inBoundsCells.forEach(([r, c]) => previewMap.set(`${r},${c}`, valid ? "valid" : "invalid"));
  }

  const EnemyGrid = (
    <div className="bs-board enemy">
      {enemy.current.shots.map((row, r) =>
        row.map((shot, c) => {
          const isShip = enemy.current.grid[r][c] !== -1;
          const key = `${r},${c}`;
          const animCls =
            lastEnemyShot === key
              ? shot === "hit"
                ? "bs-anim-hit"
                : "bs-anim-miss"
              : "";
          const cls = [
            "bs-cell",
            shot === "hit" ? "hit" : shot === "miss" ? "miss" : "water",
            phase === "over" && isShip && shot === null ? "reveal" : "",
            animCls,
          ]
            .filter(Boolean)
            .join(" ");
          return <div key={key} className={cls} onClick={() => playerFire(r, c)} />;
        }),
      )}
    </div>
  );

  const PlayerGrid = (
    <div
      className="bs-board"
      onMouseLeave={() => phase === "setup" && setHoverCell(null)}
    >
      {player.current.grid.map((row, r) =>
        row.map((idx, c) => {
          const shot = player.current.shots[r][c];
          const key = `${r},${c}`;
          const preview = previewMap.get(key);
          const animCls =
            lastPlayerShot === key
              ? shot === "hit"
                ? "bs-anim-hit"
                : "bs-anim-miss"
              : "";

          // Compute which edges of this ship cell are outer edges (no same-ship neighbor)
          let edgeCls = "";
          if (idx !== -1 && shot !== "hit") {
            const top = r > 0 && player.current.grid[r - 1][c] === idx;
            const bot = r < SIZE - 1 && player.current.grid[r + 1][c] === idx;
            const lft = c > 0 && player.current.grid[r][c - 1] === idx;
            const rgt = c < SIZE - 1 && player.current.grid[r][c + 1] === idx;
            edgeCls = [
              !top && "bs-edge-t",
              !bot && "bs-edge-b",
              !lft && "bs-edge-l",
              !rgt && "bs-edge-r",
            ]
              .filter(Boolean)
              .join(" ");
          }

          const cls = [
            "bs-cell",
            shot === "hit" ? "hit" : shot === "miss" ? "miss" : idx !== -1 ? "ship" : "water",
            edgeCls,
            preview === "valid" ? "bs-preview-v" : preview === "invalid" ? "bs-preview-x" : "",
            animCls,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={key}
              className={cls}
              onMouseEnter={() => phase === "setup" && setHoverCell([r, c])}
              onClick={() => handleSetupClick(r, c)}
            />
          );
        }),
      )}
    </div>
  );

  const allReady = allPlaced(player.current);
  const placedCount = player.current.ships.filter((s) => s.cells.length > 0).length;

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Click", desc: "Fire torpedo at that cell" },
          { key: "R key", desc: "Rotate ship during placement" },
          { key: "Randomize", desc: "Auto-place all ships" },
        ]}
        tips={[
          "Attack in a checkerboard pattern to cover the grid faster",
          "Larger ships are easier to find first",
        ]}
      />
      <div className="bs">
        <div className="sudoku-bar">
          <span className="wg-progress">{status}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="bs-diff">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  className={`bs-diff-btn${difficulty === d ? " active" : ""}`}
                  onClick={() => setDifficulty(d)}
                  disabled={phase !== "setup"}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            {phase === "setup" ? (
              <>
                <button className="btn ghost" onClick={randomize}>
                  🎲 Randomize
                </button>
                <button
                  className="btn"
                  onClick={() => allReady && setPhase("playing")}
                  disabled={!allReady}
                >
                  Start
                </button>
              </>
            ) : (
              <button className="btn ghost" onClick={newGame}>
                New
              </button>
            )}
          </div>
        </div>

        {phase !== "setup" && (
          <>
            <div className="bs-label">
              Enemy waters · {shipsRemaining(enemy.current)} ships left
            </div>
            {EnemyGrid}
          </>
        )}

        {phase === "setup" && (
          <div className="bs-palette">
            {FLEET.map(([name, size], i) => {
              const placed = player.current.ships[i].cells.length > 0;
              const sel = selectedShip === i;
              return (
                <div
                  key={i}
                  className={`bs-palette-ship${sel ? " selected" : placed ? " placed" : ""}`}
                  onClick={() => setSelectedShip(sel ? null : i)}
                >
                  {name} ({size})
                </div>
              );
            })}
            <button className="btn ghost bs-rotate" onClick={() => setHorizontal((h) => !h)}>
              {horizontal ? "— H" : "| V"} Rotate (R)
            </button>
          </div>
        )}

        <div className="bs-label">
          Your fleet ·{" "}
          {phase === "setup"
            ? `${placedCount} of 5 placed`
            : `${shipsRemaining(player.current)} ships left`}
        </div>
        {PlayerGrid}

        <div className="sudoku-foot">
          <span className="muted sudoku-hint">
            {phase === "setup"
              ? "Click a ship then click the grid to place it · R to rotate · Randomize for auto-layout."
              : "Tap a cell in enemy waters to fire · sink all 5 ships to win."}
          </span>
        </div>
      </div>
      <GameLeaderboard
        game="battleship"
        value={shots}
        over={phase === "over" && winner === "you"}
        title="Battleship"
      />
    </div>
  );
}
