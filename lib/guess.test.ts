import { describe, it, expect } from "vitest";
import { normalize, sortedItems, bucket } from "./guess";
import type { Category } from "./guess";

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("Brazil")).toBe("brazil");
  });
  it("strips accents", () => {
    expect(normalize("Côte d'Ivoire")).toBe("cote d ivoire");
    expect(normalize("São Tomé")).toBe("sao tome");
  });
  it("collapses punctuation and runs of spaces to single spaces and trims", () => {
    expect(normalize("  Saint   Kitts and Nevis ")).toBe("saint kitts and nevis");
    expect(normalize("Guinea-Bissau")).toBe("guinea bissau");
    expect(normalize("St. Lucia")).toBe("st lucia");
  });
});

const CAT: Category = {
  id: "t", label: "T", emoji: "x", note: "",
  items: ["Banana", "apple", "Cherry"],
};

describe("sortedItems", () => {
  it("sorts by displayed canonical name, case-insensitive-ish via locale", () => {
    expect(sortedItems(CAT)).toEqual(["apple", "Banana", "Cherry"]);
  });
  it("is deterministic (stable) across repeated calls", () => {
    expect(sortedItems(CAT)).toEqual(sortedItems(CAT));
  });
  it("produces an order with no adjacent items equal under normalize", () => {
    // `normalize` is already imported at the top of this file (Task 1).
    const s = sortedItems(CAT);
    for (let i = 1; i < s.length; i++) {
      expect(normalize(s[i])).not.toBe(normalize(s[i - 1]));
    }
  });
});

describe("bucket", () => {
  it("distance 0 is a hit", () => {
    expect(bucket(0, 195)).toBe("green"); // 0 handled as hit by evaluateGuess; bucket(0) is green
  });
  it("scales thresholds with list size (N=195: green<=10, yellow<=30)", () => {
    expect(bucket(10, 195)).toBe("green");
    expect(bucket(11, 195)).toBe("yellow");
    expect(bucket(30, 195)).toBe("yellow");
    expect(bucket(31, 195)).toBe("red");
  });
  it("scales for a smaller list (N=150: green<=8, yellow<=23)", () => {
    expect(bucket(8, 150)).toBe("green");
    expect(bucket(9, 150)).toBe("yellow");
    expect(bucket(23, 150)).toBe("yellow");
    expect(bucket(24, 150)).toBe("red");
  });
});
