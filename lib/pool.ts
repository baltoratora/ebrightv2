// Pure 8-ball pool rules.

export type Pool8Result = "won" | "lost";

/**
 * Outcome when the 8-ball is pocketed. Decide this once the table has SETTLED,
 * not the instant the 8 drops, so a cue scratch later in the same stroke still
 * counts. You win only by sinking the 8 after clearing all your solids and
 * without scratching on that stroke; potting the 8 early, or scratching on it,
 * is a loss.
 */
export function pool8Result(solidsLeft: number, scratched: boolean): Pool8Result {
  return solidsLeft === 0 && !scratched ? "won" : "lost";
}
