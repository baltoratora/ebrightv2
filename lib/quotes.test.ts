import { describe, it, expect } from "vitest";
import {
  QUOTES,
  indexForDay,
  randomIndexExcluding,
  quoteForDay,
} from "./quotes";

describe("indexForDay", () => {
  it("wraps the day index around the list length", () => {
    expect(indexForDay(0, 5)).toBe(0);
    expect(indexForDay(5, 5)).toBe(0);
    expect(indexForDay(7, 5)).toBe(2);
  });
  it("stays in range for negative day indices", () => {
    expect(indexForDay(-1, 5)).toBe(4);
    expect(indexForDay(-5, 5)).toBe(0);
  });
  it("floors a fractional day index", () => {
    expect(indexForDay(2.9, 5)).toBe(2);
  });
});

describe("randomIndexExcluding", () => {
  it("never returns the current index and stays in range", () => {
    const len = QUOTES.length;
    for (const current of [0, 1, 7, len - 1]) {
      for (let k = 0; k < 1000; k++) {
        const rnd = k / 1000; // sweep [0, 1)
        const i = randomIndexExcluding(current, len, rnd);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(len);
        expect(i).not.toBe(current);
      }
    }
  });
  it("returns 0 when the list has a single entry", () => {
    expect(randomIndexExcluding(0, 1, 0.5)).toBe(0);
  });
});

describe("quoteForDay", () => {
  it("is stable for the same day", () => {
    expect(quoteForDay(42)).toBe(quoteForDay(42));
  });
  it("rotates from one day to the next", () => {
    expect(quoteForDay(0).text).not.toBe(quoteForDay(1).text);
  });
});

describe("QUOTES data", () => {
  it("has a sizeable curated set", () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(30);
  });
  it("every quote has non-empty text and author", () => {
    for (const q of QUOTES) {
      expect(q.text.trim().length).toBeGreaterThan(0);
      expect(q.author.trim().length).toBeGreaterThan(0);
    }
  });
  it("has no duplicate quote texts", () => {
    const texts = QUOTES.map((q) => q.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
