// Seedable, counter-based PRNG. The value at position n depends only on
// (seed, n), so persisting {seed, cursor} reproduces the stream exactly —
// required for bit-exact save/resume (spec §9.1).

export interface Rng {
  nextFloat(): number;
  readonly cursor: number;
  readonly seed: number;
}

function mulberry(seed: number, n: number): number {
  let t = (seed + n * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function makeRng(seed: number, cursor = 0): Rng {
  let c = cursor;
  return {
    seed,
    get cursor() {
      return c;
    },
    nextFloat() {
      return mulberry(seed, c++);
    },
  };
}
