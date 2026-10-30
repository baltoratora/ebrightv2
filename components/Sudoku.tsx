"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generatePuzzle,
  isComplete,
  cloneBoard,
  computeCandidates,
  wouldDuplicate,
  getEntryState,
  remainingDigits,
  type Board,
  type Difficulty,
} from "@/lib/sudoku";
import { readSudokuProgress, pruneNotes, SUDOKU_DIFFICULTIES } from "@/lib/sudoku-progress";
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

const DIFFICULTIES = SUDOKU_DIFFICULTIES;

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
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState("");

  const newGame = useCallback((diff: Difficulty) => {
    setGenerating(true);
    setFeedback("");
    setPaused(false);
    setNotesMode(false);
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
        const saved = readSudokuProgress(JSON.parse(raw));
        if (saved && saved.status === "active") {
          setDifficulty(saved.difficulty);
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
    if (generating || won || paused) return;
    const id = setInterval(() => { if (!document.hidden) setSeconds((s) => s + 1); }, 1000);
    return () => clearInterval(id);
  }, [generating, won, paused]);

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

  const remaining = useMemo(() => remainingDigits(board, solution), [board, solution]);

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
  // something. Selection stays put for consistent touch/keyboard editing.
  const applyValue = useCallback(
    (r: number, c: number, num: number): boolean => {
      if (!board || won || paused || isGiven(r, c)) return false;
      setFeedback("");

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
      if (num !== 0 && wouldDuplicate(board, r, c, num)) {
        setFeedback(`${num} already appears in this row, column or box. Choose another number.`);
        return false;
      }
      if (num !== 0 && solution && num !== solution[r][c]) {
        setFeedback(`Row ${r + 1}, column ${c + 1}: ${num} is incorrect. Erase or replace the red underlined entry.`);
      }
      if (num === 0 && board[r][c] === 0 && notes[r][c].length === 0)
        return false; // nothing to erase

      if (num !== 0 && board[r][c] === num) return false;
      pushHistory();
      setBoard((prev) => {
        if (!prev) return prev;
        const next = cloneBoard(prev);
        next[r][c] = num;
        return next;
      });
      setNotes((prev) => pruneNotes(prev, r, c, num));
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, notes, notesMode, won, paused, puzzle, solution, pushHistory],
  );

  // Restore the original hybrid input: arm a digit, then tap empty cells.
  // A successful pad fill clears selection so choosing the next digit cannot
  // accidentally overwrite the previous cell. Keyboard editing stays selected.
  const onPad = useCallback((n: number) => {
    if (paused || won || generating) return;
    setHighlightDigit(n);
    if (selected && applyValue(selected[0], selected[1], n)) setSelected(null);
  }, [selected, applyValue, paused, won, generating]);

  const onCell = useCallback((r: number, c: number) => {
    if (!board || paused || won) return;
    const value = board[r][c];
    if (value !== 0) {
      setSelected([r, c]);
      setHighlightDigit(value);
    } else if (highlightDigit !== null) {
      const changed = applyValue(r, c, highlightDigit);
      setSelected(changed ? null : [r, c]);
    } else {
      setSelected([r, c]);
    }
  }, [board, paused, won, highlightDigit, applyValue]);

  const onErase = useCallback(() => {
    if (selected) applyValue(selected[0], selected[1], 0);
  }, [selected, applyValue]);

  const undo = useCallback(() => {
    if (paused || generating || history.length === 0) return;
    setFeedback("");
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
  }, [history, board, notes, paused, generating]);

  const redo = useCallback(() => {
    if (paused || generating || redoStack.length === 0) return;
    setFeedback("");
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
  }, [redoStack, board, notes, paused, generating]);

  const smartNotes = useCallback(() => {
    if (!board || won || paused) return;
    pushHistory();
    const candidates = computeCandidates(board);
    setNotes((prev) => {
      const next = prev.map((row, r) =>
        row.map((cell, c) => {
          // Only fill empty cells (no given and no player-entered digit).
          if (board[r][c] !== 0) return cell;
          const cands = candidates[r][c];
          return [...cands];
        }),
      );
      return next;
    });
  }, [board, won, paused, pushHistory]);

  const hint = useCallback(() => {
    if (!board || !solution || won || paused) return;
    let target: [number, number] | null =
      selected && board[selected[0]][selected[1]] !== solution[selected[0]][selected[1]] ? selected : null;
    if (!target) {
      outer: for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (board[r][c] !== solution[r][c]) {
            target = [r, c];
            break outer;
          }
    }
    if (!target) return;
    const [r, c] = target;
    setFeedback("Hint revealed. 42 seconds added to the timer.");
    setHighlightDigit(solution[r][c]);
    setSeconds((s) => s + 42); // hint penalty
    pushHistory();
    setBoard((prev) => {
      if (!prev) return prev;
      const next = cloneBoard(prev);
      next[r][c] = solution[r][c];
      return next;
    });
    setNotes((prev) => pruneNotes(prev, r, c, solution[r][c]));
    setSelected([r, c]);
  }, [board, solution, selected, won, paused, pushHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || generating || e.altKey || e.isComposing) return;
      // Don't hijack keys while typing (e.g. the high-score name field).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable || t.closest("nav, summary, [role=dialog]"))) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
        else if (e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
        return;
      }
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
        // preventDefault so arrows move the selection without scrolling the page.
        if (e.key === "ArrowUp") { e.preventDefault(); setSelected([Math.max(0, r - 1), c]); }
        else if (e.key === "ArrowDown") { e.preventDefault(); setSelected([Math.min(8, r + 1), c]); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); setSelected([r, Math.max(0, c - 1)]); }
        else if (e.key === "ArrowRight") { e.preventDefault(); setSelected([r, Math.min(8, c + 1)]); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyValue, undo, redo, selected, paused, generating]);

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
        tips={["Choose a number, then tap empty cells to place it. You can also select a cell first.", "Blue entries match the solution; red underlined entries need correcting. Duplicates are blocked.", "Start with rows or columns that already have 7+ numbers", "Hints reveal a correct number and add 42 seconds to your time.", "Your puzzle and difficulty save automatically on this device."]}
      />
    <div className="sudoku">
      <div className="sudoku-bar">
        <label className="game-select-label">Difficulty
          <select className="game-select" value={difficulty} disabled={generating} onChange={(e) => {
            const d = e.target.value as Difficulty;
            if (history.length > 0 && !won && !window.confirm("Replace this puzzle with a new difficulty?")) return;
            setDifficulty(d); newGame(d);
          }}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}</select>
        </label>
        {!generating && !won && board ? (
          <span className="sudoku-timer">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        ) : null}
        <button className="btn ghost" disabled={generating} onClick={() => { if (!history.length || won || window.confirm("Start a new puzzle? Your current progress will be replaced.")) newGame(difficulty); }}>
          New puzzle
        </button>
      </div>

      <div className="sudoku-play-state">
        <span>{notesMode ? "Notes mode · pencil in possibilities" : highlightDigit ? `Number ${highlightDigit} ready · tap an empty cell` : "Choose a number, then tap an empty cell"}</span>
        <button className="btn ghost" disabled={generating || won} onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
      </div>
      <div className="sudoku-main">
        <div className="sudoku-grid-wrap">
          {paused && <button className="sudoku-pause" onClick={() => setPaused(false)}>Paused · Tap to resume</button>}
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
                  const entryState = getEntryState(puzzle!, solution!, board, r, c);
                  const wrong = entryState === "incorrect";
                  const cls = [
                    "cell",
                    given ? "given" : "",
                    isSel ? "sel" : "",
                    same && !isSel ? "same" : "",
                    inLine && !same && !isSel ? "peer" : "",
                    wrong ? "wrong" : entryState === "correct" ? "correct" : "",
                    c % 3 === 2 && c !== 8 ? "br" : "",
                    r % 3 === 2 && r !== 8 ? "bb" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={key}
                      className={cls}
                      aria-pressed={!!isSel}
                      data-entry-state={entryState}
                      disabled={paused || won}
                      onClick={() => onCell(r, c)}
                      aria-label={`Row ${r + 1}, column ${c + 1}${
                        val !== 0
                          ? `, ${val}${given ? " given" : wrong ? ", incorrect" : ", correct"}`
                          : notes[r][c].length > 0
                            ? `, notes ${notes[r][c].join(" ")}`
                            : ", empty"
                      }`}
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
                  disabled={paused || won || generating}
                  // Arm the digit + highlight; fills the selected cell if any.
                  onClick={() => onPad(n)}
                  aria-pressed={highlightDigit === n}
                  aria-label={`${n}, ${Math.max(0, remaining[n])} remaining`}
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
              disabled={paused || history.length === 0}
              title="Undo last move (U or Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              className="btn ghost"
              onClick={redo}
              disabled={paused || redoStack.length === 0}
            >
              ↷ Redo
            </button>
            <button className="btn ghost" onClick={hint} title="Reveal a correct number (+42 seconds)" disabled={won || paused}>
              Hint
            </button>
            <button
              className={`btn ghost${notesMode ? " on" : ""}`}
              onClick={() => setNotesMode((m) => !m)}
              disabled={paused || won || generating}
              aria-pressed={notesMode}
            >
              Notes {notesMode ? "on" : "off"}
            </button>
            <button className="btn ghost" onClick={onErase} disabled={paused || !selected || won}>
              ⌫ Erase
            </button>
            <button className="btn ghost" onClick={smartNotes} disabled={won || paused}>
              Auto notes
            </button>
          </div>
        </div>
      </div>

      <div className="sudoku-feedback" role="status" aria-live="polite">{feedback}</div>
      <div className="sudoku-legend" aria-label="Entry colours">
        <span className="sudoku-legend-correct">Blue · correct entry</span>
        <span className="sudoku-legend-wrong">Red + underline · incorrect entry</span>
      </div>
      {won ? <div className="sudoku-win" aria-live="polite">🎉 Solved! Nice thinking.</div> : null}

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
