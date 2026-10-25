export const COLS = 5;
export const ROWS = 8;
export const MAX_LEVEL = 44;
export type Board = number[][];
export type Tool = 'hammer' | 'shuffle' | 'omni';
export type LabSave = { version: 1; board: Board; score: number; best: number; coins: number; next: number; discovered: number[]; claimed: number[]; tools: Record<Tool, number>; over: boolean };
export const SPECIES = ['Gene', 'Microbe', 'Sponge', 'Jellyfish', 'Fish', 'Mudskipper', 'Axolotl', 'Lizard', 'Dinosaur', 'Egg', 'Chick'];
export const ICONS = ['🧬', '🦠', '🧽', '🪼', '🐟', '🐸', '🦎', '🦎', '🦖', '🥚', '🐣'];
export function tileName(level: number) { return level === -1 ? 'Omni-gene' : `${['Bubble', 'Ice', 'Crystal', 'Golden'][Math.floor((level - 1) / 11)]} ${SPECIES[(level - 1) % 11]}`; }
export function emptyBoard(): Board { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
export function newLab(): LabSave { return { version: 1, board: emptyBoard(), score: 0, best: 0, coins: 0, next: 1, discovered: [1], claimed: [], tools: { hammer: 2, shuffle: 2, omni: 1 }, over: false }; }
export function randomLevel(highest: number, random = Math.random): number { return 1 + Math.floor(random() * Math.min(6, Math.max(3, Math.floor(highest / 4) + 2))); }
const copy = (board: Board) => board.map(row => [...row]);
export function landingRow(board: Board, column: number): number { if (column < 0 || column >= COLS) return -1; for (let r = ROWS - 1; r >= 0; r--) if (board[r][column] === 0) return r; return -1; }
export function settle(board: Board): void { for (let c = 0; c < COLS; c++) { const values = board.map(row => row[c]).filter(Boolean); for (let r = 0; r < ROWS; r++) board[r][c] = r < ROWS - values.length ? 0 : values[r - ROWS + values.length]; } }
export type MergeResult = { board: Board; points: number; levels: number[]; merges: number; biggest: number; row: number };
function resolve(board: Board, row: number, col: number, maxNeighbours = 3): MergeResult {
  let points = 0, merges = 0, biggest = 0;
  const levels: number[] = [];
  for (let step = 0; step < MAX_LEVEL; step++) {
    const level = board[row][col];
    // An omni-gene only takes the identity of the block directly above it.
    if (row + 1 < ROWS && board[row + 1][col] === -1 && level > 0) board[row + 1][col] = level;
    const adjacent = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].filter(([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === level).slice(0, maxNeighbours);
    if (level <= 0 || level >= MAX_LEVEL || !adjacent.length) break;
    adjacent.forEach(([r, c]) => { board[r][c] = 0; });
    const upgraded = Math.min(MAX_LEVEL, level + adjacent.length);
    board[row][col] = upgraded;
    levels.push(upgraded); merges++; biggest = Math.max(biggest, adjacent.length + 1); points += upgraded * 10 * adjacent.length;
    const below = board.slice(row + 1).filter(line => line[col] !== 0).length;
    settle(board); row = ROWS - below - 1;
  }
  return { board, points, levels, merges, biggest, row };
}
export function dropBlock(source: Board, column: number, level: number): MergeResult | null {
  const row = landingRow(source, column);
  if (row < 0 || !Number.isInteger(column) || (level !== -1 && (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL))) return null;
  const board = copy(source); board[row][column] = level;
  const result = resolve(board, row, column);
  if (level > 0) result.levels.unshift(level);
  return result;
}
export function rearrange(source: Board, row: number, col: number): MergeResult {
  const board = copy(source), cells: number[][] = [];
  const bottom = Math.max(2, Math.min(ROWS - 1, row + 1));
  const left = Math.max(0, Math.min(COLS - 3, col - 1));
  for (let r = bottom; r > bottom - 3; r--) for (let c = left; c < left + 3; c++) cells.push([r, c]);
  const values = cells.map(([r, c]) => board[r][c]).sort((a, b) => b - a);
  cells.forEach(([r, c], i) => { board[r][c] = values[i]; }); settle(board);
  const total: MergeResult = { board, points: 0, levels: [], merges: 0, biggest: 0, row: bottom };
  // Resolve pairs in the selected region after sorting and gravity.
  for (const [r, c] of cells) if (board[r][c] > 0) { const result = resolve(board, r, c, 1); total.points += result.points; total.levels.push(...result.levels); total.merges += result.merges; total.biggest = Math.max(total.biggest, result.biggest); }
  return total;
}
export function hammer(source: Board, row: number, col: number): Board { const board = copy(source); board[row][col] = 0; settle(board); return board; }
export const isOver = (board: Board) => board[0].some(Boolean);
export function readLabSave(input: unknown): LabSave | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as LabSave;
  const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  const levels = (a: unknown): a is number[] => Array.isArray(a) && a.length <= MAX_LEVEL && a.every(n => Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL) && new Set(a).size === a.length;
  if (s.version !== 1 || !Array.isArray(s.board) || s.board.length !== ROWS || s.board.some(row => !Array.isArray(row) || row.length !== COLS || row.some(n => !Number.isInteger(n) || n < -1 || n > MAX_LEVEL))) return null;
  if (![s.score, s.best, s.coins].every(count) || !Number.isInteger(s.next) || s.next < 1 || s.next > 6 || !levels(s.discovered) || !s.discovered.includes(1) || !levels(s.claimed) || s.claimed.some(n => !s.discovered.includes(n)) || !s.tools || !['hammer', 'shuffle', 'omni'].every(t => count(s.tools[t as Tool])) || typeof s.over !== 'boolean' || s.over !== isOver(s.board)) return null;
  // Only accept gravity-settled boards.
  for (let c = 0; c < COLS; c++) { let occupied = false; for (let r = 0; r < ROWS; r++) { if (s.board[r][c]) occupied = true; else if (occupied) return null; } }
  return s;
}
