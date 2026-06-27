import { describe, it, expect } from "vitest";
import { nextSequence, checkInput, type Pad } from "./simon";

describe("nextSequence", () => {
  it("extends the sequence by one element", () => {
    const rng = () => 0.5; // Math.floor(0.5 * 4) === 2
    const result = nextSequence([0, 1] as Pad[], rng);
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(2);
  });

  it("starts from an empty sequence", () => {
    const rng = () => 0.75; // Math.floor(0.75 * 4) === 3
    const result = nextSequence([], rng);
    expect(result).toEqual([3]);
  });

  it("does not mutate the original sequence", () => {
    const orig: Pad[] = [0, 1, 2];
    const rng = () => 0;
    nextSequence(orig, rng);
    expect(orig).toHaveLength(3);
  });

  it("appends the correct pad index (floor of rng*4)", () => {
    // rng returns 0.99 → floor(0.99 * 4) = 3
    expect(nextSequence([], () => 0.99)).toEqual([3]);
    // rng returns 0.0 → floor(0.0 * 4) = 0
    expect(nextSequence([], () => 0.0)).toEqual([0]);
  });
});

describe("checkInput", () => {
  it("correct prefix shorter than seq → ok", () => {
    expect(checkInput([0, 1, 2] as Pad[], [0] as Pad[])).toBe("ok");
  });

  it("correct prefix of length 2 for seq length 3 → ok", () => {
    expect(checkInput([0, 1, 2] as Pad[], [0, 1] as Pad[])).toBe("ok");
  });

  it("full correct match → complete", () => {
    expect(checkInput([0, 1, 2] as Pad[], [0, 1, 2] as Pad[])).toBe("complete");
  });

  it("single-element sequence fully matched → complete", () => {
    expect(checkInput([3] as Pad[], [3] as Pad[])).toBe("complete");
  });

  it("mismatch at first element → wrong", () => {
    expect(checkInput([0, 1, 2] as Pad[], [2] as Pad[])).toBe("wrong");
  });

  it("mismatch at second element → wrong", () => {
    expect(checkInput([0, 1, 2] as Pad[], [0, 2] as Pad[])).toBe("wrong");
  });

  it("empty input → ok", () => {
    expect(checkInput([0, 1] as Pad[], [] as Pad[])).toBe("ok");
  });

  it("empty input against empty seq → ok", () => {
    expect(checkInput([] as Pad[], [] as Pad[])).toBe("ok");
  });
});
