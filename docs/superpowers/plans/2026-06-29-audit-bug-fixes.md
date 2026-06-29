# Audit Bug-Fix Implementation Plan

> **For agentic workers:** Use TDD per task. Steps use checkbox (`- [ ]`) syntax. Each bug = failing test (where feasible) → fix → green → commit.

**Goal:** Fix all 17 confirmed bugs from the re-audit (6 Tier-1 gameplay/leaderboard, 11 Tier-2), then re-audit to confirm zero regressions — with special attention to gameplay correctness and leaderboard save.

**Architecture:** Where a bug's logic can be made pure, extract it into the relevant `lib/<game>.ts` module and cover it with a Vitest test (the codebase's existing, proven pattern — converts "untested component bug" into "tested lib logic"). Where a bug is irreducibly React-runtime (preventDefault, impure setState updater, timer/effect cleanup, phase state), fix it directly and verify via `next build` + a targeted browser check.

**Tech Stack:** Next 15 static export, React 19, TypeScript strict, Vitest 3. **No new test/runtime dependencies** (avoid repeating the recent Cloudflare `npm ci` / vite-7 dependency break). A fuller component-testing setup (jsdom + @testing-library/react) is recommended as a *separate* follow-up, not bundled here.

---

## Ground rules (apply to every task)

- **Branch:** all work on `fix/audit-bugs` off `main`.
- **TDD:** for extractable logic, write the failing Vitest test FIRST, watch it fail, then fix, then watch it pass. For runtime-only fixes, the "test" is `npx tsc --noEmit` + `next build` + a labeled browser check.
- **Phase gates:** after each tier, `npx vitest run` (all green) + `npx tsc --noEmit` (clean) + `npm run lint`.
- **Pre-merge gate (CF parity — the lesson from last time):** `npm ci` + `npm run build` must pass before pushing, plus a browser smoke test on the Cloudflare preview.
- **Commits:** one per bug (or tight group), conventional messages, `Co-Authored-By` trailer.
- **No "while I'm here" changes** — one root-cause fix per task (systematic-debugging Phase 4).

## Open design decisions (confirm before execution)

1. **Pacman "ghosts never chase" (Bug 6)** — fixing it means adding a real scatter↔chase phase scheduler (classic Pac-Man alternates ~7s scatter / ~20s chase). This is the **largest single change** (new behavior, not a one-liner). Plan assumes: **yes, fix it** with the classic fixed schedule.
2. **Leaderboard failure UX (Bug 2)** — on a failed save: **keep the modal open, keep the currently-shown scores (do not wipe), show an inline "Couldn't save — try again" and allow retry.** Plan assumes this behavior.
3. **Carrom uncovered-queen (Bug 7)** — **enforce the cover rule even when the Queen is the last coin** (no instant win until the Queen is resolved/covered). Plan assumes this.

---

# PHASE 1 — Tier 1 (6 bugs: gameplay + leaderboard)

### Task 1: Pacman ghost tunnel-wrap (Bug 1, Med-High)
**Files:** Modify `components/Pacman.tsx:444-469`; extract+test in `lib/pacman.ts` + `lib/pacman.test.ts`.
- Root cause: `nextTile` wraps the tile column at the tunnel, but `g.px` is then slid toward the far tile center across the whole maze (through walls); the px-wrap branch (467-469) is dead code.
- Fix: when an accepted ghost step wraps the column (|nextT.col − g.tile.col| > 1), snap `g.px,g.py` to the new tile's center instead of sliding (mirrors how `movePac` derives position from a wrapped px).
- TDD: add pure `ghostStepTile(tile, dir, walls)` (already `nextTile`) + a pure `isTunnelWrap(fromCol, toCol)` helper; test that a ghost at col 0 moving left lands logically at col 27 AND that `isTunnelWrap` flags it so the component snaps px. Failing test asserts current code would slide (px far from tile center); fix makes px == tile center.
- Verify: vitest + browser (watch a ghost cross the tunnel — it appears on the other side, not gliding through walls).

### Task 2: Leaderboard save wipe + score loss (Bug 2, Med) — TDD, highest-value
**Files:** Modify `lib/leaderboard.ts:68-80`, `components/GameLeaderboard.tsx:58-64` (+ small state/UI for error); Test `lib/leaderboard.test.ts`.
- Root cause: `submitScore` never checks `r.ok`; an error response (`{error}`, no `scores`) resolves to `[]`, so the caller `setScores([])` blanks the board and the score is lost (modal already closed).
- Fix: `submitScore` checks `r.ok`; on failure **throw** `Error("save failed")` (do not return `[]`). `save()` wraps in try/catch: on success `setScores(result)` + close modal; on failure keep modal open, keep existing `scores`, set an inline error message, keep `value`/`name` so the user can retry.
- TDD (failing test first): in `lib/leaderboard.test.ts`, mock `global.fetch`:
  - returns 200 `{scores:[...]}` → `submitScore` resolves to those scores.
  - returns 500 `{error:"x"}` → `submitScore` **rejects** (currently resolves to `[]` → test fails until fixed).
- Verify: vitest + browser (force a failure by temporarily pointing fetch at a 500 in devtools is optional; at minimum confirm happy path still works and tsc/build clean).

### Task 3: Checkers over-capture after mid-jump promotion (Bug 3, Med) — TDD via extracted predicate
**Files:** Modify `components/Checkers.tsx:36-53,218-239`; extract+test in `lib/checkers.ts` + `lib/checkers.test.ts`.
- Root cause: after a man's jump that lands on the king row, the component promotes it and then re-scans with `nextJumpTargets` as a **king** (backward diagonals), forcing an illegal extra capture — contradicting the lib engine's own king-row chain stop.
- Fix: make `applySingleJump` also report `promoted`; in the midJump-completion branch, if `promoted` (man just became king this jump), call `finishTurn(...)` and skip the `further` continuation.
- TDD: add pure `jumpChainContinues(board, r, c, piece, captured, justPromoted): boolean` in `lib/checkers.ts` that returns `false` when `justPromoted` (mirrors `jumpSeqs` king-row stop), else delegates to the existing further-jump scan. Test: man landing on row 0 with a backward-capturable enemy + `justPromoted=true` → `false`; an already-king with a further jump → `true`. Use this helper in the component.
- Verify: vitest + browser (set up a promotion-on-last-jump scenario; no forced extra king jump).

### Task 4: Simon premature-click false game-over (Bug 4, Med) — runtime fix, browser-verified
**Files:** Modify `components/Simon.tsx:146-157`.
- Root cause: in the `"complete"` branch, `phase` stays `"input"` during the 400ms inter-round gap while `seq` has already advanced and pads remain `disabled={phase!=="input"}` = enabled.
- Fix: at the start of the `"complete"` branch, `setPhase("showing")` (disables pads) before scheduling the next `flashSequence`; `flashSequence` already restores `phase` to `"input"` when the new sequence finishes.
- Verify: tsc + build + browser (finish a round, tap a pad immediately — no false Game Over; next sequence plays then input re-enables).

### Task 5: Checkers undo moveCount off-by-one (Bug 5, Med) — TDD via extracted helper
**Files:** Modify `components/Checkers.tsx:178-190`; extract+test in `lib/checkers.ts` + test.
- Root cause: single-player undo decrements `moveCount` by `undone` (counts BOTH the bot `turn:"b"` snap and the player `turn:"r"` snap), but only player moves increment `moveCount`.
- Fix: add pure `playerMovesInSnaps(snaps: {turn:"r"|"b"}[]): number` = count of `turn==="r"`; decrement `moveCount` by that for the popped snaps (single-player). Two-player path (−1) unchanged.
- TDD: test `playerMovesInSnaps([{turn:"b"},{turn:"r"}]) === 1`, `([{turn:"r"}]) === 1`, `([]) === 0`.
- Verify: vitest + browser (play 3 rounds, undo, confirm move counter drops by 1 not 2).

### Task 6: Pacman ghosts never chase (Bug 6, Med-Low) — largest change; TDD the scheduler
**Files:** Modify `components/Pacman.tsx` (game loop ~558-564, `resetActors`/respawn ~552); extract+test scheduler in `lib/pacman.ts` + test.
- Root cause: no scatter↔chase scheduler; `chase` only reachable via frightened-expiry; eaten ghosts respawn hardcoded to `"scatter"`.
- Fix: add pure `globalGhostPhase(levelElapsedSec): "scatter"|"chase"` implementing the classic wave schedule (e.g. scatter 7, chase 20, scatter 7, chase 20, scatter 5, chase 20, scatter 5, then chase forever). In the loop, track level-elapsed time, compute the current phase, and set every non-frightened, non-eaten ghost's mode to it; respawn eaten ghosts into the current phase.
- TDD: test `globalGhostPhase(0)==="scatter"`, `(8)==="chase"`, `(28)==="scatter"`, large t → `"chase"`.
- Verify: vitest + browser (ghosts pursue Pac-Man during normal play, not just after a power pellet).

**Phase-1 gate:** `npx vitest run` green, `npx tsc --noEmit` clean, `npm run lint` 0 errors. Commit each task. Then checkpoint with user.

---

# PHASE 2 — Tier 2 (11 bugs: edge cases / cosmetic / dev-only)

### Task 7: Carrom uncovered-queen instant win (Bug 7) — TDD predicate
**Files:** `components/Carrom.tsx:73,222,248-275`; extract `carromWon(...)` pure + test in `lib/physics.ts`/a small carrom helper or inline lib.
- Fix: win requires `coinsLeft===0` AND queen resolved (not in uncovered-limbo / cover not pending). Add a pure predicate; test last-coin-is-uncovered-queen → not won; queen covered then cleared → won.
- Verify: vitest + browser.

### Task 8: Puzzle Bobble stale level-complete timer (Bug 8) — runtime
**Files:** `components/PuzzleBobble.tsx:295-308,374`.
- Fix: store the level-advance `setTimeout` id in a ref; clear it in `newGame()` and in the unmount cleanup. Verify: tsc+build+browser (clear a level, click New within 2s → stays on level 1).

### Task 9: Pool cross-frame scratch on 8-ball (Bug 9) — TDD predicate
**Files:** `components/Pool.tsx:230-247`; extract `pool8Result(potted8, scratched): "won"|"lost"` pure + test in a pool helper.
- Fix: defer the 8-ball win/lose decision until `allStopped`, then evaluate `scratchRef` once. Test predicate: potted8 && scratched → "lost"; potted8 && !scratched → "won".
- Verify: vitest + browser.

### Task 10: Wordle impure setState updater (Bug 10, dev) — runtime
**Files:** `components/WordGame.tsx:96-107`.
- Fix: read `current` from state, validate OUTSIDE the updater, then call `setGuesses(...)` and `setCurrent("")` as sibling top-level updates (pure updater). Verify: `next dev` browser — a submitted guess fills exactly one row.

### Task 11: 2048 impure setState updater (Bug 11, benign) — runtime
**Files:** `components/Game2048.tsx:91-107`.
- Fix: compute the spawned grid (with rng) BEFORE `setState`; updater becomes pure. Verify: tsc+build; game still spawns one tile per move.

### Task 12: Sudoku arrow keys don't preventDefault (Bug 12) — runtime, 1-line
**Files:** `components/Sudoku.tsx:368-374`. Fix: `e.preventDefault()` when an arrow consumes a selected cell. Verify: browser (no page scroll).

### Task 13: 2048 arrow preventDefault on input focus (Bug 13) — runtime, 1-line
**Files:** `components/Game2048.tsx:110-119`. Fix: skip handling when `e.target` is INPUT/TEXTAREA/contentEditable (mirror `Sokoban.tsx:144-145`). Verify: browser (can edit name field with arrows).

### Task 14: Sokoban "New best!" badge (Bug 14, cosmetic) — runtime
**Files:** `components/Sokoban.tsx:88-97,281`. Fix: capture `wasNewBest` in state at solve time (compare moves to the OLD best before the recording effect overwrites it); treat first-ever solve as a record. Verify: browser.

### Task 15: Worker DO move payload validation (Bug 15) — TDD via roomProtocol
**Files:** `worker/src/index.ts:111-122`; add validator to `lib/roomProtocol.ts` + test.
- Fix: add `isValidMove(msg): boolean` (requires `t==="move"` with a present, bounded-size `state`); ignore malformed `move`/`reset` like a bad JSON parse (don't let `put("state", undefined)` throw). Test the validator. Verify: vitest + tsc.

### Task 16: useRoom no auto-reconnect + stale-seat window (Bug 16) — runtime
**Files:** `lib/useRoom.ts:45-98`.
- Fix: on unexpected `onclose` (not a deliberate unmount/`code=null`), attempt a bounded auto-reconnect with backoff (e.g. up to 3 tries, 1s/2s/4s). Keep cleanup correct. (Stale-seat is partly server-side; reconnect closes most of the gap.) Verify: tsc+build+browser (kill the WS in devtools → it reconnects).
- NOTE: if this proves risky, it can be deferred (multiplayer is 2-seat hobby) — flag at checkpoint.

### Task 17: FunFact initial/refresh race (Bug 17) — runtime
**Files:** `components/FunFact.tsx:12-31`. Fix: add a `cancelled` flag (mirror `PaperOfDay`) and ignore a stale `load(false)` resolution after a `load(true)`; guard the refresh against the initial load. Verify: tsc+build+browser.

**Phase-2 gate:** full `npx vitest run` green, `npx tsc --noEmit` clean, `npm run lint` 0 errors.

---

# PHASE 3 — Re-audit + ship

### Task 18: Re-audit (confirm fixed + no regressions)
- Re-run the 7 systematic-debugging bug-hunt agents focused on the CHANGED files + a fresh sweep, confirming: each Tier-1/Tier-2 bug is gone, and no new bug was introduced by the fixes.
- Full `npx vitest run`, `npx tsc --noEmit`, `npm run lint`.

### Task 19: CF-parity verify + ship
- `npm ci` + `npm run build` locally (the dependency-parity gate).
- Merge `fix/audit-bugs` → `main`? No — first push branch → smoke-test the Cloudflare **preview** (browser console clean, a couple of fixed games behave, leaderboard save works) → then merge to `main` for production (user-gated, per the established flow).
- Confirm live `demo.baltoratora.my` after deploy.

---

## Self-review notes
- Every Tier-1 bug has a concrete fix + verification method. Bugs 2,3,5,6 get real Vitest coverage via extracted pure helpers (hardening the previously-untested layer). Bugs 1,4 + most Tier-2 are runtime fixes verified by build + browser (labeled).
- No new dependencies. No SEO/canonical work (out of scope). No "while I'm here" refactors.
- Risk flags surfaced for the two larger items (Bug 6 scheduler, Bug 16 reconnect).
