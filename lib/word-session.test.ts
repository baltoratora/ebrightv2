import { describe, it, expect } from "vitest";
import { readWordSession } from "./word-session";
import { ANSWERS } from "./words";

describe("word session recovery", () => {
  const save = { targets: ANSWERS.slice(0, 4), guesses: [ANSWERS[6]], current: "cra" };
  it("recovers Quordle and rejects incompatible board counts", () => {
    expect(readWordSession(save, 4, 9)).toEqual(save);
    expect(readWordSession(save, 1, 6)).toBeNull();
  });
  it("rejects bad words, repeated answers/guesses, and oversized drafts", () => {
    expect(readWordSession({ ...save, targets: Array(4).fill(ANSWERS[0]) }, 4, 9)).toBeNull();
    expect(readWordSession({ ...save, guesses: ["zzzzz"] }, 4, 9)).toBeNull();
    expect(readWordSession({ ...save, guesses: [ANSWERS[6], ANSWERS[6]] }, 4, 9)).toBeNull();
    expect(readWordSession({ ...save, current: "sixsix" }, 4, 9)).toBeNull();
    expect(readWordSession(null, 4, 9)).toBeNull();
  });
});
