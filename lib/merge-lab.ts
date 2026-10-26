export const COLS = 5;
export const ROWS = 8;
export const MAX_LEVEL = 44;
export type Board = number[][];
export type Tool = 'hammer' | 'shuffle' | 'omni';
export type LabSave = { version: 1; board: Board; score: number; best: number; coins: number; next: number; upcoming: [number, number]; roundHighest: number; discovered: number[]; claimed: number[]; tools: Record<Tool, number>; over: boolean };
export const SPECIES = ['Gene', 'Microbe', 'Sponge', 'Jellyfish', 'Fish', 'Mudskipper', 'Axolotl', 'Lizard', 'Dinosaur', 'Egg', 'Chick'];
export const ICONS = ['🧬', '🦠', '🧽', '🪼', '🐟', '🐸', '🦎', '🦎', '🦖', '🥚', '🐣'];
export function tileName(level: number) { return level === -1 ? 'Omni-gene' : `${['Bubble', 'Ice', 'Crystal', 'Golden'][Math.floor((level - 1) / 11)]} ${SPECIES[(level - 1) % 11]}`; }
export function emptyBoard(): Board { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
export function newLab(random = Math.random): LabSave { return { version: 1, board: emptyBoard(), score: 0, best: 0, coins: 0, next: 1, upcoming: [randomLevel(1, random), randomLevel(1, random)], roundHighest: 1, discovered: [1], claimed: [], tools: { hammer: 2, shuffle: 2, omni: 1 }, over: false }; }
export function spawnOdds(highest: number): { level: number; weight: number; probability: number }[] {
  const peak = Math.max(1, Math.min(MAX_LEVEL, Math.floor(highest)));
  const ceiling = Math.max(3, peak);
  const pool = Array.from({ length: ceiling }, (_, i) => ({ level: i + 1, weight: Math.max(0, Math.min(4, 2 * (i + 1) + 5 - peak)) }));
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  return pool.filter(item => item.weight > 0).map(item => ({ ...item, probability: item.weight / total }));
}
export function randomLevel(highest: number, random = Math.random): number {
  const pool = spawnOdds(highest);
  let roll = random() * pool.reduce((sum, item) => sum + item.weight, 0);
  for (const item of pool) { roll -= item.weight; if (roll < 0) return item.level; }
  return pool[pool.length - 1].level;
}
export function advanceQueue(save: LabSave, highest: number, consume: boolean, random = Math.random): Pick<LabSave, 'next' | 'upcoming'> {
  const queue = consume ? [save.upcoming[0], save.upcoming[1], randomLevel(highest, random)] : [save.next, ...save.upcoming];
  const allowed = new Set(spawnOdds(highest).map(item => item.level));
  // Retire zero-chance queued levels immediately when a new milestone is hit.
  // Keep every other preview in its promised order; tools never consume it.
  const eligible = queue.map(level => allowed.has(level) ? level : randomLevel(highest, random));
  return { next: eligible[0], upcoming: [eligible[1], eligible[2]] };
}
const copy = (board: Board) => board.map(row => [...row]);
export function landingRow(board: Board, column: number): number { if (column < 0 || column >= COLS) return -1; for (let r = ROWS - 1; r >= 0; r--) if (board[r][column] === 0) return r; return -1; }
export function settle(board: Board): void { for (let c = 0; c < COLS; c++) { const values = board.map(row => row[c]).filter(Boolean); for (let r = 0; r < ROWS; r++) board[r][c] = r < ROWS - values.length ? 0 : values[r - ROWS + values.length]; } }
export type MergeResult = { board: Board; points: number; levels: number[]; merges: number; biggest: number; row: number };
function resolve(board: Board, row: number, col: number, maxNeighbours = 3): MergeResult {
  type Tile = { level: number };
  // Keep object identities through gravity: coordinates alone become stale when
  // a different column falls or a queued specimen is consumed by another merge.
  const tiles = board.map(line => line.map(level => level ? { level } : null));
  const original = tiles[row][col];
  const pending: Tile[] = [];
  const enqueue = (tile: Tile | null) => { if (tile && !pending.includes(tile)) pending.push(tile); };
  enqueue(original);
  for (let r = ROWS - 1; r >= 0; r--) for (let c = 0; c < COLS; c++) enqueue(tiles[r][c]);
  let points = 0, merges = 0, biggest = 0;
  const levels: number[] = [];
  while (pending.length) {
    const target = pending.shift()!;
    let r = -1, c = -1;
    for (let y = 0; y < ROWS; y++) {
      const x = tiles[y].indexOf(target);
      if (x >= 0) { r = y; c = x; break; }
    }
    if (r < 0 || target.level <= 0 || target.level >= MAX_LEVEL) continue;
    // Only a normal block directly above an omni can activate it.
    const below = r + 1 < ROWS ? tiles[r + 1][c] : null;
    if (below?.level === -1) below.level = target.level;
    const adjacent = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS && tiles[y][x]?.level === target.level)
      .slice(0, maxNeighbours);
    if (!adjacent.length) continue;
    adjacent.forEach(([y, x]) => { tiles[y][x] = null; });
    target.level = Math.min(MAX_LEVEL, target.level + adjacent.length);
    levels.push(target.level); merges++; biggest = Math.max(biggest, adjacent.length + 1);
    points += target.level * 10 * adjacent.length;
    // Resolve the upgraded target first, then every other falling specimen.
    // Removed tiles can remain queued safely: their identities no longer exist.
    const moved: Tile[] = [];
    for (let x = 0; x < COLS; x++) {
      let destination = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        const tile = tiles[y][x];
        if (!tile) continue;
        if (destination !== y) {
          tiles[destination][x] = tile; tiles[y][x] = null;
          if (tile !== target) moved.push(tile);
        }
        destination--;
      }
    }
    const priority = [target, ...moved];
    const remaining = pending.filter(tile => !priority.includes(tile));
    pending.splice(0, pending.length, ...priority, ...remaining);
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    board[r][c] = tiles[r][c]?.level ?? 0;
    if (original && tiles[r][c] === original) row = r;
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
  return resolve(board, bottom, left, 1);
}
export function hammer(source: Board, row: number, col: number): MergeResult {
  const board = copy(source); board[row][col] = 0; settle(board);
  return resolve(board, ROWS - 1, col);
}
export const isOver = (board: Board) => board[0].some(Boolean);
export function readLabSave(input: unknown): LabSave | null {
  if (!input || typeof input !== 'object') return null;
  const s = input as LabSave;
  const count = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  const levels = (a: unknown): a is number[] => Array.isArray(a) && a.length <= MAX_LEVEL && a.every(n => Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL) && new Set(a).size === a.length;
  if (s.version !== 1 || !Array.isArray(s.board) || s.board.length !== ROWS || s.board.some(row => !Array.isArray(row) || row.length !== COLS || row.some(n => !Number.isInteger(n) || n < -1 || n > MAX_LEVEL))) return null;
  if (![s.score, s.best, s.coins].every(count) || !Number.isInteger(s.next) || s.next < 1 || s.next > MAX_LEVEL || !levels(s.discovered) || !s.discovered.includes(1) || !levels(s.claimed) || s.claimed.some(n => !s.discovered.includes(n)) || !s.tools || !['hammer', 'shuffle', 'omni'].every(t => count(s.tools[t as Tool])) || typeof s.over !== 'boolean' || s.over !== isOver(s.board)) return null;
  // Only accept gravity-settled boards.
  for (let c = 0; c < COLS; c++) { let occupied = false; for (let r = 0; r < ROWS; r++) { if (s.board[r][c]) occupied = true; else if (occupied) return null; } }
  const boardHighest = Math.max(1, ...s.board.flat());
  const roundHighest = s.roundHighest === undefined ? boardHighest : s.roundHighest;
  if (!Number.isInteger(roundHighest) || roundHighest < boardHighest || roundHighest > MAX_LEVEL || s.next > Math.max(6, roundHighest)) return null;
  if (s.upcoming !== undefined && (!Array.isArray(s.upcoming) || s.upcoming.length !== 2 || s.upcoming.some(n => !Number.isInteger(n) || n < 1 || n > Math.max(6, roundHighest)))) return null;
  return { ...s, roundHighest, upcoming: s.upcoming ?? [randomLevel(roundHighest), randomLevel(roundHighest)] };
}
