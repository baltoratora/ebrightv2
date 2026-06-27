// Pure logic for Simon Says.

export type Pad = 0 | 1 | 2 | 3;

function defaultRng() {
  return Math.random();
}

/**
 * Returns a new sequence with one random pad (0–3) appended.
 */
export function nextSequence(seq: Pad[], rng: () => number = defaultRng): Pad[] {
  const pad = Math.floor(rng() * 4) as Pad;
  return [...seq, pad];
}

/**
 * Checks the player's input against the expected sequence.
 *
 * - "ok"       : input is a correct prefix and shorter than seq
 * - "complete" : input matches the full sequence exactly
 * - "wrong"    : mismatch at any position
 */
export function checkInput(seq: Pad[], input: Pad[]): "ok" | "wrong" | "complete" {
  if (input.length === 0) return "ok";
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== seq[i]) return "wrong";
  }
  if (input.length === seq.length) return "complete";
  return "ok";
}
