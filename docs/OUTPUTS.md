# Work Log

Outcomes appended by skills (newest at the bottom of each section as needed).

---

## 2026-10-19 — Guess game (subagent-driven-development)

**Branch:** `feat/guess-game` · **Spec:** `docs/superpowers/specs/2026-10-19-guess-game-design.md` · **Plan:** `docs/superpowers/plans/2026-10-19-guess-game.md`

New `/thinking` game: pick a category (Countries, Capital Cities, Animals, Fruits & Veg, Sports), guess the hidden item; each guess shows alphabetical index-distance + ▲/▼ direction, rows colour-bucketed by closeness; guess list always sorted A–Z. Unlimited mode; `pickAnswer` seed-ready for later Daily.

**Shipped:**
- `lib/guess.ts` — pure engine (normalize, sortedItems, bucket, resolveGuess, suggest, pickAnswer, evaluateGuess), fully TDD.
- `lib/guess-categories.ts` — 195 countries (193 UN + Vatican + Palestine), 193 capitals (Israel & Palestine excluded, kept in Countries) derived from `CAPITAL_OF`, 186 animals / 135 fruit&veg / 154 sports, + country & capital aliases.
- `components/GuessGame.tsx` — picker, play screen, autocomplete, localStorage resume + per-category stats, aria-live announcements.
- `app/guess/page.tsx` route + `/thinking` hub card + `app/globals.css` styles (design tokens).

**Verification:** 390 unit tests pass (incl. 22 data-integrity); `tsc --noEmit` clean; `eslint` 0 errors; `next build` OK (`/guess` static, 8.54 kB). Integration simulation 15/15 against real engine+data. Component passed an adversarial review (hardened: idempotent init effect, functional stats updater, single aria-live announcer).

**Outstanding:** visual mobile-width check at `/guess` (browser automation unavailable this session — delegated to Iqbal). Daily mode, leaderboard, multiplayer intentionally out of v1 scope.

---

## 2026-11-25 — Quote of the day (start-work + TDD)

**Branch:** `feat/quote-of-day` · no spec/plan doc (small additive feature, inline plan approved in chat)

Home page (`demo.baltoratora.my`) now shows a **"Quote of the day"** card directly below the Fun Fact and above the topic selector: a famous science / discovery / innovation quote with author + origin, stable for the day, with a ↻ button for another. Curated bundled list (no external API) — chosen over a quote API so attribution stays accurate and the card never fails to load; also means no Pages Function needed (pure client).

**Shipped:**
- `lib/quotes.ts` — `Quote` type, curated `QUOTES` set (52 quotes, globally diverse origins), + pure `indexForDay` / `randomIndexExcluding` / `quoteForDay` selectors (TDD).
- `lib/quotes.test.ts` — 10 tests: daily stability + rotation, refresh never repeats the current quote, data integrity (non-empty text/author, no duplicate texts).
- `components/QuoteOfDay.tsx` — `"use client"`, resolves the day's quote after mount (avoids static-export hydration mismatch, like FunFact); reuses the `.fact-refresh` button.
- `app/page.tsx` wiring + `app/globals.css` `.quote` block (shares the fun-fact card language, violet-tilted).

**Verification:** 626 unit tests pass (incl. 10 new); `tsc --noEmit` clean; `eslint` 0 errors (16 pre-existing warnings, none in new files); `next build` OK. Served HTML confirmed card placement (Fun fact → Quote → Topics) and quote data present in the shipped client chunk. Live visual screenshot NOT captured — the session's connected Chrome could not reach this host's localhost.

**Security:** N/A — no network/fetch, no user input, no access control, no sensitive data; quote text rendered as React-escaped children (no `dangerouslySetInnerHTML`).

**Outstanding:** live visual/mobile-width check of the rendered card (browser couldn't reach localhost this session — delegated to Iqbal). Not deployed (not merged to `main`).
