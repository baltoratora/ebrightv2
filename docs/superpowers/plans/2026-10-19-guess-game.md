# Guess Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Guess" game to the baltoratora `/thinking` hub — pick a category, guess the hidden item, each guess shows its alphabetical index-distance from the answer + a direction arrow, rows colour-bucketed by closeness.

**Architecture:** Pure engine in `lib/guess.ts` (types + logic, no React/DOM), curated data in `lib/guess-categories.ts`, a thin route `app/guess/page.tsx`, a `"use client"` component `components/GuessGame.tsx`, one card in the `/thinking` hub, styles in `app/globals.css`. Unlimited mode only in v1; `pickAnswer` is seed-ready so Daily can be added later with no rework.

**Tech Stack:** Next.js 15 (App Router, static export), React 19, TypeScript, Vitest. No new dependencies.

**Branch:** All commits land on `feat/guess-game` (already created; spec committed there).

**Spec:** `docs/superpowers/specs/2026-10-19-guess-game-design.md`

**⚠️ HARD STOP after Task 3:** Do not start Task 4. After the data file + integrity tests are green and committed, produce the **borderline inclusions/exclusions summary** and hand it to Iqbal for review. Resume only on his go-ahead.

---

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `lib/guess.ts` | Types + pure engine functions | 1, 4, 5, 6, 7 |
| `lib/guess.test.ts` | Engine unit tests | 4, 5, 6, 7 |
| `lib/guess-categories.ts` | 5 category datasets, aliases, `CAPITAL_OF` map | 2 |
| `lib/guess-categories.test.ts` | Data-integrity tests | 3 |
| `app/guess/page.tsx` | Thin route wrapper | 9 |
| `components/GuessGame.tsx` | Client UI + localStorage | 8 |
| `app/thinking/page.tsx` | +1 hub card | 9 |
| `app/globals.css` | Guess styles | 10 |

---

# PHASE A — Data (STOP after Task 3)

## Task 1: Engine foundation — types + `normalize`

**Files:**
- Create: `lib/guess.ts`
- Create (test): `lib/guess.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/guess.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalize } from "./guess";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/guess.test.ts`
Expected: FAIL — `normalize` is not exported / module `./guess` has no such export.

- [ ] **Step 3: Write minimal implementation**

Create `lib/guess.ts`:

```ts
// Pure engine for the Guess game. No React, no DOM, no localStorage.

export type Direction = "up" | "down" | "hit"; // up = answer earlier (▲), down = later (▼)
export type Bucket = "green" | "yellow" | "red";

export type Category = {
  id: string; // stable key, e.g. "countries"
  label: string; // display name, e.g. "Countries"
  emoji: string; // e.g. "🌍"
  note: string; // short source/rule note
  items: string[]; // canonical display names (unsorted in source; engine sorts)
  aliases?: Record<string, string>; // normalized alias -> canonical item
};

export type GuessRow = {
  item: string; // canonical guessed item
  distance: number; // |index(guess) - index(answer)| in sorted list
  dir: Direction;
  bucket: Bucket;
};

/**
 * Canonical normalisation used for all matching and dedup comparisons:
 * lowercase -> strip accents (NFD) -> collapse every run of non-alphanumerics
 * to a single space -> trim.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/guess.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/guess.ts lib/guess.test.ts
git commit -m "feat(guess): engine types + normalize"
```

---

## Task 2: Category data file

**Files:**
- Create: `lib/guess-categories.ts`

This task has no unit test of its own — Task 3 adds the integrity tests that validate it. It must compile and typecheck.

- [ ] **Step 1: Create the data file skeleton with real content**

Create `lib/guess-categories.ts`. The shape is fixed below; **the executor generates the full item lists** following the rules in each comment. Representative excerpts are shown — fill every list to the required size (Task 3 enforces sizes and rules).

```ts
import type { Category } from "./guess";

/**
 * COUNTRIES — 193 UN members + 2 UN observers (Vatican City, Palestine) = 195.
 * Canonical naming rules:
 *   - No leading "The" (Bahamas, Gambia).
 *   - "Saint" spelled out, never "St." (Saint Lucia, Saint Kitts and Nevis).
 *   - Ivory Coast is canonical (Côte d'Ivoire is an alias).
 *   - Plain ASCII display names (Sao Tome and Principe, not São Tomé).
 */
const COUNTRY_ITEMS: string[] = [
  "Afghanistan", "Albania", "Algeria", /* ... fill to 195 ... */ "Zambia", "Zimbabwe",
];

// Normalized alias -> canonical country. Keys MUST equal normalize(key).
const COUNTRY_ALIASES: Record<string, string> = {
  "united states of america": "United States",
  "usa": "United States",
  "us": "United States",
  "uk": "United Kingdom",
  "britain": "United Kingdom",
  "great britain": "United Kingdom",
  "uae": "United Arab Emirates",
  "cote d ivoire": "Ivory Coast",
  "czechia": "Czech Republic",
  "burma": "Myanmar",
  "swaziland": "Eswatini",
  // ... add the rest ...
};

/**
 * CAPITAL_OF — canonical country -> canonical capital.
 * One capital per country; multi-capital countries use the commonly-taught
 * canonical and accept the others as capital aliases (see CAPITAL_ALIASES).
 * EXCLUDED (contested capitals, kids' audience): Israel, Palestine.
 *   -> They have NO entry here, so they do not appear in the Capitals category.
 *   -> They DO remain in COUNTRY_ITEMS (the Countries category).
 */
const CAPITAL_OF: Record<string, string> = {
  "Afghanistan": "Kabul",
  "Malaysia": "Kuala Lumpur",
  "Bolivia": "Sucre", // La Paz accepted as alias
  "South Africa": "Pretoria", // Cape Town / Bloemfontein accepted as aliases
  "Netherlands": "Amsterdam",
  // ... fill for every country EXCEPT Israel and Palestine ...
};

// Normalized alias -> canonical capital. Keys MUST equal normalize(key).
const CAPITAL_ALIASES: Record<string, string> = {
  "la paz": "Sucre",
  "cape town": "Pretoria",
  "bloemfontein": "Pretoria",
  // ... add the rest ...
};

/**
 * ANIMALS — ~150+ well-known animals. Singular, simple, kid-friendly names
 * (Lion, not Lions; no scientific names).
 */
const ANIMAL_ITEMS: string[] = [
  "Alligator", "Ant", "Antelope", /* ... fill to >= 150 ... */ "Zebra",
];

/**
 * FRUITS & VEG — ~150+ well-known fruits and vegetables. Botanical edge cases
 * listed ONCE (Tomato appears a single time; no fruit/veg split).
 */
const FRUITVEG_ITEMS: string[] = [
  "Apple", "Apricot", "Artichoke", /* ... fill to >= 150 ... */ "Zucchini",
];

/**
 * SPORTS — ~150+ well-known sports. Kid-friendly: no weapon-type sports,
 * nothing inappropriate. Singular/simple names.
 */
const SPORT_ITEMS: string[] = [
  "Archery", "Athletics", "Badminton", /* ... fill to >= 150 ... */ "Wrestling",
];

export { CAPITAL_OF };

export const CATEGORIES: Category[] = [
  {
    id: "countries",
    label: "Countries",
    emoji: "🌍",
    note: "193 UN members + Vatican City + Palestine = 195.",
    items: COUNTRY_ITEMS,
    aliases: COUNTRY_ALIASES,
  },
  {
    id: "capitals",
    label: "Capital Cities",
    emoji: "🏛️",
    note: "One capital per country. Israel & Palestine excluded (contested).",
    items: Object.values(CAPITAL_OF),
    aliases: CAPITAL_ALIASES,
  },
  {
    id: "animals",
    label: "Animals",
    emoji: "🦁",
    note: "~150+ common animals, singular kid-friendly names.",
    items: ANIMAL_ITEMS,
    aliases: {},
  },
  {
    id: "fruitveg",
    label: "Fruits & Veg",
    emoji: "🍎",
    note: "~150+ fruits and vegetables; edge cases listed once.",
    items: FRUITVEG_ITEMS,
    aliases: {},
  },
  {
    id: "sports",
    label: "Sports",
    emoji: "⚽",
    note: "~150+ kid-friendly sports.",
    items: SPORT_ITEMS,
    aliases: {},
  },
];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/guess-categories.ts
git commit -m "feat(guess): category datasets (countries, capitals, animals, fruit/veg, sports)"
```

---

## Task 3: Data-integrity tests — then STOP

**Files:**
- Create (test): `lib/guess-categories.test.ts`

- [ ] **Step 1: Write the tests**

Create `lib/guess-categories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalize } from "./guess";
import { CATEGORIES, CAPITAL_OF } from "./guess-categories";

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

describe("category data integrity", () => {
  for (const cat of CATEGORIES) {
    describe(cat.label, () => {
      it("has no two items that normalize to the same value", () => {
        const seen = new Map<string, string>();
        for (const item of cat.items) {
          const n = normalize(item);
          expect(seen.has(n), `dupe under normalize: "${item}" vs "${seen.get(n)}"`).toBe(false);
          seen.set(n, item);
        }
      });
      it("every alias key is already normalized and resolves to a real item", () => {
        for (const [key, val] of Object.entries(cat.aliases ?? {})) {
          expect(normalize(key), `alias key not normalized: "${key}"`).toBe(key);
          expect(cat.items, `alias target missing: "${val}"`).toContain(val);
        }
      });
      it("no item starts with 'The ' and none uses 'St.'", () => {
        for (const item of cat.items) {
          expect(item.startsWith("The "), `leading The: "${item}"`).toBe(false);
          expect(/\bSt\./.test(item), `uses St.: "${item}"`).toBe(false);
        }
      });
    });
  }

  it("Countries has exactly 195 items", () => {
    expect(byId.countries.items.length).toBe(195);
  });

  it("Animals, Fruits & Veg, Sports each have >= 150 items", () => {
    expect(byId.animals.items.length).toBeGreaterThanOrEqual(150);
    expect(byId.fruitveg.items.length).toBeGreaterThanOrEqual(150);
    expect(byId.sports.items.length).toBeGreaterThanOrEqual(150);
  });

  describe("Capitals (derived from CAPITAL_OF)", () => {
    it("every capital maps to a country present in Countries", () => {
      for (const country of Object.keys(CAPITAL_OF)) {
        expect(byId.countries.items, `unknown country: "${country}"`).toContain(country);
      }
    });
    it("has no duplicate capitals", () => {
      const caps = Object.values(CAPITAL_OF);
      expect(new Set(caps).size).toBe(caps.length);
    });
    it("excludes Israel and Palestine, which remain in Countries", () => {
      expect(CAPITAL_OF["Israel"]).toBeUndefined();
      expect(CAPITAL_OF["Palestine"]).toBeUndefined();
      expect(byId.countries.items).toContain("Israel");
      expect(byId.countries.items).toContain("Palestine");
    });
    it("Capitals items equal the values of CAPITAL_OF", () => {
      expect([...byId.capitals.items].sort()).toEqual([...Object.values(CAPITAL_OF)].sort());
    });
  });
});
```

- [ ] **Step 2: Run the tests; fix the DATA (not the tests) until green**

Run: `npx vitest run lib/guess-categories.test.ts`
Expected: PASS. If any fail, correct `lib/guess-categories.ts` (sizes, dupes, aliases, naming, capital exclusions) — never weaken the tests.

- [ ] **Step 3: Commit**

```bash
git add lib/guess-categories.test.ts lib/guess-categories.ts
git commit -m "test(guess): data-integrity tests for category datasets"
```

- [ ] **Step 4: 🛑 STOP — produce the borderline summary**

Write Iqbal a short summary covering at minimum:
- Israel/Palestine capital exclusion (confirm present in Countries, absent in Capitals).
- Multi-capital canonical choices (Bolivia→Sucre, South Africa→Pretoria, Netherlands→Amsterdam, …) and which alternates are accepted as aliases.
- Borderline animals / sports / produce inclusions and exclusions.
- Any canonical name that was a judgment call.

Do NOT start Task 4 until Iqbal approves the lists.

---

# PHASE B — Engine (TDD) — resume after list approval

## Task 4: `sortedItems` + `bucket`

**Files:**
- Modify: `lib/guess.ts`
- Modify (test): `lib/guess.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/guess.test.ts`:

```ts
import { sortedItems, bucket } from "./guess";
import type { Category } from "./guess";

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
    expect(bucket(0, 195)).toBe("green"); // note: 0 is handled as hit by evaluateGuess; bucket(0) is green
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
```

> Note: `bucket` never needs to represent "hit" — distance 0 is reported as `dir: "hit"` by `evaluateGuess`. `bucket(0, N)` returning `"green"` is harmless and keeps `bucket` a pure distance→colour function.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/guess.test.ts`
Expected: FAIL — `sortedItems`/`bucket` not exported.

- [ ] **Step 3: Implement**

Append to `lib/guess.ts`:

```ts
const GREEN_PCT = 0.05;
const YELLOW_PCT = 0.15;

/** Canonical items sorted A–Z by displayed name (deterministic). */
export function sortedItems(cat: Category): string[] {
  return [...cat.items].sort((a, b) => a.localeCompare(b, "en"));
}

/** Colour bucket from index-distance and list size N (hit is handled upstream). */
export function bucket(distance: number, n: number): Bucket {
  if (distance <= Math.ceil(GREEN_PCT * n)) return "green";
  if (distance <= Math.ceil(YELLOW_PCT * n)) return "yellow";
  return "red";
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/guess.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/guess.ts lib/guess.test.ts
git commit -m "feat(guess): sortedItems + bucket"
```

---

## Task 5: `resolveGuess` + `suggest`

**Files:**
- Modify: `lib/guess.ts`
- Modify (test): `lib/guess.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/guess.test.ts`:

```ts
import { resolveGuess, suggest } from "./guess";

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
    // query "in": prefix -> India, Indonesia; substring -> (none more). "United" items don't match.
    expect(suggest("in", GEO)).toEqual(["India", "Indonesia"]);
  });
  it("puts prefix before substring", () => {
    // query "ind" prefix: India, Indonesia. query "ited" substring only: both United*.
    expect(suggest("ited", GEO)).toEqual(["United Kingdom", "United States"]);
  });
  it("respects the limit", () => {
    expect(suggest("united", GEO, 1)).toEqual(["United Kingdom"]);
  });
  it("returns [] for empty query", () => {
    expect(suggest("", GEO)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/guess.test.ts`
Expected: FAIL — `resolveGuess`/`suggest` not exported.

- [ ] **Step 3: Implement**

Append to `lib/guess.ts`:

```ts
/** Resolve raw input to a canonical item, or null. Exact canonical, then alias. */
export function resolveGuess(raw: string, cat: Category): string | null {
  const q = normalize(raw);
  if (!q) return null;
  for (const item of cat.items) {
    if (normalize(item) === q) return item;
  }
  return cat.aliases?.[q] ?? null;
}

/** Autocomplete suggestions: prefix matches first, then substring; capped at `limit`. */
export function suggest(raw: string, cat: Category, limit = 8): string[] {
  const q = normalize(raw);
  if (!q) return [];
  const prefix: string[] = [];
  const substr: string[] = [];
  for (const item of sortedItems(cat)) {
    const n = normalize(item);
    if (n.startsWith(q)) prefix.push(item);
    else if (n.includes(q)) substr.push(item);
  }
  return [...prefix, ...substr].slice(0, limit);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/guess.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/guess.ts lib/guess.test.ts
git commit -m "feat(guess): resolveGuess + suggest (prefix before substring)"
```

---

## Task 6: `pickAnswer`

**Files:**
- Modify: `lib/guess.ts`
- Modify (test): `lib/guess.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/guess.test.ts`:

```ts
import { pickAnswer } from "./guess";

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/guess.test.ts`
Expected: FAIL — `pickAnswer` not exported.

- [ ] **Step 3: Implement**

Append to `lib/guess.ts`:

```ts
/** Deterministic 32-bit hash of an integer seed (for seeded answer selection). */
function hashSeed(seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return Math.abs(h);
}

/**
 * Pick one answer. Unlimited mode passes no seed (uses Math.random) and may pass
 * `exclude` to avoid an immediate repeat. Daily (future) passes a date-derived seed.
 * Pure given its arguments (for a fixed seed).
 */
export function pickAnswer(
  items: string[],
  opts: { seed?: number; exclude?: string } = {}
): string {
  const { seed, exclude } = opts;
  const pool = exclude ? items.filter((i) => i !== exclude) : items;
  if (pool.length === 0) return items[0]; // only item was excluded
  const idx =
    seed === undefined
      ? Math.floor(Math.random() * pool.length)
      : hashSeed(seed) % pool.length;
  return pool[idx];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/guess.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/guess.ts lib/guess.test.ts
git commit -m "feat(guess): pickAnswer (seed-ready, exclude for no immediate repeat)"
```

---

## Task 7: `evaluateGuess`

**Files:**
- Modify: `lib/guess.ts`
- Modify (test): `lib/guess.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/guess.test.ts`:

```ts
import { evaluateGuess } from "./guess";

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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/guess.test.ts`
Expected: FAIL — `evaluateGuess` not exported.

- [ ] **Step 3: Implement**

Append to `lib/guess.ts`:

```ts
/** Evaluate one guess against the answer within the sorted list. */
export function evaluateGuess(
  guessItem: string,
  answer: string,
  sorted: string[]
): GuessRow {
  const gi = sorted.indexOf(guessItem);
  const ai = sorted.indexOf(answer);
  const distance = Math.abs(ai - gi);
  const dir: Direction = ai === gi ? "hit" : ai > gi ? "down" : "up";
  return { item: guessItem, distance, dir, bucket: bucket(distance, sorted.length) };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/guess.test.ts`
Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
git add lib/guess.ts lib/guess.test.ts
git commit -m "feat(guess): evaluateGuess (distance + direction + bucket)"
```

---

# PHASE C — UI

## Task 8: `GuessGame` component

**Files:**
- Create: `components/GuessGame.tsx`

No unit test (client component; repo deliberately avoids jsdom). Must typecheck + lint clean. Manual verification happens in Task 11.

- [ ] **Step 1: Create the component**

Create `components/GuessGame.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
} from "@/lib/guess-categories";
import {
  evaluateGuess,
  pickAnswer,
  resolveGuess,
  sortedItems,
  suggest,
  type Category,
  type GuessRow,
} from "@/lib/guess";

type Status = "playing" | "won" | "gaveup";

type Stats = {
  gamesPlayed: number;
  wins: number;
  gaveUp: number;
  totalGuessesOnWins: number;
};

type SavedGame = { answer: string; guesses: string[]; status: Status };

const ZERO_STATS: Stats = { gamesPlayed: 0, wins: 0, gaveUp: 0, totalGuessesOnWins: 0 };

function gameKey(catId: string) {
  return `baltoratora:guess:${catId}:game`;
}
function statsKey(catId: string) {
  return `baltoratora:guess:${catId}:stats`;
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore quota / disabled storage */
  }
}

const ARROW: Record<GuessRow["dir"], string> = { up: "▲", down: "▼", hit: "★" };
const DIR_WORD: Record<GuessRow["dir"], string> = {
  up: "earlier",
  down: "later",
  hit: "correct",
};

export function GuessGame() {
  const [catId, setCatId] = useState<string | null>(null);
  const cat = useMemo<Category | null>(
    () => CATEGORIES.find((c) => c.id === catId) ?? null,
    [catId]
  );
  const sorted = useMemo(() => (cat ? sortedItems(cat) : []), [cat]);

  const [answer, setAnswer] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [announce, setAnnounce] = useState("");
  const [stats, setStats] = useState<Stats>(ZERO_STATS);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load stats + resume (or start) a round when a category is chosen.
  useEffect(() => {
    if (!cat) return;
    setStats(lsGet<Stats>(statsKey(cat.id)) ?? ZERO_STATS);
    const saved = lsGet<SavedGame>(gameKey(cat.id));
    if (saved && saved.status === "playing" && cat.items.includes(saved.answer)) {
      setAnswer(saved.answer);
      setGuesses(saved.guesses);
      setStatus("playing");
    } else {
      startRound(cat, saved?.answer);
    }
    setInput("");
    setMessage("");
    setAnnounce("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  function persistGame(a: string, g: string[], s: Status) {
    if (!cat) return;
    lsSet(gameKey(cat.id), { answer: a, guesses: g, status: s } satisfies SavedGame);
  }

  function startRound(c: Category, exclude?: string) {
    const items = sortedItems(c);
    const a = pickAnswer(items, { exclude });
    setAnswer(a);
    setGuesses([]);
    setStatus("playing");
    setInput("");
    setMessage("");
    setAnnounce("");
    lsSet(gameKey(c.id), { answer: a, guesses: [], status: "playing" } satisfies SavedGame);
  }

  function bumpStats(next: Partial<Stats>) {
    if (!cat) return;
    setStats((prev) => {
      const merged = { ...prev, ...next };
      lsSet(statsKey(cat.id), merged);
      return merged;
    });
  }

  function submit(rawOrItem: string) {
    if (!cat || status !== "playing") return;
    const resolved = resolveGuess(rawOrItem, cat);
    if (!resolved) {
      setMessage("Not in this list — try another");
      setAnnounce("Not in this list. Try another.");
      return;
    }
    if (guesses.includes(resolved)) {
      setMessage("Already guessed");
      setAnnounce(`${resolved}. Already guessed.`);
      setInput("");
      return;
    }
    const row = evaluateGuess(resolved, answer, sorted);
    const nextGuesses = [...guesses, resolved];
    setGuesses(nextGuesses);
    setInput("");
    setMessage("");

    if (row.dir === "hit") {
      setStatus("won");
      persistGame(answer, nextGuesses, "won");
      bumpStats({
        gamesPlayed: stats.gamesPlayed + 1,
        wins: stats.wins + 1,
        totalGuessesOnWins: stats.totalGuessesOnWins + nextGuesses.length,
      });
      setAnnounce(`${resolved}, correct! Solved in ${nextGuesses.length} guesses.`);
    } else {
      persistGame(answer, nextGuesses, "playing");
      setAnnounce(`${resolved}, ${row.distance}, ${DIR_WORD[row.dir]} in the list.`);
    }
  }

  function giveUp() {
    if (!cat || status !== "playing") return;
    setStatus("gaveup");
    persistGame(answer, guesses, "gaveup");
    bumpStats({ gamesPlayed: stats.gamesPlayed + 1, gaveUp: stats.gaveUp + 1 });
    setAnnounce(`Gave up. The answer was ${answer}.`);
  }

  function playAgain() {
    if (cat) startRound(cat, answer);
    inputRef.current?.focus();
  }

  const suggestions = useMemo(
    () => (cat && status === "playing" ? suggest(input, cat, 8) : []),
    [input, cat, status]
  );

  const rows = useMemo(
    () =>
      [...guesses]
        .sort((a, b) => a.localeCompare(b, "en"))
        .map((g) => evaluateGuess(g, answer, sorted)),
    [guesses, answer, sorted]
  );

  const avg = stats.wins > 0 ? (stats.totalGuessesOnWins / stats.wins).toFixed(1) : "—";

  // ---- Category picker ----
  if (!cat) {
    return (
      <div className="guess">
        <p className="guess-caption">Pick a category — then guess the hidden item.</p>
        <div className="games">
          {CATEGORIES.map((c) => (
            <button key={c.id} className="game-card" onClick={() => setCatId(c.id)}>
              <span className="game-icon">{c.emoji}</span>
              <span className="game-name">{c.label}</span>
              <span className="game-desc">{c.items.length} items</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Play screen ----
  return (
    <div className="guess">
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      <div className="guess-topbar">
        <span className="guess-cat">
          {cat.emoji} {cat.label}
        </span>
        <span className="guess-stats">
          W {stats.wins} · avg {avg}
        </span>
      </div>
      <p className="guess-caption">Guesses are arranged alphabetically</p>

      {status === "won" && (
        <div className="guess-banner guess-banner--win" role="status">
          Solved in {guesses.length}! The answer was <strong>{answer}</strong>.
        </div>
      )}
      {status === "gaveup" && (
        <div className="guess-banner guess-banner--over" role="status">
          The answer was <strong>{answer}</strong>.
        </div>
      )}

      <ul className="guess-list">
        {rows.map((r) => (
          <li key={r.item} className={`guess-row guess-row--${r.dir === "hit" ? "hit" : r.bucket}`}>
            <span className="guess-item">{r.item}</span>
            <span className="guess-dist">
              {r.dir === "hit" ? ARROW.hit : `${r.distance} ${ARROW[r.dir]}`}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="guess-empty">No guesses yet.</li>}
      </ul>

      {status === "playing" ? (
        <div className="guess-inputbar">
          {message && <div className="guess-msg">{message}</div>}
          {suggestions.length > 0 && input && (
            <ul className="guess-suggest">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => submit(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <input
              ref={inputRef}
              className="guess-input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setMessage("");
              }}
              placeholder={`Guess a ${cat.label.toLowerCase().replace(/s$/, "")}…`}
              autoComplete="off"
              aria-label={`Guess a ${cat.label}`}
            />
            <button className="guess-submit" type="submit">
              Guess
            </button>
          </form>
          <div className="guess-controls">
            <button className="guess-ctl" onClick={giveUp}>
              Give up
            </button>
            <button className="guess-ctl" onClick={() => setCatId(null)}>
              Change category
            </button>
          </div>
        </div>
      ) : (
        <div className="guess-controls">
          <button className="guess-ctl guess-ctl--primary" onClick={playAgain}>
            Play again
          </button>
          <button className="guess-ctl" onClick={() => setCatId(null)}>
            Change category
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no type errors; no lint errors for `components/GuessGame.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/GuessGame.tsx
git commit -m "feat(guess): GuessGame client component (picker, play, persistence, a11y)"
```

---

## Task 9: Route + hub card

**Files:**
- Create: `app/guess/page.tsx`
- Modify: `app/thinking/page.tsx` (add one entry to the `GAMES` array)

- [ ] **Step 1: Create the route**

Create `app/guess/page.tsx`:

```tsx
import { GuessGame } from "@/components/GuessGame";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Guess" };

export default function GuessPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Guess</h1>
          <span className="tag">narrow it down A–Z</span>
        </div>
      </header>
      <GuessGame />
    </main>
  );
}
```

- [ ] **Step 2: Add the hub card**

In `app/thinking/page.tsx`, add this entry to the end of the `GAMES` array (after the Tower Defense line):

```ts
  { name: "Guess", desc: "Narrow it down A–Z", icon: "🔤", href: "/guess", ready: true },
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds; `/guess` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add app/guess/page.tsx app/thinking/page.tsx
git commit -m "feat(guess): /guess route + Thinking Mode hub card"
```

---

## Task 10: CSS

**Files:**
- Modify: `app/globals.css` (append a Guess section)

- [ ] **Step 1: Append styles**

Add to the end of `app/globals.css`. (Reuses the existing `.games` / `.game-card` grid for the picker; defines guess-specific classes. Adjust colour values to match the site's dark-cosmic palette if needed.)

```css
/* ---------- Guess game ---------- */
.guess { max-width: 560px; margin: 0 auto; width: 100%; }
.guess-caption { text-align: center; opacity: 0.7; font-size: 0.85rem; margin: 0.25rem 0 0.75rem; }
.guess-topbar { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; opacity: 0.85; }
.guess-cat { font-weight: 600; }
.guess-stats { opacity: 0.7; }

.guess-list { list-style: none; padding: 0; margin: 0.5rem 0 6rem; display: flex; flex-direction: column; gap: 6px; }
.guess-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 12px; font-weight: 600; color: #0b0b16; }
.guess-row--green { background: #4ade80; }
.guess-row--yellow { background: #facc15; }
.guess-row--red { background: #f87171; }
.guess-row--hit { background: #22d3ee; outline: 2px solid #fff; }
.guess-dist { font-variant-numeric: tabular-nums; }
.guess-empty { text-align: center; opacity: 0.5; padding: 1rem; }

.guess-inputbar { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: rgba(10,10,22,0.95); backdrop-filter: blur(8px); border-top: 1px solid rgba(255,255,255,0.1); }
.guess-inputbar form { display: flex; gap: 8px; max-width: 560px; margin: 0 auto; }
.guess-input { flex: 1; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: #15152a; color: #fff; font-size: 1rem; }
.guess-submit, .guess-ctl { padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); background: #2a2a4a; color: #fff; cursor: pointer; font-size: 0.95rem; }
.guess-ctl--primary { background: #6d28d9; }
.guess-controls { display: flex; gap: 8px; justify-content: center; max-width: 560px; margin: 0.5rem auto 0; }
.guess-inputbar .guess-controls { margin-top: 8px; }

.guess-suggest { list-style: none; margin: 0 auto 8px; padding: 0; max-width: 560px; background: #15152a; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; overflow: hidden; max-height: 180px; overflow-y: auto; }
.guess-suggest button { width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; color: #fff; cursor: pointer; }
.guess-suggest button:hover { background: rgba(255,255,255,0.08); }
.guess-msg { text-align: center; color: #fca5a5; font-size: 0.85rem; margin-bottom: 6px; }

.guess-banner { text-align: center; padding: 12px; border-radius: 12px; margin: 0.5rem 0; }
.guess-banner--win { background: rgba(34,211,238,0.15); border: 1px solid #22d3ee; }
.guess-banner--over { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); }

/* Screen-reader-only (if not already defined globally) */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
```

> Before adding `.sr-only`, grep `app/globals.css` — if it already defines `.sr-only`, omit the duplicate.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style(guess): dark-cosmic styles for picker, rows, input bar"
```

---

# PHASE D — Verification

## Task 11: Full verification + manual mobile check

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites PASS, including `lib/guess.test.ts` and `lib/guess-categories.test.ts`. Note the new total count.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: success; `/guess` listed in the exported routes.

- [ ] **Step 5: Manual check at mobile width**

Run: `npm run dev`, open `http://localhost:3000/guess`, set the browser to a mobile width (~390px / iPhone in devtools device mode). Verify:
- Category picker shows 5 cards with "N items" counts.
- Picking a category shows the play screen; caption reads "Guesses are arranged alphabetically".
- Typing shows autocomplete (prefix matches first); submitting an invalid word shows "Not in this list — try another" and does not add a row.
- A valid guess adds a colour-coded row (item left, `distance ▲/▼` right); the list stays sorted A–Z.
- Guessing the answer shows the win banner + "Play again" / "Change category"; "Play again" starts a new round (different answer).
- "Give up" reveals the answer. Refreshing mid-round resumes the same round.
- Input bar is fixed to the bottom and usable at mobile width.

- [ ] **Step 6: Final confirmation (no commit needed unless fixes were made)**

If any step surfaced a fix, commit it with a clear message, then re-run Steps 1–4. Report the final green results (test count, build status) to Iqbal, and append an entry to `docs/OUTPUTS.md` per the house workflow.

---

## Self-review notes (plan author)

- **Spec coverage:** normalize, sortedItems (+stability), resolveGuess, suggest (prefix-first), pickAnswer (seed + exclude), bucket (% scaling), evaluateGuess (distance/dir/hit) → Tasks 1,4,5,6,7. Data + all integrity tests (195 countries, ≥150 others, no normalize-dupes, aliases resolve, no "The"/"St.", capitals-from-map, Israel/Palestine exclusion, no duplicate capitals) → Tasks 2,3. Component (picker, play, invalid/duplicate handling, win/give-up, mid-game persistence, stats avg=onWins/wins, aria-live) → Task 8. Route + hub → Task 9. CSS → Task 10. Verification incl. mobile → Task 11.
- **STOP gate** after Task 3 is explicit, per Iqbal's ordering.
- **No new dependencies**; no `GAME_META`/leaderboard wiring (out of scope).
