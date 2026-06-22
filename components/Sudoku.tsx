"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  generatePuzzle,
  isComplete,
  cloneBoard,
  type Board,
  type Difficulty,
} from "@/lib/sudoku";

type Notes = number[][][]; // notes[r][c] = candidate numbers
type Snapshot = { board: Board; notes: Notes };

function emptyNotes(): Notes {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [] as number[]),
  );
}

function cloneNotes(notes: Notes): Notes {
  return notes.map((row) => row.map((cell) => [...cell]));
}

/** Would placing `num` at (r,c) duplicate within its row/col/box? Ignores the
 *  cell's own current value (we may be replacing it). */
function wouldDuplicate(
  board: Board,
  r: number,
  c: number,
  num: number,
): boolean {
  for (let i = 0; i < 9; i++) {
    if (i !== c && board[r][i] === num) return true;
    if (i !== r && board[i][c] === num) return true;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if ((rr !== r || cc !== c) && board[rr][cc] === num) return true;
    }
  }
  return false;
}

const DIFFICULTIES: Difficulty[] = [
  "easy",
  "medium",
  "hard",
  "expert",
  "master",
  "grandmaster",
];

export function Sudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzle, setPuzzle] = useState<Board | null>(null);
  const [solution, setSolution] = useState<Board | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Notes>(emptyNotes());
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [generating, setGenerating] = useState(true);

  const newGame = useCallback((diff: Difficulty) => {
    setGenerating(true);
    setBoard(null);
    setTimeout(() => {
      const { puzzle, solution } = generatePuzzle(diff);
      setPuzzle(puzzle);
      setSolution(solution);
      setBoard(cloneBoard(puzzle));
      setNotes(emptyNotes());
      setHistory([]);
      setSelected(null);
      setGenerating(false);
    }, 20);
  }, []);

  useEffect(() => {
    newGame(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const won = useMemo(() => (board ? isComplete(board) : false), [board]);

  const remaining = useMemo(() => {
    const rem = Array<number>(10).fill(9);
    if (board) {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++) if (board[r][c]) rem[board[r][c]]--;
    }
    return rem;
  }, [board]);

  const isGiven = (r: number, c: number) => !!puzzle && puzzle[r][c] !== 0;

  // Digits that can't be placed in the selected cell (would duplicate).
  const blocked = useMemo(() => {
    const set = new Set<number>();
    if (board && selected && !notesMode) {
      const [r, c] = selected;
      if (!isGiven(r, c)) {
        for (let n = 1; n <= 9; n++) if (wouldDuplicate(board, r, c, n)) set.add(n);
      }
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, selected, notesMode, puzzle]);

  const pushHistory = useCallback(() => {
    if (board)
      setHistory((h) => [
        ...h,
        { board: cloneBoard(board), notes: cloneNotes(notes) },
      ]);
  }, [board, notes]);

  const place = useCallback(
    (num: number) => {
      if (!board || !selected || won) return;
      const [r, c] = selected;
      if (isGiven(r, c)) return;

      if (notesMode && num !== 0) {
        pushHistory();
        setNotes((prev) => {
          const next = cloneNotes(prev);
          const cell = next[r][c];
          next[r][c] = cell.includes(num)
            ? cell.filter((n) => n !== num)
            : [...cell, num].sort();
          return next;
        });
        return;
      }

      // Block placements that would duplicate in the row/col/box.
      if (num !== 0 && wouldDuplicate(board, r, c, num)) return;

      pushHistory();
      setBoard((prev) => {
        if (!prev) return prev;
        const next = cloneBoard(prev);
        next[r][c] = num; // 0 erases
        return next;
      });
      setNotes((prev) => {
        const next = cloneNotes(prev);
        next[r][c] = [];
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, selected, notesMode, won, puzzle, pushHistory],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setBoard(last.board);
    setNotes(last.notes);
    setHistory((h) => h.slice(0, -1));
  }, [history]);

  const hint = useCallback(() => {
    if (!board || !solution || won) return;
    let target: [number, number] | null =
      selected && board[selected[0]][selected[1]] === 0 ? selected : null;
    if (!target) {
      outer: for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (board[r][c] === 0) {
            target = [r, c];
            break outer;
          }
    }
    if (!target) return;
    const [r, c] = target;
    pushHistory();
    setBoard((prev) => {
      if (!prev) return prev;
      const next = cloneBoard(prev);
      next[r][c] = solution[r][c];
      return next;
    });
    setNotes((prev) => {
      const next = cloneNotes(prev);
      next[r][c] = [];
      return next;
    });
    setSelected([r, c]);
  }, [board, solution, selected, won, pushHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "9") place(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0")
        place(0);
      else if (e.key.toLowerCase() === "n") setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === "u") undo();
      else if (selected) {
        const [r, c] = selected;
        if (e.key === "ArrowUp") setSelected([Math.max(0, r - 1), c]);
        else if (e.key === "ArrowDown") setSelected([Math.min(8, r + 1), c]);
        else if (e.key === "ArrowLeft") setSelected([r, Math.max(0, c - 1)]);
        else if (e.key === "ArrowRight") setSelected([r, Math.min(8, c + 1)]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place, undo, selected]);

  const selectedValue = board && selected ? board[selected[0]][selected[1]] : 0;

  return (
    <div className="sudoku">
      <div className="sudoku-bar">
        <div className="seg">
          {DIFFICULTIES.map((d) => (
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

      <div className="sudoku-main">
        <div className="sudoku-grid-wrap">
          {generating || !board ? (
            <div className="sudoku-loading">
              <div className="spinner" />
              <span className="muted">Generating puzzle…</span>
            </div>
          ) : (
            <div className={`sudoku-grid${won ? " won" : ""}`}>
              {board.map((row, r) =>
                row.map((val, c) => {
                  const key = `${r},${c}`;
                  const given = isGiven(r, c);
                  const isSel =
                    selected && selected[0] === r && selected[1] === c;
                  const inPeer =
                    selected &&
                    (selected[0] === r ||
                      selected[1] === c ||
                      (Math.floor(selected[0] / 3) === Math.floor(r / 3) &&
                        Math.floor(selected[1] / 3) === Math.floor(c / 3)));
                  const sameNum = val !== 0 && val === selectedValue;
                  const wrong =
                    val !== 0 &&
                    !given &&
                    !!solution &&
                    val !== solution[r][c];
                  const cls = [
                    "cell",
                    given ? "given" : "",
                    isSel ? "sel" : "",
                    inPeer && !isSel ? "peer" : "",
                    sameNum && !isSel ? "same" : "",
                    wrong ? "wrong" : "",
                    c % 3 === 2 && c !== 8 ? "br" : "",
                    r % 3 === 2 && r !== 8 ? "bb" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={key}
                      className={cls}
                      onClick={() => setSelected([r, c])}
                    >
                      {val !== 0 ? (
                        val
                      ) : notes[r][c].length > 0 ? (
                        <span className="notes">
                          {Array.from({ length: 9 }, (_, i) => (
                            <span key={i} className="note">
                              {notes[r][c].includes(i + 1) ? i + 1 : ""}
                            </span>
                          ))}
                        </span>
                      ) : (
                        ""
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          )}
        </div>

        <div className="sudoku-side">
          <div className="pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
              const disabled = remaining[n] <= 0 || blocked.has(n);
              return (
                <button
                  key={n}
                  className={`pad-key${disabled ? " disabled" : ""}`}
                  onClick={() => place(n)}
                  disabled={disabled}
                >
                  <span className="pad-num">{n}</span>
                  <span className="pad-rem">{Math.max(0, remaining[n])}</span>
                </button>
              );
            })}
          </div>

          <div className="sudoku-controls">
            <button
              className="btn ghost"
              onClick={undo}
              disabled={history.length === 0}
            >
              ↶ Undo
            </button>
            <button className="btn ghost" onClick={hint} disabled={won}>
              💡 Hint
            </button>
            <button
              className={`btn ghost${notesMode ? " on" : ""}`}
              onClick={() => setNotesMode((m) => !m)}
              aria-pressed={notesMode}
            >
              ✏️ Notes {notesMode ? "on" : "off"}
            </button>
            <button className="btn ghost" onClick={() => place(0)}>
              ⌫ Erase
            </button>
          </div>
        </div>
      </div>

      {won ? <div className="sudoku-win">🎉 Solved! Nice thinking.</div> : null}

      <div className="sudoku-foot">
        <Link href="/" className="btn ghost">
          ← Back
        </Link>
        <span className="muted sudoku-hint">
          Wrong entries turn red · duplicates are blocked · <kbd>N</kbd> notes ·
          <kbd>U</kbd> undo
        </span>
      </div>
    </div>
  );
}
