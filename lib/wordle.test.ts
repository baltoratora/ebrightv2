import { describe, it, expect } from "vitest";
import { scoreGuess, isValidWord, randomAnswers, bestStatus } from "./wordle";

describe("scoreGuess", () => {
  it("marks an exact match all correct", () => {
    expect(scoreGuess("crane", "crane")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ]);
  });

  it("marks present vs absent correctly", () => {
    // target robot, guess otter
    expect(scoreGuess("otter", "robot")).toEqual([
      "present", "present", "absent", "absent", "present",
    ]);
  });

  it("handles duplicate letters in the guess (two-pass)", () => {
    // target abide, guess eerie -> only the final e is correct; earlier e's absent
    expect(scoreGuess("eerie", "abide")).toEqual([
      "absent", "absent", "absent", "present", "correct",
    ]);
  });
});

describe("isValidWord", () => {
  it("accepts common words and rejects junk", () => {
    expect(isValidWord("crane")).toBe(true);
    expect(isValidWord("CRANE")).toBe(true);
    expect(isValidWord("zzzzz")).toBe(false);
    expect(isValidWord("abc")).toBe(false);
  });
});

describe("randomAnswers", () => {
  it("returns N distinct valid 5-letter answers", () => {
    const a = randomAnswers(4);
    expect(a).toHaveLength(4);
    expect(new Set(a).size).toBe(4);
    for (const w of a) {
      expect(w).toMatch(/^[a-z]{5}$/);
      expect(isValidWord(w)).toBe(true);
    }
  });
});

describe("bestStatus", () => {
  it("prefers stronger statuses", () => {
    expect(bestStatus(undefined, "absent")).toBe("absent");
    expect(bestStatus("absent", "present")).toBe("present");
    expect(bestStatus("present", "absent")).toBe("present");
    expect(bestStatus("present", "correct")).toBe("correct");
  });
});
