// Client helpers for the global leaderboard.

export type Unit = "score" | "time" | "guesses" | "moves";
export interface GameMeta {
  dir: "asc" | "desc"; // asc = lower is better
  unit: Unit;
}

export const GAME_META: Record<string, GameMeta> = {
  tetris: { dir: "desc", unit: "score" },
  pinball: { dir: "desc", unit: "score" },
  breakout: { dir: "desc", unit: "score" },
  sudoku: { dir: "asc", unit: "time" },
  minesweeper: { dir: "asc", unit: "time" },
  wordle: { dir: "asc", unit: "guesses" },
  quordle: { dir: "asc", unit: "guesses" },
  chess: { dir: "asc", unit: "moves" },
  checkers: { dir: "asc", unit: "moves" },
};

export interface Entry {
  name: string;
  value: number;
}

export function metaFor(gameKey: string): GameMeta {
  return GAME_META[gameKey.split(":")[0]] ?? { dir: "desc", unit: "score" };
}

export function fmtValue(gameKey: string, v: number): string {
  const m = metaFor(gameKey);
  if (m.unit === "time") {
    const s = Math.round(v);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  return String(v);
}

/** Would `value` place in the top 10 for this game? */
export function qualifies(scores: Entry[], value: number, dir: "asc" | "desc"): boolean {
  if (scores.length < 10) return true;
  const worst = scores[scores.length - 1].value;
  return dir === "asc" ? value < worst : value > worst;
}

export async function fetchTop(game: string): Promise<Entry[]> {
  try {
    const r = await fetch(`/api/scores?game=${encodeURIComponent(game)}`);
    if (!r.ok) return [];
    const body = (await r.json()) as { scores?: Entry[] };
    return body.scores ?? [];
  } catch {
    return [];
  }
}

export async function submitScore(
  game: string,
  name: string,
  value: number,
): Promise<Entry[]> {
  const r = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game, name, value }),
  });
  const body = (await r.json()) as { scores?: Entry[] };
  return body.scores ?? [];
}
