"use client";

import { useCallback, useRef, useState } from "react";
import {
  placeFleet,
  fire,
  allSunk,
  aiChooseShot,
  neighbors,
  shipsRemaining,
  SIZE,
  type Board,
} from "@/lib/battleship";

type Phase = "setup" | "playing" | "over";

export function Battleship() {
  const enemy = useRef<Board>(placeFleet());
  const player = useRef<Board>(placeFleet());
  const aiMem = useRef<{ queue: [number, number][] }>({ queue: [] });
  const [phase, setPhase] = useState<Phase>("setup");
  const [winner, setWinner] = useState<"you" | "bot" | null>(null);
  const [thinking, setThinking] = useState(false);
  const [, setV] = useState(0);
  const bump = () => setV((v) => v + 1);

  const newGame = useCallback(() => {
    enemy.current = placeFleet();
    player.current = placeFleet();
    aiMem.current = { queue: [] };
    setWinner(null);
    setThinking(false);
    setPhase("setup");
    bump();
  }, []);

  const randomize = () => {
    player.current = placeFleet();
    bump();
  };

  const playerFire = (r: number, c: number) => {
    if (phase !== "playing" || thinking) return;
    const res = fire(enemy.current, r, c);
    if (!res) return;
    bump();
    if (allSunk(enemy.current)) {
      setWinner("you");
      setPhase("over");
      return;
    }
    setThinking(true);
    setTimeout(() => {
      const [br, bc] = aiChooseShot(player.current.shots, aiMem.current);
      const bres = fire(player.current, br, bc);
      if (bres?.result === "hit" && !bres.sunk) {
        for (const [nr, nc] of neighbors(br, bc)) {
          if (player.current.shots[nr][nc] === null) aiMem.current.queue.push([nr, nc]);
        }
      }
      if (bres?.sunk) aiMem.current.queue = [];
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

  const EnemyGrid = (
    <div className="bs-board enemy">
      {enemy.current.shots.map((row, r) =>
        row.map((shot, c) => {
          const isShip = enemy.current.grid[r][c] !== -1;
          const cls = [
            "bs-cell",
            shot === "hit" ? "hit" : shot === "miss" ? "miss" : "water",
            phase === "over" && isShip && shot === null ? "reveal" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return <div key={`${r},${c}`} className={cls} onClick={() => playerFire(r, c)} />;
        }),
      )}
    </div>
  );

  const PlayerGrid = (
    <div className="bs-board">
      {player.current.grid.map((row, r) =>
        row.map((idx, c) => {
          const shot = player.current.shots[r][c];
          const cls = [
            "bs-cell",
            shot === "hit" ? "hit" : idx !== -1 ? "ship" : "water",
            shot === "miss" ? "miss" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return <div key={`${r},${c}`} className={cls} />;
        }),
      )}
    </div>
  );

  return (
    <div className="bs">
      <div className="sudoku-bar">
        <span className="wg-progress">{status}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {phase === "setup" ? (
            <>
              <button className="btn ghost" onClick={randomize}>
                🎲 Randomize
              </button>
              <button className="btn" onClick={() => setPhase("playing")}>
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

      {phase !== "setup" ? (
        <>
          <div className="bs-label">
            Enemy waters · {shipsRemaining(enemy.current)} ships left
          </div>
          {EnemyGrid}
        </>
      ) : null}

      <div className="bs-label">
        Your fleet · {shipsRemaining(player.current)} ships left
      </div>
      {PlayerGrid}

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          {phase === "setup"
            ? "Randomize until you like your layout, then Start."
            : "Tap a cell in enemy waters to fire · sink all 5 ships to win."}
        </span>
      </div>
    </div>
  );
}
