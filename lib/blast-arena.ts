// Original grid-arena rules. Pure, seeded simulation; no DOM, timers or assets.
export const COLS = 13;
export const ROWS = 11;
export const STEP_MS = 80;
export const FUSE_MS = 2400;
export const FIRE_MS = 560;
export const ROUND_MS = 150_000;
export type Direction = "up" | "down" | "left" | "right";
export type Upgrade = "range" | "capacity" | "speed";
export type Tile = "floor" | "wall" | "crate";
export type Difficulty = "easy" | "normal" | "hard";
export type Actor = { id: number; x: number; y: number; alive: boolean; range: number; capacity: number; moveAt: number; bombAt: number; speed: number; facing: Direction };
export type Bomb = { id: number; owner: number; x: number; y: number; range: number; at: number };
export type Flame = { x: number; y: number; until: number };
export type Arena = { tiles: Tile[][]; items: Record<string, Upgrade>; hidden: Record<string, Upgrade>; actors: Actor[]; bombs: Bomb[]; flames: Flame[]; time: number; seed: number; nextBomb: number; difficulty: Difficulty; status: "playing" | "won" | "lost" | "draw"; crates: number };
export type Input = { direction?: Direction; bomb?: boolean };
export const VECTORS: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRS = Object.keys(VECTORS) as Direction[];
export const key = (x: number, y: number) => `${x},${y}`;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function random(s: Arena): number { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }

export function newArena(seed: number, difficulty: Difficulty = "normal"): Arena {
  const s: Arena = { tiles: [], items: {}, hidden: {}, actors: [], bombs: [], flames: [], time: 0, seed: seed >>> 0, nextBomb: 0, difficulty, status: "playing", crates: 0 };
  const spawns = [[1, 1], [COLS - 2, ROWS - 2], [COLS - 2, 1], [1, ROWS - 2]];
  s.tiles = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x): Tile => {
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || (x % 2 === 0 && y % 2 === 0)) return "wall";
    if (spawns.some(([sx, sy]) => Math.abs(x - sx) + Math.abs(y - sy) <= 3)) return "floor";
    if (random(s) < .64) { if (random(s) < .38) s.hidden[key(x, y)] = ["range", "capacity", "speed"][Math.floor(random(s) * 3)] as Upgrade; return "crate"; }
    return "floor";
  }));
  s.actors = spawns.map(([x, y], id) => ({ id, x, y, alive: true, range: 2, capacity: 1, moveAt: 0, bombAt: 0, speed: 0, facing: "down" }));
  return s;
}
function clone(s: Arena): Arena { return { ...s, tiles: s.tiles.map((r) => [...r]), items: { ...s.items }, hidden: { ...s.hidden }, actors: s.actors.map((p) => ({ ...p })), bombs: s.bombs.map((b) => ({ ...b })), flames: s.flames.map((f) => ({ ...f })) }; }

/** Rays stop at steel and at the first crate. The crate itself is hit. */
export function blastCells(tiles: Tile[][], bomb: Pick<Bomb, "x" | "y" | "range">): { x: number; y: number }[] {
  const cells = [{ x: bomb.x, y: bomb.y }];
  for (const [dx, dy] of Object.values(VECTORS)) for (let i = 1; i <= bomb.range; i++) {
    const x = bomb.x + dx * i; const y = bomb.y + dy * i;
    const tile = tiles[y]?.[x];
    if (!tile || tile === "wall") break;
    cells.push({ x, y });
    if (tile === "crate") break;
  }
  return cells;
}
function moveDelay(s: Arena, actor: Actor): number {
  const base = actor.id === 0 ? 160 : s.difficulty === "easy" ? 320 : s.difficulty === "hard" ? 160 : 240;
  return Math.max(80, base - actor.speed * 40);
}
function passable(s: Arena, x: number, y: number): boolean { return s.tiles[y]?.[x] === "floor" && !s.bombs.some((b) => b.x === x && b.y === y); }
function move(s: Arena, actor: Actor, direction: Direction) {
  if (actor.moveAt > s.time) return;
  actor.facing = direction;
  const [dx, dy] = VECTORS[direction]; const x = actor.x + dx; const y = actor.y + dy;
  if (!passable(s, x, y) || s.actors.some((p) => p.id !== actor.id && p.alive && p.x === x && p.y === y)) return;
  actor.x = x; actor.y = y; actor.moveAt = s.time + moveDelay(s, actor);
  const item = s.items[key(x, y)];
  if (item) { if (item === "range") actor.range = Math.min(5, actor.range + 1); if (item === "capacity") actor.capacity = Math.min(4, actor.capacity + 1); if (item === "speed") actor.speed = Math.min(2, actor.speed + 1); delete s.items[key(x, y)]; }
}
function placeBomb(s: Arena, actor: Actor): boolean {
  if (actor.bombAt > s.time || s.bombs.some((b) => b.x === actor.x && b.y === actor.y) || s.bombs.filter((b) => b.owner === actor.id).length >= actor.capacity) return false;
  s.bombs.push({ id: s.nextBomb++, owner: actor.id, x: actor.x, y: actor.y, range: actor.range, at: s.time + FUSE_MS });
  actor.bombAt = s.time + 400;
  return true;
}

/** Earliest arrival of fire, including fuse-shortening chain reactions. */
export function dangerTimes(s: Arena): Map<string, number> {
  const result = new Map(s.flames.map((f) => [key(f.x, f.y), s.time]));
  const times = new Map(s.bombs.map((b) => [b.id, b.at]));
  for (let pass = 0; pass <= s.bombs.length; pass++) {
    let changed = false;
    for (const bomb of s.bombs) {
      const at = times.get(bomb.id)!;
      for (const cell of blastCells(s.tiles, bomb)) {
        const k = key(cell.x, cell.y); result.set(k, Math.min(result.get(k) ?? Infinity, at));
        for (const other of s.bombs) if (other.x === cell.x && other.y === cell.y && times.get(other.id)! > at) { times.set(other.id, at); changed = true; }
      }
    }
    if (!changed) break;
  }
  return result;
}
/** Find a route out of every known blast ray before its fuse expires. */
function escape(s: Arena, actor: Actor): Direction | null | "safe" {
  const danger = dangerTimes(s);
  const queue: { x: number; y: number; first: Direction | null; steps: number }[] = [{ x: actor.x, y: actor.y, first: null, steps: 0 }];
  const seen = new Set([key(actor.x, actor.y)]);
  while (queue.length) {
    const node = queue.shift()!;
    if (!danger.has(key(node.x, node.y))) return node.first ?? "safe";
    if (node.steps >= 12) continue;
    for (const direction of DIRS) {
      const [dx, dy] = VECTORS[direction]; const x = node.x + dx; const y = node.y + dy; const k = key(x, y);
      if (seen.has(k) || !passable(s, x, y)) continue;
      if (s.flames.some((f) => f.x === x && f.y === y) || (danger.get(k) ?? Infinity) <= s.time + (node.steps + 1) * moveDelay(s, actor) + 160) continue;
      seen.add(k); queue.push({ x, y, first: node.first ?? direction, steps: node.steps + 1 });
    }
  }
  return null;
}
function bot(s: Arena, actor: Actor) {
  if (actor.moveAt > s.time) return;
  const danger = dangerTimes(s);
  if (danger.has(key(actor.x, actor.y))) { const dir = escape(s, actor); if (dir && dir !== "safe") move(s, actor, dir); return; }
  const enemies = s.actors.filter((p) => p.id !== actor.id && p.alive);
  const rays = blastCells(s.tiles, actor);
  const opportunity = rays.some((c) => s.tiles[c.y][c.x] === "crate" || enemies.some((p) => p.x === c.x && p.y === c.y));
  const chance = s.difficulty === "easy" ? .32 : s.difficulty === "hard" ? .85 : .6;
  if (opportunity && random(s) < chance) {
    const before = s.bombs.length;
    if (placeBomb(s, actor)) {
      const dir = escape(s, actor);
      if (dir && dir !== "safe") { move(s, actor, dir); return; }
      s.bombs.splice(before); // never deliberately place a bomb with no known escape
    }
  }
  const target = enemies.sort((a, b) => distance(actor, a) - distance(actor, b))[0];
  const choices = DIRS.map((direction) => { const [dx, dy] = VECTORS[direction]; const x = actor.x + dx; const y = actor.y + dy; return { direction, x, y, rank: (target ? distance({ x, y }, target) : 0) + random(s) * 5 }; })
    .filter((c) => passable(s, c.x, c.y) && !danger.has(key(c.x, c.y))).sort((a, b) => a.rank - b.rank);
  if (choices[0]) move(s, actor, choices[0].direction);
}
function damage(s: Arena) {
  for (const p of s.actors) if (s.flames.some((f) => f.x === p.x && f.y === p.y)) p.alive = false;
}
function explode(s: Arena) {
  const tilesAtStart = s.tiles.map((r) => [...r]);
  const queue = s.bombs.filter((b) => b.at <= s.time || s.flames.some((f) => f.x === b.x && f.y === b.y));
  const exploded = new Set<number>();
  while (queue.length) {
    const bomb = queue.shift()!;
    if (exploded.has(bomb.id)) continue;
    exploded.add(bomb.id);
    for (const cell of blastCells(tilesAtStart, bomb)) {
      const k = key(cell.x, cell.y);
      s.flames.push({ ...cell, until: s.time + FIRE_MS });
      if (s.tiles[cell.y][cell.x] === "crate") {
        s.tiles[cell.y][cell.x] = "floor"; s.crates++;
        if (s.hidden[k]) s.items[k] = s.hidden[k];
        delete s.hidden[k];
      } else if (tilesAtStart[cell.y][cell.x] !== "crate") delete s.items[k];
      for (const next of s.bombs) if (next.x === cell.x && next.y === cell.y && !exploded.has(next.id)) queue.push(next);
    }
  }
  s.bombs = s.bombs.filter((b) => !exploded.has(b.id));
  damage(s);
}

/** Exactly one fixed step. Pausing/visibility never advances this function. */
export function stepArena(state: Arena, input: Input = {}): Arena {
  if (state.status !== "playing") return state;
  const s = clone(state); s.time += STEP_MS;
  s.flames = s.flames.filter((f) => f.until > s.time);
  damage(s); // players cannot step out of active fire on the same tick
  explode(s); // bombs due now resolve before movement
  const human = s.actors[0];
  if (human.alive) { if (input.bomb) placeBomb(s, human); if (input.direction) move(s, human, input.direction); }
  for (const actor of s.actors.slice(1)) if (actor.alive) bot(s, actor);
  damage(s);
  const alive = s.actors.filter((p) => p.alive);
  if (!human.alive) s.status = alive.length === 0 ? "draw" : "lost";
  else if (alive.length === 1) s.status = "won";
  else if (s.time >= ROUND_MS) s.status = "draw";
  return s;
}
