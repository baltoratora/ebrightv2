import { ANSWERS, VALID } from "./words";

export type LetterStatus = "correct" | "present" | "absent";

export const WORD_LENGTH = 5;

const VALID_SET = new Set<string>([...VALID, ...ANSWERS]);

export function isValidWord(word: string): boolean {
  return VALID_SET.has(word.toLowerCase());
}

export function randomAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

/** N distinct random answers (for Quordle). */
export function randomAnswers(n: number): string[] {
  const set = new Set<string>();
  while (set.size < n) set.add(randomAnswer());
  return [...set];
}

/**
 * Score a guess against the target with the canonical two-pass algorithm:
 * mark exact matches first, then mark "present" only while unmatched copies of
 * that letter remain in the target (so duplicate letters score correctly).
 */
export function scoreGuess(guess: string, target: string): LetterStatus[] {
  const g = guess.toLowerCase().split("");
  const t = target.toLowerCase().split("");
  const result: LetterStatus[] = g.map(() => "absent");
  const remaining: Record<string, number> = {};

  for (let i = 0; i < g.length; i++) {
    if (g[i] === t[i]) result[i] = "correct";
    else remaining[t[i]] = (remaining[t[i]] ?? 0) + 1;
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    if ((remaining[g[i]] ?? 0) > 0) {
      result[i] = "present";
      remaining[g[i]]--;
    }
  }
  return result;
}

const RANK: Record<LetterStatus, number> = { absent: 1, present: 2, correct: 3 };

/** Pick the stronger of two statuses (for aggregating keyboard hints). */
export function bestStatus(
  a: LetterStatus | undefined,
  b: LetterStatus,
): LetterStatus {
  if (!a) return b;
  return RANK[b] > RANK[a] ? b : a;
}
