export const COLS = 5;
export const ROWS = 8;
export const MAX_LEVEL = 44;
export type Board = number[][];
export type Tool = 'hammer' | 'shuffle' | 'omni';
export type LabSave = { version: 1; board: Board; score: number; best: number; coins: number; next: number; upcoming: [number, number]; roundHighest: number; rescueWait: number; discovered: number[]; claimed: number[]; tools: Record<Tool, number>; over: boolean };
export const SPECIES = ['Gene', 'Microbe', 'Sponge', 'Jellyfish', 'Fish', 'Mudskipper', 'Axolotl', 'Lizard', 'Dinosaur', 'Egg', 'Chick'];
export const ICONS = ['🧬', '🦠', '🧽', '🪼', '🐟', '🐸', '🦎', '🦎', '🦖', '🥚', '🐣'];
export function tileName(level: number) { return level === -1 ? 'Omni-gene' : `${['Bubble', 'Ice', 'Crystal', 'Golden'][Math.floor((level - 1) / 11)]} ${SPECIES[(level - 1) % 11]}`; }
export function emptyBoard(): Board { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
export function newLab(random = Math.random): LabSave { return { version: 1, board: emptyBoard(), score: 0, best: 0, coins: 0, next: 1, upcoming: [randomLevel(1, random), randomLevel(1, random)], roundHighest: 1, rescueWait: 0, discovered: [1], claimed: [], tools: { hammer: 2, shuffle: 2, omni: 1 }, over: false }; }
export const RESCUE_ROLL_LIMIT = 4;
export const spawnCeiling = (highest: number) => Math.max(1, Math.min(MAX_LEVEL, Math.floor(highest)) - 2);
export const spawnFloor = (highest: number) => Math.max(1, spawnCeiling(highest) - 2);
function cleanupLevels(highest: number, board: Board): number[] {
  const ceiling = spawnCeiling(highest);
  return [...new Set(board.flat().filter(level => level > 0 && level <= ceiling && (level < spawnFloor(highest) || 2 * level + 5 - highest <= 0)))].sort((a, b) => a - b).slice(0, 1);
}
export function spawnOdds(highest: number, board: Board = emptyBoard()): { level: number; weight: number; probability: number }[] {
  const peak = Math.max(1, Math.min(MAX_LEVEL, Math.floor(highest)));
  const floor = spawnFloor(peak);
  const pool = Array.from({ length: spawnCeiling(peak) - floor + 1 }, (_, i) => ({ level: floor + i, weight: Math.max(0, Math.min(4, 2 * (floor + i) + 5 - peak)) })).filter(item => item.weight > 0);
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  const cleanup = cleanupLevels(peak, board);
  // Reserve a quarter of new rolls for the lowest retired level still on the board.
  // Serve one cleanup level at a time, keeping the total pool to four levels.
  const normalShare = cleanup.length ? .75 : 1;
  return [
    ...pool.map(item => ({ level: item.level, weight: item.weight / total * normalShare })),
    ...cleanup.map(level => ({ level, weight: .25 / cleanup.length })),
  ].sort((a, b) => a.level - b.level).map(item => ({ ...item, probability: item.weight }));
}
export function randomLevel(highest: number, random = Math.random, board: Board = emptyBoard()): number {
  const pool = spawnOdds(highest, board);
  let roll = random();
  for (const item of pool) { roll -= item.weight; if (roll < 0) return item.level; }
  return pool[pool.length - 1].level;
}
export function advanceQueue(save: LabSave, highest: number, consume: boolean, random = Math.random, board: Board = save.board): Pick<LabSave, 'next' | 'upcoming' | 'rescueWait'> {
  const allowed = new Set(spawnOdds(highest, board).map(item => item.level));
  const queue = (consume ? [...save.upcoming] : [save.next, ...save.upcoming])
    .map(level => allowed.has(level) ? level : randomLevel(highest, random, board));
  const stranded = cleanupLevels(highest, board)[0];
  let rescueWait = !stranded || queue.includes(stranded) ? 0 : save.rescueWait;
  if (consume) {
    let drawn: number;
    if (stranded && !queue.includes(stranded) && rescueWait + 1 >= RESCUE_ROLL_LIMIT) drawn = stranded;
    else drawn = randomLevel(highest, random, board);
    queue.push(drawn);
    rescueWait = !stranded || queue.includes(stranded) ? 0 : rescueWait + 1;
  }
  return { next: queue[0], upcoming: [queue[1], queue[2]], rescueWait };
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
  const applyGravity = (): Tile[] => {
    const moved: Tile[] = [];
    for (let x = 0; x < COLS; x++) {
      let destination = ROWS - 1;
      for (let y = ROWS - 1; y >= 0; y--) {
        const tile = tiles[y][x];
        if (!tile) continue;
        if (destination !== y) {
          tiles[destination][x] = tile; tiles[y][x] = null;
          moved.push(tile);
        }
        destination--;
      }
    }
    return moved;
  };
  while (true) {
    if (!pending.length) {
      const moved = applyGravity();
      if (!moved.length) break;
      moved.forEach(enqueue);
    }
    const target = pending.shift()!;
    let r = -1, c = -1;
    for (let y = 0; y < ROWS; y++) {
      const x = tiles[y].indexOf(target);
      if (x >= 0) { r = y; c = x; break; }
    }
    if (r < 0 || target.level <= 0 || target.level >= MAX_LEVEL) continue;
    // Only a normal block directly above an omni can activate it.
    const below = r + 1 < ROWS ? tiles[r + 1][c] : null;
    const adjacent = below?.level === -1 ? [[r + 1, c]] : [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([y, x]) => y >= 0 && y < ROWS && x >= 0 && x < COLS && tiles[y][x]?.level === target.level)
      .slice(0, maxNeighbours);
    if (!adjacent.length) continue;
    adjacent.forEach(([y, x]) => { tiles[y][x] = null; });
    target.level = Math.min(MAX_LEVEL, target.level + adjacent.length);
    levels.push(target.level); merges++; biggest = Math.max(biggest, adjacent.length + 1);
    points += target.level * 10 * adjacent.length;
    // Resolve the upgraded target first, then every other falling specimen.
    // Removed tiles can remain queued safely: their identities no longer exist.
    const moved = applyGravity().filter(tile => tile !== target);
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
export function rearrangeCells(row: number, col: number): [number, number][] {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= ROWS || col < 0 || col >= COLS) return [];
  const bottom = Math.max(2, Math.min(ROWS - 1, row + 1));
  const left = Math.max(0, Math.min(COLS - 3, col - 1));
  const cells: [number, number][] = [];
  for (let r = bottom; r > bottom - 3; r--) for (let c = left; c < left + 3; c++) cells.push([r, c]);
  return cells;
}
export function rearrange(source: Board, row: number, col: number): MergeResult | null {
  const cells = rearrangeCells(row, col);
  if (!cells.some(([r, c]) => source[r][c] !== 0)) return null;
  const board = copy(source);
  // Omni is the lowest occupied rank; empty slots must sort after it.
  const rank = (level: number) => level === -1 ? .5 : level;
  const values = cells.map(([r, c]) => board[r][c]).sort((a, b) => rank(b) - rank(a));
  cells.forEach(([r, c], i) => { board[r][c] = values[i]; });
  // Resolve sorted pairs before gravity can separate a newly formed match.
  const result = resolve(board, cells[0][0], cells[0][1], 1);
  if (result.points === 0 && result.board.every((line, r) => line.every((level, c) => level === source[r][c]))) return null;
  return result;
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
  if (s.rescueWait !== undefined && (!count(s.rescueWait) || s.rescueWait >= RESCUE_ROLL_LIMIT)) return null;
  const migrated = { ...s, roundHighest, rescueWait: s.rescueWait ?? 0, upcoming: s.upcoming ?? [randomLevel(roundHighest, Math.random, s.board), randomLevel(roundHighest, Math.random, s.board)] };
  // Rebalance old previews that exceed the new ceiling, while preserving every
  // eligible advertised block and the persisted cleanup wait counter.
  return { ...migrated, ...advanceQueue(migrated, roundHighest, false) };
}
