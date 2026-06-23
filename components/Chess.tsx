"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { bestMove } from "@/lib/chessAI";
import { GameLeaderboard } from "@/components/GameLeaderboard";

const GLYPH: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
type Difficulty = "easy" | "medium" | "hard";
const DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function Chessboard() {
  const gameRef = useRef(new Chess());
  const [, setVersion] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [thinking, setThinking] = useState(false);

  const game = gameRef.current;
  const rerender = () => setVersion((v) => v + 1);

  const dests = useMemo<Set<string>>(() => {
    if (!selected) return new Set();
    return new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, game.fen()]);

  const newGame = useCallback(() => {
    gameRef.current = new Chess();
    setSelected(null);
    setThinking(false);
    rerender();
  }, []);

  const undo = useCallback(() => {
    if (thinking) return;
    if (game.history().length) game.undo();
    if (game.turn() === "b" && game.history().length) game.undo();
    setSelected(null);
    rerender();
  }, [game, thinking]);

  const makeMove = (from: Square, to: Square) => {
    const piece = game.get(from);
    const lastRank = to[1] === "8" || to[1] === "1";
    try {
      game.move({ from, to, promotion: piece?.type === "p" && lastRank ? "q" : undefined });
    } catch {
      return;
    }
    setSelected(null);
    rerender();
  };

  const onSquare = (sq: Square) => {
    if (thinking || game.isGameOver()) return;
    const piece = game.get(sq);
    if (selected) {
      if (sq === selected) return setSelected(null);
      if (dests.has(sq)) return makeMove(selected, sq);
      if (piece && piece.color === "w") return setSelected(sq);
      return setSelected(null);
    }
    if (piece && piece.color === "w" && game.turn() === "w") setSelected(sq);
  };

  // Bot (Black) replies automatically.
  useEffect(() => {
    if (game.turn() !== "b" || game.isGameOver()) return;
    setThinking(true);
    const id = setTimeout(() => {
      const m = bestMove(game, DEPTH[difficulty]);
      if (m) game.move(m);
      setThinking(false);
      rerender();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen(), difficulty]);

  const status = useMemo(() => {
    if (game.isCheckmate()) return game.turn() === "w" ? "Checkmate — Bot wins" : "🎉 Checkmate — you win!";
    if (game.isStalemate()) return "Stalemate — draw";
    if (game.isDraw()) return "Draw";
    if (game.inCheck()) return game.turn() === "w" ? "Check! Your move" : "Check!";
    if (thinking) return "Bot is thinking…";
    return game.turn() === "w" ? "Your move" : "…";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen(), thinking]);

  const board = game.board();

  return (
    <div className="game-layout">
    <div className="chess">
      <div className="sudoku-bar">
        <div className="seg">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`seg-btn${d === difficulty ? " active" : ""}`}
              onClick={() => setDifficulty(d)}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={undo} disabled={thinking}>
            ↶ Undo
          </button>
          <button className="btn ghost" onClick={newGame}>
            New
          </button>
        </div>
      </div>

      <div className="chess-status">{status}</div>

      <div className="chess-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const sq = (FILES[c] + (8 - r)) as Square;
            const light = (r + c) % 2 === 0;
            const cls = [
              "chess-sq",
              light ? "light" : "dark",
              selected === sq ? "sel" : "",
              dests.has(sq) ? (cell ? "capture" : "dest") : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={sq} className={cls} onClick={() => onSquare(sq)}>
                {cell ? (
                  <span className={`chess-piece ${cell.color === "w" ? "white" : "black"}`}>
                    {GLYPH[cell.type]}
                  </span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          You&apos;re White. Tap a piece, then tap where to move · pawns
          auto-promote to a queen.
        </span>
      </div>
    </div>
      <GameLeaderboard
        game="chess"
        value={Math.ceil(game.history().length / 2)}
        over={game.isCheckmate() && game.turn() === "b"}
        title="Chess · moves to win"
      />
    </div>
  );
}
