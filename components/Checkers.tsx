"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  newBoard,
  generateMoves,
  applyMove,
  countPieces,
  bestMove,
  type Board,
  type Color,
  type Move,
} from "@/lib/checkers";

type Difficulty = "easy" | "medium" | "hard";
const DEPTH: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6 };

interface Snap {
  board: Board;
  turn: Color;
}

export function Checkers() {
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [turn, setTurn] = useState<Color>("r");
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<Snap[]>([]);

  const counts = useMemo(() => countPieces(board), [board]);
  const legal = useMemo(() => generateMoves(board, turn), [board, turn]);
  const winnerColor: Color | null =
    counts.r === 0 ? "b" : counts.b === 0 ? "r" : legal.length === 0 ? (turn === "r" ? "b" : "r") : null;
  const over = winnerColor !== null;

  const myMoves = useMemo(
    () => (turn === "r" && !over ? legal : []),
    [legal, turn, over],
  );
  const fromSet = useMemo(
    () => new Set(myMoves.map((m) => `${m.from[0]},${m.from[1]}`)),
    [myMoves],
  );
  const destSet = useMemo(() => {
    if (!sel) return new Set<string>();
    return new Set(
      myMoves
        .filter((m) => m.from[0] === sel[0] && m.from[1] === sel[1])
        .map((m) => `${m.to[0]},${m.to[1]}`),
    );
  }, [myMoves, sel]);

  const newGame = useCallback(() => {
    setBoard(newBoard());
    setTurn("r");
    setSel(null);
    setThinking(false);
    setHistory([]);
  }, []);

  const undo = useCallback(() => {
    if (thinking || !history.length) return;
    const h = [...history];
    let snap = h.pop()!;
    while (snap.turn !== "r" && h.length) snap = h.pop()!;
    setBoard(snap.board);
    setTurn(snap.turn);
    setHistory(h);
    setSel(null);
  }, [thinking, history]);

  const onSquare = (r: number, c: number) => {
    if (turn !== "r" || over) return;
    const key = `${r},${c}`;
    if (sel) {
      if (destSet.has(key)) {
        const move = myMoves.find(
          (m) => m.from[0] === sel[0] && m.from[1] === sel[1] && m.to[0] === r && m.to[1] === c,
        )!;
        setHistory((hh) => [...hh, { board, turn }]);
        setBoard(applyMove(board, move));
        setTurn("b");
        setSel(null);
        return;
      }
      if (fromSet.has(key)) return setSel([r, c]);
      return setSel(null);
    }
    if (fromSet.has(key)) setSel([r, c]);
  };

  // Bot (Black) replies.
  useEffect(() => {
    if (turn !== "b" || over) return;
    setThinking(true);
    const id = setTimeout(() => {
      const m: Move | null = bestMove(board, "b", DEPTH[difficulty]);
      if (m) {
        setHistory((hh) => [...hh, { board, turn: "b" }]);
        setBoard(applyMove(board, m));
      }
      setTurn("r");
      setThinking(false);
    }, 350);
    return () => clearTimeout(id);
  }, [board, turn, over, difficulty]);

  const status = over
    ? winnerColor === "r"
      ? "🎉 You win!"
      : "Bot wins"
    : thinking
      ? "Bot is thinking…"
      : "Your move";

  return (
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
          <button className="btn ghost" onClick={undo} disabled={thinking || !history.length}>
            ↶ Undo
          </button>
          <button className="btn ghost" onClick={newGame}>
            New
          </button>
        </div>
      </div>

      <div className="chess-status">{status}</div>

      <div className="ck-board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const key = `${r},${c}`;
            const cls = [
              "ck-sq",
              dark ? "dark" : "light",
              sel && sel[0] === r && sel[1] === c ? "sel" : "",
              destSet.has(key) ? "dest" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={key} className={cls} onClick={() => onSquare(r, c)}>
                {cell ? (
                  <span className={`ck-piece ${cell.color}`}>{cell.king ? "♔" : ""}</span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          You&apos;re Red (bottom). Captures are mandatory · reach the far row to
          king.
        </span>
      </div>
    </div>
  );
}
