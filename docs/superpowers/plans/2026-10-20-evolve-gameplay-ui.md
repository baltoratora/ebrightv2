# Evolve Gameplay — `/evolve` UI (M4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the complete, playable `/evolve` experience on top of the validated simulation engine (M0–M3), driving it **only** through the shared pure reducers (`applyAction`) and `tick`, with four period maps, start/resume, live spreading, creature adaptations, region inspector, trait shop, decision modals, pause/speed controls, Dominate objectives, and an end-of-run debrief.

**Architecture:** A thin server wrapper `app/evolve/page.tsx` → a `"use client"` `EvolveGame` root. All game state is a single `SimState` owned by a `useEvolveGame` hook that (a) runs a **fixed-step** loop over `tick()` via a `requestAnimationFrame` accumulator scaled by the speed setting, (b) dispatches every player action through `applyAction`, (c) autosaves to `localStorage` via `save.ts`, and (d) pauses on hidden tab. UI components are **pure presentational** — they read `SimState` + selectors and emit actions; they contain no game rules. Region "why/what-helps" logic lives in a new **pure engine selector** (`inspect.ts`), not in the components.

**Tech stack:** Next.js (static export, the repo's `GAMES` pattern), React client components, Tailwind-free scoped CSS via existing `--evo-*` tokens in `globals.css`, Vitest for hook/selector logic, claude-in-chrome MCP for browser tests. No new npm dependencies.

**Depends on (done):** `lib/evolution/sim/*` (state, tick, actions, modes, economy, save, headless), `lib/evolution/maps/paleo.ts` (4 maps), art components `components/evolution/{Environment,Creature,RegionMap,TraitIcon,SampleHud}.tsx`.

**Source of truth:** `docs/superpowers/specs/2026-10-20-evolve-gameplay-design.md` (Rev 3.3). UI requirements: §10; decision/pause semantics: §0, §7.2; modes/objectives: §8; save: §9.

---

## Guardrails carried in

- **Reducers only.** The UI never mutates `SimState` directly and never re-implements a rule — every change is `applyAction(state, action, NORMAL)` or a `tick`. A lint-level review step checks this.
- **Determinism preserved.** The rAF loop accumulates `realΔt × speed` and consumes it in whole `SIM_DT` steps; rendering interpolates but never drives sim state. Speed changes step *count per second*, never step size.
- **Art is NOT approved.** Reuse the existing art components, but treat their appearance as provisional; the visual-inspection step (M4.5) surfaces issues for Iqbal rather than assuming sign-off.
- **Science stays accessible but unobtrusive.** Every science detail renders through a reusable expandable `ScienceNote` (`<details>`), so the main screen stays readable and immersive.
- **No merge/push.** Feature branch `feat/evolve-gameplay` only.

---

## Milestones

| Milestone | Scope | Exit |
|---|---|---|
| **M4.0 Engine host + shell** | pure inspect selector; `useEvolveGame` hook (fixed-step loop, actions, autosave, tab-pause); `/evolve` route; StartScreen (mode/difficulty/how-to/resume) | hook unit tests green; route renders; `tsc`/`lint` clean |
| **M4.1 World rendering** | interactive `PaleoMap` (4 datasets, region nodes + selection); `Environment` + `Creature` per era reflecting owned adaptations; live population/spread readouts | map selectable; creature updates with traits |
| **M4.2 HUD + side panels** | `GameHud` (pop, EP, period+date, speed/pause, Dominate tracker); `RegionInspector` (status, limiting factor, which adaptation helps); `TraitShop` (gated, costs, trade-offs, science notes) | panels read engine + inspect selector |
| **M4.3 Decision modals** | `DecisionModal` for niche / mutation / event / extinction / transition; auto-pause handling; `ScienceNote` expandables | a full run is clickable end-to-end |
| **M4.4 Debrief + hub** | `EndDebrief`; `/thinking` GAMES entry + hub card; reduced-motion; a11y | links from `/thinking`; keyboard-operable |
| **M4.5 Browser tests + visual review** | claude-in-chrome: complete run, pause/hidden-tab, save/resume, desktop+mobile layouts; capture screenshots; present to Iqbal | screenshots captured; gates green; **handoff for approval** |

Each milestone ends with `npm test && npx tsc --noEmit && npm run lint` (and `npm run build` at M4.4/M4.5, dev server stopped first) + a commit.

---

## File structure

```
app/evolve/page.tsx                     thin server wrapper (metadata + <EvolveGame/>)
app/thinking/page.tsx                   MODIFY: add Evolve to GAMES
app/globals.css                         MODIFY: scoped run-screen styles (--evo-*)
lib/evolution/sim/inspect.ts            NEW pure selector: region status + limiting factor + suggestion; period date label
lib/evolution/sim/inspect.test.ts
components/evolution/
  EvolveGame.tsx        "use client" root: layout + wires hook to components
  useEvolveGame.ts      engine host: fixed-step rAF loop, dispatch, autosave, tab-pause
  useEvolveGame.test.ts hook logic with an injected clock (no real rAF)
  StartScreen.tsx       mode + difficulty + one-screen how-to + Resume
  GameHud.tsx           population, EP, period+Ma, speed/pause, Dominate tracker
  PaleoMap.tsx          interactive per-period map (continents + region nodes + selection)
  RegionInspector.tsx   selected-region status + limiting factor + which adaptation helps
  TraitShop.tsx         period-gated shop, costs, trade-offs, ScienceNote per trait
  DecisionModal.tsx     niche/mutation/event/extinction/transition (auto-pause)
  EndDebrief.tsx        outcome + what happened + what to try next
  ScienceNote.tsx       reusable accessible <details> expandable
```

---

## M4.0 — Engine host + shell

### Task 1: Pure region-inspection selector

**Files:** Create `lib/evolution/sim/inspect.ts` + `inspect.test.ts`.

Keeps "why is this region thriving/declining/inaccessible and what would help" out of the components. Uses `fitness`, `regionState`, `GAMEPLAY_TRAITS`, era data.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { inspectRegion, periodLabel } from "./inspect";
import { initialState } from "./state";
import { NORMAL } from "./difficulty";

describe("inspectRegion", () => {
  it("flags an inaccessible region and the period it opens", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 }); // cambrian
    const r = inspectRegion(s, "deepAnoxic", NORMAL);
    expect(r.status).toBe("inaccessible");
    expect(r.detail.toLowerCase()).toContain("ordovician");
  });
  it("names the limiting factor + a helpful adaptation for a poor-fit region", () => {
    const s = { ...initialState({ mode: "survival", rngSeed: 1 }), clock: { period: "ordovician" as const, elapsedInPeriod: 0, totalElapsed: 0 } };
    const r = inspectRegion(s, "deepAnoxic", NORMAL);
    expect(r.suggestion).toContain("Hypoxia");
  });
});

describe("periodLabel", () => {
  it("shows the period name and Ma span", () => {
    expect(periodLabel("cambrian")).toMatch(/Cambrian/);
    expect(periodLabel("cambrian")).toMatch(/Ma/);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** `inspectRegion(state, id, params) → { status: OccState; thriving: boolean; detail: string; suggestion: string | null }` — availability + occ from state; if inaccessible, say which period/edge-trait opens it (from `REGIONS`/`EDGES`); else compute `fitness`, find the largest penalty contributor (predation/oxygen/salinity/pelagic/exposure/active penalty) → `limitingFactor` + the trait that mitigates it (`GAMEPLAY_TRAITS`). `periodLabel(period)` reads `ERAS` (base/top Ma) from `lib/evolution/eras/eras.ts`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-ui): pure region-inspection selector"`.

### Task 2: `useEvolveGame` host hook (fixed-step loop, actions, autosave, tab-pause)

**Files:** Create `components/evolution/useEvolveGame.ts` + `useEvolveGame.test.ts`.

- [ ] **Step 1: Failing test** (drive with an injected step function, not real rAF)

```typescript
import { describe, it, expect } from "vitest";
import { createGame } from "./useEvolveGame"; // framework-free core the hook wraps

describe("createGame core", () => {
  it("does not advance while a decision is pending", () => {
    const g = createGame({ mode: "survival", seed: 1 });
    const before = g.state.clock.totalElapsed;
    g.advance(1000); // 1s of real time at 1x
    expect(g.state.clock.totalElapsed).toBe(before); // niche decision still pending
  });
  it("advances in whole SIM_DT steps once resolved + resumed", () => {
    const g = createGame({ mode: "survival", seed: 1 });
    g.dispatch({ type: "resolveDecision", choice: "filterFeeding" });
    g.dispatch({ type: "resume" });
    g.advance(1000); // 1s → 4 steps of 0.25
    expect(g.state.clock.totalElapsed).toBeCloseTo(1.0);
  });
  it("speed multiplies steps per real second, not step size", () => {
    const g = createGame({ mode: "survival", seed: 1 });
    g.dispatch({ type: "resolveDecision", choice: "filterFeeding" });
    g.dispatch({ type: "resume" });
    g.setSpeed(2);
    g.advance(1000);
    expect(g.state.clock.totalElapsed).toBeCloseTo(2.0);
  });
  it("autosaves and resumes bit-exactly", () => {
    const g = createGame({ mode: "dominate", seed: 3 });
    g.dispatch({ type: "resolveDecision", choice: "benthicGrazing" });
    g.dispatch({ type: "resume" });
    g.advance(500);
    const saved = g.serialize();
    const g2 = createGame({ resume: saved });
    expect(g2.state).toEqual(g.state);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** a framework-free `createGame(opts)` returning `{ state, dispatch(action), advance(realMs), setSpeed(n), pause(), serialize() }`:
  - holds `SimState` + a fractional step accumulator; `advance(ms)` adds `ms/1000 × SIM_DT_steps_per_sec × speed` and consumes whole `SIM_DT` steps via `tick(state, makeRng(seed, cursor), NORMAL)`, stopping early if paused/pending/terminal;
  - `dispatch` routes through `applyAction`;
  - `serialize()` = `save.serialize(state)`, `resume` = `save.deserialize`.
  Then the `useEvolveGame` hook wraps `createGame` with `useState`/`useRef`, a `requestAnimationFrame` loop calling `advance(delta)`, a `visibilitychange` listener calling `pause()` when hidden, and an autosave effect (on pause/decision/interval) writing `localStorage["evolve:save"]`.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-ui): useEvolveGame host hook (fixed-step loop, autosave, tab-pause)"`.

### Task 3: Route + StartScreen + EvolveGame shell

**Files:** Create `app/evolve/page.tsx`, `components/evolution/EvolveGame.tsx`, `StartScreen.tsx`.

- [ ] **Step 1:** `app/evolve/page.tsx` — thin server component exporting metadata and rendering `<EvolveGame/>` (follows the repo game pattern).
- [ ] **Step 2:** `StartScreen.tsx` — mode (Survival/Dominate) + difficulty (Normal, with Relaxed/Hard shown disabled "coming soon"), a one-screen how-to, and a **Resume** button shown when `localStorage["evolve:save"]` validates (`deserialize(...).state` non-null). Emits `onStart(mode)` / `onResume(save)`.
- [ ] **Step 3:** `EvolveGame.tsx` — `"use client"`; shows `StartScreen` until a game exists, else mounts `useEvolveGame` and lays out map + HUD + panels (panels are placeholders until M4.1–M4.3). No game logic here.
- [ ] **Step 4:** Manual check — `npm run dev`, open `/evolve`, Start a run, confirm the clock advances and pausing stops it. (Dev server will be stopped before any build.)
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-ui): /evolve route, StartScreen, EvolveGame shell"`.

- [ ] **M4.0 gate:** `npm test && npx tsc --noEmit && npm run lint` clean.

---

## M4.1 — World rendering

### Task 4: Interactive `PaleoMap`

**Files:** Create `components/evolution/PaleoMap.tsx`. Reuse `RegionMap.tsx` visual language; render from `PALEO_MAPS[period]`.

- [ ] **Step 1:** Render continents (ellipses from `PALEO_MAPS[period].continents`) + a selectable node per `placements` region, coloured by `state.regions[id].occ` (occupied/colonizing/inaccessible) with the population shown. Props: `{ state, selected, onSelect(regionId) }`. Accessible buttons with labels + visible focus; `pointer-events` only on nodes.
- [ ] **Step 2:** Manual check at `/evolve` — switching periods swaps the map; clicking a region selects it.
- [ ] **Step 3: Commit** — `git commit -am "feat(evolve-ui): interactive per-period PaleoMap"`.

### Task 5: Creature + Environment reflect era and owned adaptations

**Files:** `EvolveGame.tsx` MODIFY to mount `Environment` (current era) and `Creature` with the form for `state.clock.period` and the owned art-backed traits (armour/jaws/paired-fins/lobed-limbs) derived from `state.traits`.

- [ ] **Step 1:** Map `state.clock.period` → era form id and `state.traits` → the art trait toggles `Creature` expects; render inside `Environment`.
- [ ] **Step 2:** Manual check — buying paired-fins/armour visibly changes the creature; changing period changes environment + form.
- [ ] **Step 3: Commit** — `git commit -am "feat(evolve-ui): creature + environment reflect era and adaptations"`.

- [ ] **M4.1 gate:** gates clean; commit.

---

## M4.2 — HUD + side panels

### Task 6: `GameHud` (pop, EP, period+Ma, speed/pause, Dominate tracker)

**Files:** Create `components/evolution/GameHud.tsx`.

- [ ] **Step 1:** Show `totalPop(state)`, `state.ep`, `periodLabel(period)` (Ma), occupied count. Speed buttons (1×/2×/3×) → `setSpeed`; Pause/Resume toggle → dispatch `pause`/`resume`. In Dominate, a **tracker**: `occupiedCount / dominateTargets[period]`, countdown = `eraBudgetSec[period] − elapsedInPeriod`, and an early "falling behind" warning when projected to miss. Promote visual cues from `SampleHud` but bind to real state.
- [ ] **Step 2:** Manual check — HUD numbers update live; speed/pause work; Dominate tracker counts down.
- [ ] **Step 3: Commit** — `git commit -am "feat(evolve-ui): GameHud with speed/pause + Dominate tracker"`.

### Task 7: `RegionInspector` (status, limiting factor, which adaptation helps)

**Files:** Create `components/evolution/RegionInspector.tsx`. Consumes `inspectRegion` (Task 1).

- [ ] **Step 1:** For the selected region, show status, thriving/declining, the **named limiting factor**, and the **suggested adaptation** (all from `inspectRegion`). A `ScienceNote` (Task 10) expandable carries the sourced detail; the headline stays short.
- [ ] **Step 2:** Manual check — selecting Deep Anoxic without hypoxia shows "too little oxygen — Hypoxia tolerance would help".
- [ ] **Step 3: Commit** — `git commit -am "feat(evolve-ui): RegionInspector (limiting factor + suggestion)"`.

### Task 8: `TraitShop` (period-gated, costs, trade-offs, science notes)

**Files:** Create `components/evolution/TraitShop.tsx`.

- [ ] **Step 1:** List `GAMEPLAY_TRAITS` unlocked for `state.clock.period`; each row: name, cost (`NORMAL.traitCost`), trade-off, Buy button that dispatches `{type:"buyTrait", trait}` (disabled when unaffordable/owned/exclusive-conflict — mirror `applyAction` validation for display only). A `ScienceNote` per trait carries the earliest-evidence/diversification ledger. Reproduction r/K shown as an exclusive pair.
- [ ] **Step 2:** Manual check — buying deducts EP; locked traits hidden/greyed; exclusive pair enforced by the engine (error path no-ops).
- [ ] **Step 3: Commit** — `git commit -am "feat(evolve-ui): TraitShop (gated, costs, trade-offs, science notes)"`.

- [ ] **M4.2 gate:** gates clean; commit.

---

## M4.3 — Decision modals

### Task 9: `DecisionModal` (all pending-decision kinds, auto-pause)

**Files:** Create `components/evolution/DecisionModal.tsx`.

- [ ] **Step 1:** When `state.pendingDecision` is set, render a modal by kind:
  - **niche** → two choices → `resolveDecision(choice)`;
  - **mutation** → the exact `options` (3) as "adopt" buttons + a "Decline (+EP)" button → `resolveDecision(choice|null)`;
  - **event / extinctionBriefing** → the `context` + (if a shock) the `lastShockReport` loss, with an **Acknowledge** button → `resolveDecision(null)`; a `ScienceNote` carries sources (ordinary vs Big Five);
  - **transition** → "Enter the <next period>" → `resolveDecision(null)`.
  After resolving, a **Resume** affordance (the modal closes but the game stays paused until the player resumes — matches engine semantics). Keyboard-operable; focus-trapped; no dialog-triggering of native `alert`.
- [ ] **Step 2:** Manual check — a full run is now clickable: niche → play → mutation offers → Hirnantian briefing → transition → Devonian pulses → end.
- [ ] **Step 3: Commit** — `git commit -am "feat(evolve-ui): DecisionModal for all pending-decision kinds"`.

### Task 10: `ScienceNote` reusable expandable

**Files:** Create `components/evolution/ScienceNote.tsx`.

- [ ] **Step 1:** A `<details><summary>` accessible disclosure (`Science note`) that keeps content collapsed by default so the main screen stays immersive; honours `prefers-reduced-motion`. Used by inspector, shop, and modals.
- [ ] **Step 2: Commit** — `git commit -am "feat(evolve-ui): ScienceNote expandable"`.

- [ ] **M4.3 gate:** gates clean; commit.

---

## M4.4 — Debrief + hub

### Task 11: `EndDebrief`

**Files:** Create `components/evolution/EndDebrief.tsx`.

- [ ] **Step 1:** On `state.status !== "running"`, show the `outcome` (won/lost + cause), a short "what happened" (period reached, regions occupied, key shocks survived/lost from `firedShocks`), and "what could help next time" (encouraging, derived from the cause — e.g. missed target → spread earlier; extinction in Devonian → buy hypoxia or a freshwater refuge). Buttons: Play again / Back to Thinking.
- [ ] **Step 2: Commit** — `git commit -am "feat(evolve-ui): EndDebrief"`.

### Task 12: `/thinking` entry + styles

**Files:** MODIFY `app/thinking/page.tsx` (add Evolve to `GAMES`), `app/globals.css` (run-screen scoped styles).

- [ ] **Step 1:** Add an Evolve card to the `GAMES` array (title, blurb, route `/evolve`) per the repo convention.
- [ ] **Step 2:** Add scoped run-screen layout styles using existing `--evo-*` tokens; desktop two-column (map + panels) and a mobile single-column stack; `prefers-reduced-motion` disables ambient motion.
- [ ] **Step 3:** `npm run build` (dev server stopped first) → confirm `/evolve` is statically generated.
- [ ] **Step 4: Commit** — `git commit -am "feat(evolve-ui): /thinking entry + run-screen styles"`.

- [ ] **M4.4 gate:** `npm test && npx tsc --noEmit && npm run lint && npm run build` clean.

---

## M4.5 — Browser tests + visual review

Uses claude-in-chrome MCP against `npm run dev` (`http://localhost:3000/evolve`). Each is a scripted check; capture screenshots to `tmp-shots/` (git-ignored).

### Task 13: Complete-run browser test
- [ ] Start Dominate/Normal, play through: resolve niche, let it run at 3×, adopt mutations, acknowledge the Hirnantian + both Devonian pulses, meet targets, reach the EndDebrief. Assert the debrief shows a terminal outcome. Capture key frames.

### Task 14: Pause + hidden-tab behaviour
- [ ] Verify the clock halts on Pause and on tab-hide (dispatch `visibilitychange`), and resumes only on explicit Resume. Assert `totalElapsed` is unchanged across a hidden interval.

### Task 15: Save/resume across reload
- [ ] Mid-run, reload `/evolve`; assert the StartScreen offers Resume and resuming restores the same period/EP/regions (no duplicated grants, no re-rolled open offer — relies on persisted `claimedGrants`/`pendingDecision`).

### Task 16: Desktop + mobile layouts + a11y
- [ ] Screenshot at 1280×900 and 390×844; verify the two-column→single-column layout, readable HUD, reachable controls, visible focus, and that `ScienceNote`s are collapsed by default. Verify reduced-motion renders resting frames.

### Task 17: Visual inspection + handoff
- [ ] View the captured desktop + mobile screenshots; list any layout/art issues. **Stop the dev server before the final `npm run build`; report whether it is restarted.** Present screenshots + the exact preview URL to Iqbal. **Do NOT treat the art as approved** — this is a review handoff, not sign-off.

- [ ] **M4.5 gate / completion:** all gates green; screenshots captured and presented; await Iqbal's review. Then the finishing-a-development-branch skill (merge/PR decision) — only on Iqbal's go.

---

## Self-review (plan author)

**Spec coverage (§10 + requested scope):** four maps → Task 4; start/resume → Tasks 2,3,15; live spreading → Tasks 2,4,6; creature adaptations → Task 5; region inspector → Tasks 1,7; trait shop → Task 8; decision modals → Task 9; pause/speed → Tasks 2,6; Dominate objectives → Task 6; end-of-run debrief → Task 11; expandable science notes → Task 10 (used by 7,8,9); shared reducers → enforced in Tasks 2,3 and the guardrails; browser tests (complete run, pause/hidden-tab, save/resume, desktop/mobile) → Tasks 13–16; visual inspection before handoff → Task 17. **No gaps.**

**Placeholder scan:** none — component tasks give concrete props/contracts and the two logic-heavy pieces (`inspect.ts`, `createGame`) have full test specs. UI visual styling is iterative by nature but each task has a concrete acceptance check.

**Type consistency:** `createGame`/`dispatch`/`advance`/`setSpeed`/`serialize`, `inspectRegion`/`periodLabel`, `Action` (from `actions.ts`), `SimState` selectors (`totalPop`/`occupiedCount`) are used consistently; all actions go through the existing `applyAction` signature.

---

**Approval gate:** This plan is presented for Iqbal's approval **before** any UI implementation. On approval, pick Subagent-Driven or Inline execution. Art approval remains a separate, still-pending track; M4.5 is a review handoff, not sign-off. No merge/push.
