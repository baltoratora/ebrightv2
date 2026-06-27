"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generatePuzzle,
  isComplete,
  cloneBoard,
  computeCandidates,
  type Board,
  type Difficulty,
} from "@/lib/sudoku";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

type Notes = number[][][]; // notes[r][c] = candidate numbers
type GameState = { board: Board; notes: Notes };

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
  const [history, setHistory] = useState<GameState[]>([]);
  const [redoStack, setRedoStack] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [highlightDigit, setHighlightDigit] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [seconds, setSeconds] = useState(0);

  const newGame = useCallback((diff: Difficulty) => {
    setGenerating(true);
    setBoard(null);
    try { localStorage.removeItem("sudoku_progress"); } catch {}
    setTimeout(() => {
      const { puzzle, solution } = generatePuzzle(diff);
      setPuzzle(puzzle);
      setSolution(solution);
      setBoard(cloneBoard(puzzle));
      setNotes(emptyNotes());
      setHistory([]);
      setRedoStack([]);
      setSelected(null);
      setHighlightDigit(null);
      setSeconds(0);
      setGenerating(false);
    }, 20);
  }, []);

  useEffect(() => {
    // Attempt to restore saved progress before generating a new puzzle.
    try {
      const raw = localStorage.getItem("sudoku_progress");
      if (raw) {
        const saved = JSON.parse(raw) as {
          puzzle: Board;
          solution: Board;
          board: Board;
          notes: Notes;
          history: GameState[];
          seconds: number;
          difficulty: Difficulty;
          status: string;
        };
        if (saved.difficulty === difficulty && saved.status === "active") {
          setPuzzle(saved.puzzle);
          setSolution(saved.solution);
          setBoard(saved.board);
          setNotes(saved.notes);
          setHistory(saved.history ?? []);
          setRedoStack([]);
          setSeconds(saved.seconds);
          setGenerating(false);
          return;
        }
      }
    } catch {}
    newGame(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const won = useMemo(() => (board ? isComplete(board) : false), [board]);

  useEffect(() => {
    if (generating || won) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [generating, won]);

  // Persist progress to localStorage on every relevant state change.
  useEffect(() => {
    if (generating || !board || !puzzle || !solution) return;
    try {
      const status = won ? "won" : "active";
      localStorage.setItem(
        "sudoku_progress",
        JSON.stringify({ puzzle, solution, board, notes, history, seconds, difficulty, status }),
      );
    } catch {}
  }, [board, notes, history, seconds, difficulty, generating, won, puzzle, solution]);

  // Rows/columns that contain the highlighted digit (for the click-to-highlight).
  const { hiRows, hiCols } = useMemo(() => {
    const rows = new Set<number>();
    const cols = new Set<number>();
    if (board && highlightDigit) {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (board[r][c] === highlightDigit) {
            rows.add(r);
            cols.add(c);
          }
    }
    return { hiRows: rows, hiCols: cols };
  }, [board, highlightDigit]);

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
    if (board) {
      setHistory((h) => [
        ...h,
        { board: cloneBoard(board), notes: cloneNotes(notes) },
      ]);
      setRedoStack([]); // any new move clears the redo stack
    }
  }, [board, notes]);

  // Apply a value (1-9) or erase (0) to a cell. Returns true if it changed
  // something — used to decide whether to clear the selection afterward.
  const applyValue = useCallback(
    (r: number, c: number, num: number): boolean => {
      if (!board || won || isGiven(r, c)) return false;

      if (notesMode && num !== 0) {
        if (board[r][c] !== 0) return false; // can't pencil into a filled cell
        pushHistory();
        setNotes((prev) => {
          const next = cloneNotes(prev);
          const cell = next[r][c];
          next[r][c] = cell.includes(num)
            ? cell.filter((n) => n !== num)
            : [...cell, num].sort();
          return next;
        });
        return true;
      }

      // Block placements that would duplicate in the row/col/box.
      if (num !== 0 && wouldDuplicate(board, r, c, num)) return false;
      if (num === 0 && board[r][c] === 0 && notes[r][c].length === 0)
        return false; // nothing to erase

      pushHistory();
      setBoard((prev) => {
        if (!prev) return prev;
        const next = cloneBoard(prev);
        next[r][c] = num;
        return next;
      });
      setNotes((prev) => {
        const next = cloneNotes(prev);
        next[r][c] = [];
        return next;
      });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, notes, notesMode, won, puzzle, pushHistory],
  );

  // Number pad: arm the digit (highlight), and if a cell is selected, fill it
  // (cell-first). Clear the selection on a successful fill so the next pad
  // click just re-arms instead of overwriting.
  const onPad = useCallback(
    (n: number) => {
      setHighlightDigit(n);
      if (selected && applyValue(selected[0], selected[1], n)) {
        setSelected(null);
      }
    },
    [selected, applyValue],
  );

  // Cell click: filled cell → highlight its number; empty cell with an armed
  // digit → fill it (number-first); otherwise just select.
  const onCell = useCallback(
    (r: number, c: number) => {
      if (!board) return;
      const val = board[r][c];
      if (val !== 0) {
        setSelected([r, c]);
        setHighlightDigit(val);
      } else if (highlightDigit != null) {
        const ok = applyValue(r, c, highlightDigit);
        setSelected(ok ? null : [r, c]);
      } else {
        setSelected([r, c]);
      }
    },
    [board, highlightDigit, applyValue],
  );

  const onErase = useCallback(() => {
    if (selected) applyValue(selected[0], selected[1], 0);
  }, [selected, applyValue]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    // Push current state to redo stack before restoring.
    if (board) {
      setRedoStack((r) => [
        ...r,
        { board: cloneBoard(board), notes: cloneNotes(notes) },
      ]);
    }
    setBoard(last.board);
    setNotes(last.notes);
    setHistory((h) => h.slice(0, -1));
  }, [history, board, notes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    // Push current state to history.
    if (board) {
      setHistory((h) => [
        ...h,
        { board: cloneBoard(board), notes: cloneNotes(notes) },
      ]);
    }
    setBoard(next.board);
    setNotes(next.notes);
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack, board, notes]);

  const smartNotes = useCallback(() => {
    if (!board || won) return;
    pushHistory();
    const candidates = computeCandidates(board);
    setNotes((prev) => {
      const next = prev.map((row, r) =>
        row.map((cell, c) => {
          // Only fill empty cells (no given and no player-entered digit).
          if (board[r][c] !== 0) return cell;
          const cands = candidates[r][c];
          if (cands.length === 0) return cell;
          // Merge: union of existing notes and computed candidates.
          const merged = [...new Set([...cell, ...cands])].sort(
            (a, b) => a - b,
          );
          return merged;
        }),
      );
      return next;
    });
  }, [board, won, pushHistory]);

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
    setSeconds((s) => s + 42); // hint penalty
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
      if (e.key >= "1" && e.key <= "9") {
        const n = Number(e.key);
        setHighlightDigit(n);
        // Keyboard keeps the selection so arrow-key navigation keeps working.
        if (selected) applyValue(selected[0], selected[1], n);
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        if (selected) applyValue(selected[0], selected[1], 0);
      } else if (e.key.toLowerCase() === "n") setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === "u") undo();
      else if (e.key.toLowerCase() === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        redo();
      } else if (selected) {
        const [r, c] = selected;
        if (e.key === "ArrowUp") setSelected([Math.max(0, r - 1), c]);
        else if (e.key === "ArrowDown") setSelected([Math.min(8, r + 1), c]);
        else if (e.key === "ArrowLeft") setSelected([r, Math.max(0, c - 1)]);
        else if (e.key === "ArrowRight") setSelected([r, Math.min(8, c + 1)]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyValue, undo, redo, selected]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "1–9", desc: "Fill selected cell" },
          { key: "← → ↑ ↓", desc: "Navigate cells" },
          { key: "N", desc: "Toggle notes mode" },
          { key: "U", desc: "Undo last move" },
          { key: "Ctrl+Y", desc: "Redo" },
          { key: "Del", desc: "Erase cell" },
        ]}
        tips={["Start with rows or columns that already have 7+ numbers"]}
      />
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
        {!generating && !won && board ? (
          <span className="sudoku-timer">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        ) : null}
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
                  const same =
                    highlightDigit !== null &&
                    val !== 0 &&
                    val === highlightDigit;
                  const inLine =
                    highlightDigit !== null &&
                    (hiRows.has(r) || hiCols.has(c));
                  const wrong =
                    val !== 0 &&
                    !given &&
                    !!solution &&
                    val !== solution[r][c];
                  const cls = [
                    "cell",
                    given ? "given" : "",
                    isSel ? "sel" : "",
                    same && !isSel ? "same" : "",
                    inLine && !same && !isSel ? "peer" : "",
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
                      onClick={() => onCell(r, c)}
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
              const cantPlace = blocked.has(n); // would duplicate in selected cell
              const done = remaining[n] <= 0; // all nine placed
              return (
                <button
                  key={n}
                  className={[
                    "pad-key",
                    cantPlace ? "disabled" : "",
                    done ? "done" : "",
                    highlightDigit === n ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  // Arm the digit + highlight; fills the selected cell if any.
                  onClick={() => onPad(n)}
                  aria-pressed={highlightDigit === n}
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
            <button
              className="btn ghost"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              ↷ Redo
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
            <button className="btn ghost" onClick={onErase}>
              ⌫ Erase
            </button>
            <button className="btn ghost" onClick={smartNotes} disabled={won}>
              Notes ✦
            </button>
          </div>
        </div>
      </div>

      {won ? <div className="sudoku-win">🎉 Solved! Nice thinking.</div> : null}

      <div className="sudoku-foot">
        <span className="muted sudoku-hint">
          Wrong entries turn red · duplicates are blocked · <kbd>N</kbd> notes ·
          <kbd>U</kbd> undo
        </span>
      </div>
    </div>
      <GameLeaderboard
        game={`sudoku:${difficulty}`}
        value={seconds}
        over={won}
        title={`Sudoku · ${difficulty}`}
      />
    </div>
  );
}
