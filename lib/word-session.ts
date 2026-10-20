import { isValidWord } from "./wordle";
import { ANSWERS } from "./words";

export type WordSession = { targets: string[]; guesses: string[]; current: string };
const answers = new Set(ANSWERS);

/** Storage is untrusted: discard malformed or incompatible sessions. */
export function readWordSession(raw: unknown, boards: number, limit: number): WordSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (!Array.isArray(s.targets) || s.targets.length !== boards || new Set(s.targets).size !== boards ||
    !s.targets.every((t) => typeof t === "string" && answers.has(t))) return null;
  if (!Array.isArray(s.guesses) || s.guesses.length > limit || new Set(s.guesses).size !== s.guesses.length ||
    !s.guesses.every((g) => typeof g === "string" && /^[a-z]{5}$/.test(g) && isValidWord(g))) return null;
  if (typeof s.current !== "string" || !/^[a-z]{0,5}$/.test(s.current)) return null;
  return { targets: s.targets as string[], guesses: s.guesses as string[], current: s.current };
}
