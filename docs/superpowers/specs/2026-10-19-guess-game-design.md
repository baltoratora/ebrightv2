# Guess — alphabetical hot/cold guessing game

**Date:** 2026-10-19
**Status:** Approved design — ready for implementation plan
**Route:** `/guess`
**Repo:** `ebrightv2` (baltoratora, `demo.baltoratora.my/thinking`)

## Summary

A single new game, **Guess**, added to the `/thinking` hub. The player picks a
category (Countries, Animals, Fruits & Veg, Capital Cities, Sports). The game
secretly selects one hidden item from that category's fixed, curated list. The
player guesses items from the list; each guess reports how far the guess is from
the answer **by position in the alphabetically-sorted list**, plus a direction
arrow (▲ earlier / ▼ later). Rows are colour-coded by closeness. The guess list
is always displayed sorted A–Z. Win at distance 0.

This is a hot/cold **alphabetical-distance** game — not Sporcle-style "name them
all", not a picture quiz.

## Scope

**In scope (v1):**
- Unlimited mode only (random hidden answer, infinite replays).
- 5 categories with curated, kid-friendly data.
- Pure, fully-tested engine; thin route; client component; one hub card.
- localStorage mid-game persistence + per-category stats.
- Accessibility: keyboard operable, `aria-live` result announcements.

**Out of scope (v1):**
- Daily mode UI/state (engine stays seed-ready — see `pickAnswer`).
- Multiplayer, accounts, leaderboards (no `GAME_META` entry, no D1).
- Images / flags / photos.

## Architecture

Follows the existing baltoratora game pattern exactly.

| File | Purpose |
|---|---|
| `lib/guess.ts` | Pure engine: types + all logic. No React, no DOM, no `localStorage`. |
| `lib/guess.test.ts` | Vitest — logic + data-integrity tests. |
| `lib/guess-categories.ts` | The 5 category datasets, aliases, and the country→capital map. Source/rule comment atop each category. |
| `app/guess/page.tsx` | Thin server wrapper: metadata, `BackBar`, header, renders `<GuessGame/>`. |
| `components/GuessGame.tsx` | `"use client"` UI + `localStorage` (all wrapped in `try/catch`). |
| `app/thinking/page.tsx` | +1 entry in the `GAMES` array. |
| `app/globals.css` | Styles: category picker, guess rows (green/yellow/red), bottom input, autocomplete. |

Separation of concerns: every rule that can be expressed as a pure function
lives in `lib/guess.ts` and is unit-tested. The component only wires state,
input, persistence, and rendering.

## Engine API (`lib/guess.ts`)

```ts
export type Category = {
  id: string;            // stable key, e.g. "countries"
  label: string;         // display name, e.g. "Countries"
  emoji: string;         // e.g. "🌍"
  note: string;          // short source/rule note shown nowhere critical; mirrors file comment
  items: string[];       // canonical display names (unsorted in source; sorted by engine)
  aliases?: Record<string, string>; // normalized alias -> canonical item
};

export type Direction = "up" | "down" | "hit"; // up = answer earlier (▲), down = later (▼)
export type Bucket = "green" | "yellow" | "red";

export type GuessRow = {
  item: string;      // canonical guessed item
  distance: number;  // |index(guess) - index(answer)| in sorted list
  dir: Direction;
  bucket: Bucket;
};

// Normalisation for all matching/sorting comparisons:
// lowercase -> NFD accent strip -> remove punctuation -> collapse whitespace -> trim.
export function normalize(s: string): string;

// Canonical items sorted A–Z by DISPLAYED canonical name (localeCompare).
export function sortedItems(cat: Category): string[];

// Resolve raw player input to a canonical item, or null.
// Match order: exact canonical (normalized) -> alias (normalized) -> null.
export function resolveGuess(raw: string, cat: Category): string | null;

// Autocomplete suggestions. Prefix matches first, then substring matches,
// each group in sorted order; deduped; capped at `limit` (default 8).
export function suggest(raw: string, cat: Category, limit?: number): string[];

// Pure answer selection. `seed` optional (future Daily). `exclude` prevents
// immediate repeat in Unlimited. Returns a canonical item from `items`.
export function pickAnswer(
  items: string[],
  opts?: { seed?: number; exclude?: string }
): string;

// Colour bucket from distance and list size N (scales across categories):
// hit:    distance === 0
// green:  distance <= ceil(0.05 * N)
// yellow: distance <= ceil(0.15 * N)
// red:    otherwise
export function bucket(distance: number, n: number): Bucket;

// Evaluate one guess against the answer within the sorted list.
// dir: answer index > guess index -> "down" (▼, later); < -> "up" (▲, earlier); === -> "hit".
export function evaluateGuess(
  guessItem: string,
  answer: string,
  sorted: string[]
): GuessRow;
```

### Direction & distance semantics
- `sorted = sortedItems(cat)`.
- `gi = sorted.indexOf(guess)`, `ai = sorted.indexOf(answer)`.
- `distance = Math.abs(ai - gi)`.
- `ai > gi` → answer is **later** alphabetically → `dir: "down"` (▼).
- `ai < gi` → answer is **earlier** → `dir: "up"` (▲).
- `ai === gi` → `dir: "hit"`, win.

### Bucket thresholds (worked example)
For `N = 195` (Countries): green `≤ 10`, yellow `≤ 30`, else red. For `N = 150`
(Animals): green `≤ 8`, yellow `≤ 23`. Thresholds are the only tunable
constants (`GREEN_PCT = 0.05`, `YELLOW_PCT = 0.15`).

## Data (`lib/guess-categories.ts`)

Each category carries a top comment stating its source and inclusion rule.

### Canonical naming rules (apply to all categories)
- **No leading "The"**: `Bahamas`, `Gambia` (not "The Bahamas").
- **Saint convention**: always spell out **"Saint"** (e.g. `Saint Lucia`,
  `Saint Kitts and Nevis`), never "St.". Accept "St." forms as aliases.
- **Côte d'Ivoire** canonical = **`Ivory Coast`** (accept "Côte d'Ivoire" alias).
- Singular, simple names only (`Lion`, not "Lions"; no scientific names).
- Kid-friendly: no weapon-type sports, nothing inappropriate.

### Sorting
Items are sorted by their **displayed canonical name** via `localeCompare`.
`normalize` is used for *matching*, not for *sort order*, but sort order must be
**stable under normalize** — i.e. two names that normalize equal must not exist
(enforced by a data-integrity test).

### Countries (~195)
193 UN members + 2 observers (Vatican City, Palestine) = 195. One canonical name
each, with aliases: USA/US/United States of America → `United States`;
UK/Britain → `United Kingdom`; UAE → `United Arab Emirates`; Ivory Coast ⇄ Côte
d'Ivoire; Czechia ⇄ Czech Republic; Myanmar ⇄ Burma; Eswatini ⇄ Swaziland; etc.

### Capital Cities (derived)
Capitals are **derived from a country→capital map**, not stored as an
independent list. The map lives beside the Countries data:
`CAPITAL_OF: Record<string /*country*/, string /*capital*/>`.

- One capital per country; for multi-capital countries use the commonly-taught
  one as canonical and accept the others as aliases (e.g. Bolivia → `Sucre`
  canonical, accept "La Paz"; South Africa → `Pretoria`; Netherlands →
  `Amsterdam`; Malaysia → `Kuala Lumpur`).
- **Exclusions**: **Israel and Palestine are excluded from the Capitals
  category** (contested capitals; kids' audience). Both countries **remain in
  the Countries category**. This is noted in the Capitals top comment and in the
  borderline summary.
- The `items` for the Capitals category = `Object.values(CAPITAL_OF)` for
  non-excluded countries, then sorted.

### Animals / Fruits & Veg / Sports (~150+ each)
- Generous (~150+) so most reasonable guesses are valid.
- Autocomplete-gated; the category screen shows "N items".
- Invalid guess → "Not in this list — try another", **not counted**.
- Fruits & Veg: botanical edge cases listed **once** (e.g. `Tomato` appears a
  single time; no fruit/veg split).

### Deliverable for review
Before ship, a short **borderline inclusions/exclusions summary** covering at
least: Israel/Palestine capital exclusion; multi-capital canonical choices;
borderline animals/sports/produce; any name whose canonical form was a judgment
call.

## Gameplay rules (component)

- **Valid guess**: `resolveGuess` returns a canonical item not already guessed →
  append a `GuessRow`, increment guess count.
- **Invalid**: `resolveGuess` → null → message "Not in this list — try another",
  **not counted**.
- **Duplicate**: canonical already in guesses → "Already guessed", **not counted**.
- **Win**: `dir === "hit"` → win banner with guess count, reveal answer,
  buttons *Play again* / *Change category*.
- **Give up**: reveals the answer, marks the round as gave-up, offers *Play
  again* / *Change category*.

## UI flow (mobile-first)

1. **Category picker** (first screen): grid of cards — emoji, label, "N items".
2. **Play screen**:
   - Header: category name + caption **"Guesses are arranged alphabetically"**.
   - Guess list: **always sorted A–Z** by canonical name. Each row: item on the
     left; `distance ▲/▼` on the right; row background coloured by bucket
     (green/yellow/red); the winning row marked distinct.
   - Input **fixed at the bottom** with an autocomplete dropdown fed by
     `suggest()`. Submit via Enter or tapping a suggestion.
   - Controls: *Give up*, *Change category*.

## Accessibility

- Keyboard operable throughout (input, suggestion list, buttons).
- An **`aria-live="polite"` region** announces each result in words, because
  colour and arrow glyphs are not sufficient for screen readers. Format:
  `"<item>, <distance>, <earlier|later> in the list"` — e.g.
  **"Brazil, 58, later in the list"**. On win: `"<item>, correct! Solved in N
  guesses."`; on give up: `"Gave up. The answer was <item>."`
- Respect `prefers-reduced-motion` for any row/entry animation.
- Row colour is a secondary signal; distance + direction text is the primary one.

## Persistence (localStorage, all `try/catch`)

- `baltoratora:guess:<catId>:game` — in-progress round (answer index + guesses)
  so a refresh resumes the same round.
- `baltoratora:guess:<catId>:stats` — see below.
- The answer index is stored client-side (a curious player could inspect it);
  acceptable for casual play.

### Stats (per category)
Tracked fields: `gamesPlayed`, `wins`, `gaveUp`, `totalGuessesOnWins`.
- `gamesPlayed` increments when a round ends (win or give up).
- **Average guesses = `totalGuessesOnWins / wins`** (shown on the win screen;
  guard divide-by-zero → show "—" when `wins === 0`).

## Testing (`lib/guess.test.ts`)

**Engine logic**
- `normalize`: case, accents (Côte → cote), punctuation, whitespace collapse.
- `sortedItems`: A–Z order by displayed canonical name; **sort order is stable
  under normalize** (no two items normalize equal → added test).
- `resolveGuess`: exact, alias, accented input, case-insensitive, invalid → null.
- `suggest`: **prefix matches ranked before substring matches**; respects limit
  (8); deduped; sorted within groups.
- `pickAnswer`: deterministic for a given `seed`; **respects `exclude` (never
  returns the excluded item)** in Unlimited; returns a member of `items`.
- `bucket`: boundary values at `ceil(0.05N)` and `ceil(0.15N)`; `0` → hit;
  scaling verified at two different N.
- `evaluateGuess`: distance, direction (up/down/hit) correct for items before,
  after, and equal to the answer.
- Duplicate detection helper (if extracted) / guess-counting rules.

**Data integrity**
- Every category: no two items normalize to the same value (no post-normalize
  dupes).
- Every alias resolves to a real canonical item in its category.
- Min size per category (Countries == 195; Animals/Fruits&Veg/Sports ≥ 150).
- Naming rules: no item begins with "The "; no item uses "St." in canonical
  form (Saint spelled out).
- **Capitals**: every capital maps to a country present in Countries; **no
  duplicate capitals**; Israel and Palestine are absent from Capitals but
  present in Countries. (Replaces the earlier "capitals count == countries
  count" check.)

## Open items / future
- Daily mode: add a date-derived `seed` to `pickAnswer` + "already solved today"
  UI. No engine rework needed.
- Component-level UI tests (jsdom/@testing-library) intentionally not added
  (dependency-build risk, per repo precedent).
```

## Decision log
1. Capitals exclude Israel & Palestine (contested; kids' audience) — both remain
   in Countries. Noted in comment + borderline summary.
2. Sort by displayed canonical name; no leading "The"; "Saint" spelled out;
   Ivory Coast canonical. Sort stability under normalize is tested.
3. Capitals derived from a country→capital map; integrity test = "every capital
   maps to a Country; no duplicate capitals" (not a count match).
4. Stats: gamesPlayed, wins, gaveUp, totalGuessesOnWins; avg = onWins / wins.
5. `suggest` ranks prefix before substring, limit 8.
6. `pickAnswer` takes an `exclude` to avoid immediate repeats; stays pure.
7. `aria-live` announces each result in words (item, distance, earlier/later).
8. Everything else as proposed: `/guess` route, % buckets, localStorage
   mid-game persistence.
