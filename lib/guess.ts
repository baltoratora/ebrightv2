// Pure engine for the Guess game. No React, no DOM, no localStorage.

export type Direction = "up" | "down" | "hit"; // up = answer earlier (▲), down = later (▼)
export type Bucket = "green" | "yellow" | "red";

export type Category = {
  id: string; // stable key, e.g. "countries"
  label: string; // display name, e.g. "Countries"
  emoji: string; // e.g. "🌍"
  note: string; // short source/rule note
  items: string[]; // canonical display names (unsorted in source; engine sorts)
  aliases?: Record<string, string>; // normalized alias -> canonical item
};

export type GuessRow = {
  item: string; // canonical guessed item
  distance: number; // |index(guess) - index(answer)| in sorted list
  dir: Direction;
  bucket: Bucket;
};

/**
 * Canonical normalisation used for all matching and dedup comparisons:
 * lowercase -> strip accents (NFD) -> collapse every run of non-alphanumerics
 * to a single space -> trim.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const GREEN_PCT = 0.05;
const YELLOW_PCT = 0.15;

/** Canonical items sorted A–Z by displayed name (deterministic). */
export function sortedItems(cat: Category): string[] {
  return [...cat.items].sort((a, b) => a.localeCompare(b, "en"));
}

/** Colour bucket from index-distance and list size N (hit is handled upstream). */
export function bucket(distance: number, n: number): Bucket {
  if (distance <= Math.ceil(GREEN_PCT * n)) return "green";
  if (distance <= Math.ceil(YELLOW_PCT * n)) return "yellow";
  return "red";
}

/** Resolve raw input to a canonical item, or null. Exact canonical, then alias. */
export function resolveGuess(raw: string, cat: Category): string | null {
  const q = normalize(raw);
  if (!q) return null;
  for (const item of cat.items) {
    if (normalize(item) === q) return item;
  }
  return cat.aliases?.[q] ?? null;
}

/** Autocomplete suggestions: prefix matches first, then substring; capped at `limit`.
 *  Substring matching requires q.length >= 3 to avoid noisy short-token hits. */
export function suggest(raw: string, cat: Category, limit = 8): string[] {
  const q = normalize(raw);
  if (!q) return [];
  const prefix: string[] = [];
  const substr: string[] = [];
  for (const item of sortedItems(cat)) {
    const n = normalize(item);
    if (n.startsWith(q)) prefix.push(item);
    else if (q.length >= 3 && n.includes(q)) substr.push(item);
  }
  return [...prefix, ...substr].slice(0, limit);
}

/** Deterministic 32-bit hash of an integer seed (for seeded answer selection). */
function hashSeed(seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return Math.abs(h);
}

/**
 * Pick one answer. Unlimited mode passes no seed (uses Math.random) and may pass
 * `exclude` to avoid an immediate repeat. Daily (future) passes a date-derived seed.
 * Pure given its arguments (for a fixed seed).
 */
export function pickAnswer(
  items: string[],
  opts: { seed?: number; exclude?: string } = {}
): string {
  const { seed, exclude } = opts;
  const pool = exclude ? items.filter((i) => i !== exclude) : items;
  if (pool.length === 0) return items[0]; // only item was excluded
  const idx =
    seed === undefined
      ? Math.floor(Math.random() * pool.length)
      : hashSeed(seed) % pool.length;
  return pool[idx];
}

/** Evaluate one guess against the answer within the sorted list. */
export function evaluateGuess(
  guessItem: string,
  answer: string,
  sorted: string[]
): GuessRow {
  const gi = sorted.indexOf(guessItem);
  const ai = sorted.indexOf(answer);
  const distance = Math.abs(ai - gi);
  const dir: Direction = ai === gi ? "hit" : ai > gi ? "down" : "up";
  return { item: guessItem, distance, dir, bucket: bucket(distance, sorted.length) };
}
