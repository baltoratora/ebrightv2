"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTIES,
  createBoard,
  placeMines,
  reveal,
  toggleFlag,
  isWin,
  countFlags,
  revealAllMines,
  type Board,
  type Difficulty,
} from "@/lib/minesweeper";

type Status = "ready" | "playing" | "won" | "lost";
const ORDER: Difficulty[] = ["easy", "medium", "hard"];

export function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const cfg = DIFFICULTIES[difficulty];
  const [board, setBoard] = useState<Board>(() =>
    createBoard(cfg.rows, cfg.cols),
  );
  const [status, setStatus] = useState<Status>("ready");
  const [flagMode, setFlagMode] = useState(false);
  const [time, setTime] = useState(0);
  const minesPlaced = useRef(false);

  const newGame = useCallback((d: Difficulty) => {
    const c = DIFFICULTIES[d];
    setBoard(createBoard(c.rows, c.cols));
    setStatus("ready");
    setTime(0);
    minesPlaced.current = false;
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  const over = status === "won" || status === "lost";
  const flags = useMemo(() => countFlags(board), [board]);
  const minesLeft = cfg.mines - flags;

  const doFlag = useCallback(
    (r: number, c: number) => {
      if (over || board[r][c].state === "revealed") return;
      setBoard((b) => toggleFlag(b, r, c));
    },
    [board, over],
  );

  const doReveal = useCallback(
    (r: number, c: number) => {
      if (over) return;
      const cell = board[r][c];
      if (cell.state === "flagged" || cell.state === "revealed") return;

      let working = board;
      if (!minesPlaced.current) {
        working = placeMines(board, cfg.mines, r, c);
        minesPlaced.current = true;
        setStatus("playing");
      }
      const { board: nb, hitMine } = reveal(working, r, c);
      if (hitMine) {
        setBoard(revealAllMines(nb));
        setStatus("lost");
      } else if (isWin(nb)) {
        setBoard(nb);
        setStatus("won");
      } else {
        setBoard(nb);
      }
    },
    [board, over, cfg.mines],
  );

  const onCell = (r: number, c: number) =>
    flagMode ? doFlag(r, c) : doReveal(r, c);

  const face = status === "lost" ? "😵" : status === "won" ? "😎" : "🙂";

  return (
    <div className="sudoku ms">
      <div className="sudoku-bar">
        <div className="seg">
          {ORDER.map((d) => (
            <button
              key={d}
              className={`seg-btn${d === difficulty ? " active" : ""}`}
              onClick={() => {
                setDifficulty(d);
                newGame(d);
              }}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn ghost" onClick={() => newGame(difficulty)}>
          New
        </button>
      </div>

      <div className="ms-status">
        <span className="ms-counter">💣 {minesLeft}</span>
        <button className="ms-face" onClick={() => newGame(difficulty)} aria-label="New game">
          {face}
        </button>
        <span className="ms-counter">⏱ {String(time).padStart(3, "0")}</span>
      </div>

      <div
        className="ms-board"
        style={{ "--cols": cfg.cols } as React.CSSProperties}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const cls = ["ms-cell"];
            let content = "";
            if (cell.state === "flagged") {
              cls.push("flagged");
              content = "🚩";
            } else if (cell.state === "revealed") {
              cls.push("revealed");
              if (cell.mine) {
                cls.push("mine");
                content = "💣";
              } else if (cell.adjacent > 0) {
                cls.push("n" + cell.adjacent);
                content = String(cell.adjacent);
              }
            }
            return (
              <button
                key={`${r},${c}`}
                className={cls.join(" ")}
                onClick={() => onCell(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  doFlag(r, c);
                }}
              >
                {content}
              </button>
            );
          }),
        )}
      </div>

      {status === "won" ? (
        <div className="sudoku-win">🎉 Cleared! {time}s</div>
      ) : null}
      {status === "lost" ? (
        <div className="sudoku-win lost">💥 Boom. Hit New to try again.</div>
      ) : null}

      <div className="sudoku-controls">
        <button
          className={`btn ghost${flagMode ? " on" : ""}`}
          onClick={() => setFlagMode((m) => !m)}
          aria-pressed={flagMode}
        >
          {flagMode ? "🚩 Flag mode" : "⛏ Dig mode"}
        </button>
      </div>

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Tap to dig · toggle <strong>Flag mode</strong> to place flags
          (right-click also flags) · first tap is always safe.
        </span>
      </div>
    </div>
  );
}
