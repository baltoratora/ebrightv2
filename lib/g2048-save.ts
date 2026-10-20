import type { Grid } from "./g2048";

export type Saved2048 = { grid: Grid; score: number; best: number; over: boolean; won: boolean; winSeen: boolean };

/** Ignore corrupt saves instead of rendering an invalid board or crashing on swipe. */
export function read2048Save(raw: unknown): Saved2048 | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Saved2048;
  if (!Array.isArray(s.grid) || s.grid.length !== 4 || !s.grid.every((row) => Array.isArray(row) && row.length === 4 && row.every((v) =>
    Number.isSafeInteger(v) && (v === 0 || (v >= 2 && Number.isInteger(Math.log2(v))))))) return null;
  if (![s.score, s.best].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    ![s.over, s.won, s.winSeen].every((v) => typeof v === "boolean")) return null;
  return { grid: s.grid, score: s.score, best: s.best, over: s.over, won: s.won, winSeen: s.winSeen };
}
