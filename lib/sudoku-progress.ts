import { isComplete, type Board, type Difficulty } from "./sudoku";

export type Notes = number[][][];
export type SudokuMove = { board: Board; notes: Notes };
export const SUDOKU_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert", "master", "grandmaster"];
export type SudokuProgress = SudokuMove & { puzzle: Board; solution: Board; history: SudokuMove[]; seconds: number; difficulty: Difficulty; status: "active" | "won" };
const boardOK = (b: unknown): b is Board => Array.isArray(b) && b.length === 9 && b.every((row) => Array.isArray(row) && row.length === 9 && row.every((v) => Number.isInteger(v) && v >= 0 && v <= 9));
const notesOK = (n: unknown): n is Notes => Array.isArray(n) && n.length === 9 && n.every((row) => Array.isArray(row) && row.length === 9 && row.every((cell) => Array.isArray(cell) && cell.length <= 9 && new Set(cell).size === cell.length && cell.every((v) => Number.isInteger(v) && v >= 1 && v <= 9)));

/** Accept all supported difficulties and reject corrupt or incompatible local data. */
export function readSudokuProgress(raw: unknown): SudokuProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as SudokuProgress;
  if (!boardOK(s.puzzle) || !boardOK(s.solution) || !isComplete(s.solution.map((row) => [...row])) || !boardOK(s.board) || !notesOK(s.notes) ||
    !SUDOKU_DIFFICULTIES.includes(s.difficulty) || !Number.isInteger(s.seconds) || s.seconds < 0 ||
    !["active", "won"].includes(s.status)) return null;
  const cluesMatch = (b: Board) => s.puzzle.every((row, r) => row.every((v, c) => v === 0 || (v === s.solution[r][c] && b[r][c] === v)));
  if (!cluesMatch(s.board)) return null;
  const history = Array.isArray(s.history) ? s.history.slice(-200).filter((h) => h && boardOK(h.board) && notesOK(h.notes) && cluesMatch(h.board)) : [];
  return { ...s, history };
}

/** Prune pencil marks from the cell and its row/column/box after placing a digit. */
export function pruneNotes(notes: Notes, r: number, c: number, digit: number): Notes {
  return notes.map((row, rr) => row.map((cell, cc) => rr === r && cc === c ? [] :
    digit !== 0 && (rr === r || cc === c || (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3))) ? cell.filter((n) => n !== digit) : [...cell]));
}
