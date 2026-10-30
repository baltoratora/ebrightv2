// Sudoku generation, solving, and validation. Pure logic (no DOM), unit-tested.
// Board = 9x9 grid of numbers; 0 means empty.

export type Board = number[][];
export type Difficulty =
  | "easy"
  | "medium"
  | "hard"
  | "expert"
  | "master"
  | "grandmaster";

const CLUES: Record<Difficulty, number> = {
  easy: 45,
  medium: 38,
  hard: 32,
  expert: 28,
  master: 25,
  grandmaster: 23,
};

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array<number>(9).fill(0));
}

export function isValidPlacement(
  board: Board,
  row: number,
  col: number,
  num: number,
): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

function firstEmpty(board: Board): [number, number] | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function shuffled(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function solve(board: Board): boolean {
  const spot = firstEmpty(board);
  if (!spot) return true;
  const [row, col] = spot;
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num;
      if (solve(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

export function countSolutions(board: Board, limit = 2): number {
  const spot = firstEmpty(board);
  if (!spot) return 1;
  const [row, col] = spot;
  let count = 0;
  for (let num = 1; num <= 9 && count < limit; num++) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num;
      count += countSolutions(board, limit - count);
      board[row][col] = 0;
    }
  }
  return count;
}

export function generateSolved(): Board {
  const board = emptyBoard();
  fillRandom(board);
  return board;
}

function fillRandom(board: Board): boolean {
  const spot = firstEmpty(board);
  if (!spot) return true;
  const [row, col] = spot;
  for (const num of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num;
      if (fillRandom(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

export function generatePuzzle(difficulty: Difficulty): {
  puzzle: Board;
  solution: Board;
} {
  const solution = generateSolved();
  const puzzle = cloneBoard(solution);
  const targetClues = CLUES[difficulty];

  // Visit cells in random order, removing each if the puzzle stays unique.
  const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;
  for (const idx of cells) {
    if (clues <= targetClues) break;
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    if (puzzle[r][c] === 0) continue;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(cloneBoard(puzzle), 2) !== 1) {
      puzzle[r][c] = backup; // removal broke uniqueness; keep the clue
    } else {
      clues--;
    }
  }
  return { puzzle, solution };
}

export type Notes = number[][][];

export function computeCandidates(board: Board): Notes {
  return board.map((row, r) =>
    row.map((val, c) => {
      if (val !== 0) return [];
      const candidates: number[] = [];
      for (let n = 1; n <= 9; n++) {
        if (isValidPlacement(board, r, c, n)) candidates.push(n);
      }
      return candidates;
    }),
  );
}

/** Validate without temporarily mutating React's board state. */
export function isComplete(board: Board): boolean {
  return board.length === 9 && board.every((row) => row.length === 9) &&
    board.every((row, r) => row.every((digit, c) =>
      Number.isInteger(digit) && digit >= 1 && digit <= 9 && !wouldDuplicate(board, r, c, digit)));
}

/** Check a replacement without treating the cell's previous value as a peer. */
export function wouldDuplicate(board: Board, r: number, c: number, num: number): boolean {
  return board.some((row, rr) => row.some((value, cc) =>
    (rr !== r || cc !== c) && value === num &&
    (rr === r || cc === c || (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3)))));
}

export function getEntryState(puzzle: Board, solution: Board, board: Board, r: number, c: number): "given" | "empty" | "correct" | "incorrect" {
  if (puzzle[r][c] !== 0) return "given";
  if (board[r][c] === 0) return "empty";
  return board[r][c] === solution[r][c] ? "correct" : "incorrect";
}

/** A wrong guess must not make a digit appear completed on the keypad. */
export function remainingDigits(board: Board | null, solution: Board | null): number[] {
  const remaining = Array<number>(10).fill(9);
  if (board && solution) board.forEach((row, r) => row.forEach((digit, c) => {
    if (digit !== 0 && digit === solution[r][c]) remaining[digit]--;
  }));
  return remaining;
}
