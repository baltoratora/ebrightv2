import { candidateRange } from "./guess";
import { describe, it, expect } from "vitest";
import { normalize, sortedItems, bucket, resolveGuess, suggest, pickAnswer, evaluateGuess } from "./guess";
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

const GEO: Category = {
  id: "geo", label: "Geo", emoji: "x", note: "",
  items: ["United States", "United Kingdom", "Ivory Coast", "India", "Indonesia"],
  aliases: { "usa": "United States", "uk": "United Kingdom", "cote d ivoire": "Ivory Coast" },
};

describe("resolveGuess", () => {
  it("resolves exact canonical case-insensitively", () => {
    expect(resolveGuess("india", GEO)).toBe("India");
  });
  it("resolves via alias", () => {
    expect(resolveGuess("USA", GEO)).toBe("United States");
    expect(resolveGuess("Côte d'Ivoire", GEO)).toBe("Ivory Coast");
  });
  it("returns null for unknown input", () => {
    expect(resolveGuess("Narnia", GEO)).toBeNull();
    expect(resolveGuess("", GEO)).toBeNull();
  });
});

describe("suggest", () => {
  it("ranks prefix matches before substring matches, each group sorted", () => {
    expect(suggest("in", GEO)).toEqual(["India", "Indonesia"]);
  });
  it("puts prefix before substring", () => {
    expect(suggest("ited", GEO)).toEqual(["United Kingdom", "United States"]);
  });
  it("respects the limit", () => {
    expect(suggest("united", GEO, 1)).toEqual(["United Kingdom"]);
  });
  it("returns [] for empty query", () => {
    expect(suggest("", GEO)).toEqual([]);
  });
});

const ITEMS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];

describe("pickAnswer", () => {
  it("returns a member of the list", () => {
    expect(ITEMS).toContain(pickAnswer(ITEMS));
  });
  it("is deterministic for a given seed", () => {
    const a = pickAnswer(ITEMS, { seed: 123 });
    const b = pickAnswer(ITEMS, { seed: 123 });
    expect(a).toBe(b);
    expect(ITEMS).toContain(a);
  });
  it("different seeds can differ but always return members", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(ITEMS).toContain(pickAnswer(ITEMS, { seed }));
    }
  });
  it("never returns the excluded item", () => {
    for (const seed of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      expect(pickAnswer(ITEMS, { seed, exclude: "Charlie" })).not.toBe("Charlie");
    }
  });
  it("handles a single-item list even when it is excluded", () => {
    expect(pickAnswer(["Only"], { exclude: "Only" })).toBe("Only");
  });
});

describe("evaluateGuess", () => {
  const sorted = ["Ant", "Bear", "Cat", "Dog", "Eel"]; // indices 0..4

  it("reports a hit at distance 0", () => {
    expect(evaluateGuess("Cat", "Cat", sorted)).toEqual({
      item: "Cat", distance: 0, dir: "hit", bucket: "green",
    });
  });
  it("answer later in list -> down (▼)", () => {
    const r = evaluateGuess("Ant", "Dog", sorted); // ai=3 > gi=0
    expect(r.distance).toBe(3);
    expect(r.dir).toBe("down");
  });
  it("answer earlier in list -> up (▲)", () => {
    const r = evaluateGuess("Eel", "Bear", sorted); // ai=1 < gi=4
    expect(r.distance).toBe(3);
    expect(r.dir).toBe("up");
  });
  it("sets the colour bucket from distance and list size", () => {
    // N=5: green<=ceil(.05*5)=1, yellow<=ceil(.15*5)=1 -> distance 3 is red
    expect(evaluateGuess("Ant", "Dog", sorted).bucket).toBe("red");
  });
});

describe("candidateRange", () => {
  const items = ["Alpha", "Beta", "Delta", "Gamma", "Omega"];
  it("starts with the entire list, then narrows from revealed clues only", () => {
    expect(candidateRange(items, [])).toEqual({ first: "Alpha", last: "Omega", count: 5 });
    expect(candidateRange(items, [{ item: "Alpha", dir: "down" }, { item: "Gamma", dir: "up" }])).toEqual({ first: "Beta", last: "Delta", count: 2 });
  });
  it("handles solved, end-of-list and inconsistent clues", () => {
    expect(candidateRange(items, [{ item: "Omega", dir: "hit" }])).toEqual({ first: "Omega", last: "Omega", count: 1 });
    expect(candidateRange(items, [{ item: "Omega", dir: "down" }])).toBeNull();
    expect(candidateRange([], [])).toBeNull();
  });
});
