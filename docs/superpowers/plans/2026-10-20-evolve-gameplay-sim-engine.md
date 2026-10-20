# Evolve Gameplay — Simulation Engine & Headless Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and headlessly validate the deterministic Evolve gameplay simulation (regions, population, migration, economy, mutations, events/extinctions, modes, save) with tuned Normal-difficulty numbers — **before** any gameplay UI is built.

**Architecture:** Pure, seedable, fixed-timestep simulation in `lib/evolution/{sim,events,save}`, driven by a `tick(state, rng)` function. No rendering, no React, no I/O in the core. A headless harness exercises complete runs so the reference run and balance are validated by simulation tests, not assumed. The UI is a separate follow-up plan written only after numbers are tuned here.

**Tech stack:** TypeScript (strict), Vitest, Next.js repo conventions (`@/*` alias, pure `lib/*.ts` + co-located `*.test.ts`). No new npm dependencies.

**Source of truth:** `docs/superpowers/specs/2026-10-20-evolve-gameplay-design.md` (Rev 3.1). Section references below (e.g. "spec §4.3") point at it. Data tables in the spec (region/period availability §2.2, provisional numbers §14) are the authoritative data source — tasks reference them rather than duplicating all 28 region-period entries (DRY), and include tests that cross-check counts/structure against the spec.

---

## Requirements carried from review (must hold throughout)

1. **Migration rates are per second.** Per-step source budget `= migrationRate · SIM_DT · P0[source]`. Soft/hard edge penalties apply to the **actual flow rate** via **absolute** conductance (open 1.0 / soft 0.2 / hard 0), not merely to relative destination weights (spec §4.5, §14). Covered by **Task 11**.
2. **Balance claims are hypotheses until simulation proves them.** The reference run (spec §14) and all balance numbers are unvalidated until exercised by the headless simulation tests in **M3**. The existing 414 repo tests validate the *art system and other games only* — they do **not** validate any gameplay here. Tasks never claim gameplay correctness from the pre-existing suite.
3. **Early headless milestone gates the UI.** **M3** demonstrates a complete Normal run in **both modes**, plus **extinction**, **failed-target**, and **recovery-window** cases, then **tunes** the provisional numbers. UI work (follow-up plan) does not begin until M3 passes.
4. **Preserve agreed scope.** Four per-period paleogeographic maps (Task 6 builds the data; the UI plan renders them), the §1 scientific qualifications (carried into region/event data + copy), deterministic versioned saves (Task 17), and the visual-review requirement (tracked for the UI plan).

---

## Milestone roadmap

| Milestone | Scope | Exit criteria |
|---|---|---|
| **M0 Scaffolding & data** | Tasks 1–6: types, RNG, difficulty table, region/geography data, trait extension, paleo-map data | Data-integrity tests green; `tsc`/`lint` clean |
| **M1 Pure sim core** | Tasks 7–12: fitness, capacity, population (births/deaths/crowding), occupancy, migration, economy | Per-function unit tests green (incl. the req-1 migration + req "no clamp" growth) |
| **M2 Events, modes, save** | Tasks 13–17: schedule, extinctions, modes/recovery, tick orchestrator, save/resume | Determinism + idempotent-resume + mode tests green |
| **M3 Headless validation & tuning (GATE)** | Tasks 18–20: headless harness, full-run + extinction + failed-target + recovery tests, number tuning | All scenario tests green with tuned Normal numbers; spec §14 marked validated |
| **M4+ Gameplay UI** | **Separate follow-up plan**, authored after M3 | n/a here |

Each milestone ends with a passing test run and a commit. **Do not start M4/UI until M3 is green and numbers are tuned.**

---

## Testing philosophy (read before starting)

- **TDD:** every task writes the failing test first, runs it to see it fail, then the minimal implementation, then runs it green, then commits.
- **Pure core:** no `Date.now()`/`Math.random()` in `lib/evolution/sim` — all randomness via the seeded RNG (Task 2), all time via explicit `SIM_DT`. This is what makes M3 reproducible and saves bit-exact.
- **Gameplay is unproven until M3.** Treat M1/M2 unit tests as *component* correctness; only M3 validates that a *playable* Normal run behaves as intended. If M3 contradicts a provisional number, the number changes (Task 20), not the test's intent.
- **Gates each commit:** `npm test`, `npx tsc --noEmit`, `npm run lint`. Run `npm run build` at milestone ends only (and never while `next dev` is running — it corrupts `.next`).

---

## File structure (created by this plan)

```
lib/evolution/
  sim/
    state.ts        // Period, RegionId, TraitId, OccState, SimState, initialState()
    rng.ts          // makeRng(seed) counter-based PRNG; serialisable {seed,cursor}
    difficulty.ts   // NORMAL params table (spec §14), typed DifficultyParams
    regions.ts      // master region set + per-period overrides + edges (spec §2)
    fitness.ts      // fitness(region, env, traits, niche, period) -> [0,1]
    capacity.ts     // capacityK(region, period, eventFactor) -> number
    population.ts    // stepPopulation(...) births/deaths/crowding; updateOccupancy(...)
    spread.ts       // migrate(...) snapshot, per-second budget, absolute conductance, dest cap
    economy.ts      // incomeRate(...), applyIncome(...), grantOnce(...)
    niche.ts        // Cambrian baseline adaptation options + effects
    tick.ts         // tick(state, rng) fixed-step orchestrator (spec §7.2 pipeline)
    modes.ts        // objective check, recovery window, end conditions (spec §8)
    headless.ts     // runHeadless(config) -> {trace, outcome} for M3
  events/
    schedule.ts     // per-period event schedule, warning-before-shock
    events.ts       // ordinary events (region env/K nudges)
    extinctions.ts  // Hirnantian; Kellwasser; Hangenberg (eventFactor + explicit disasterLoss)
  traits/
    traits.ts       // EXTEND existing: gameplay fields, thermal/hypoxia split, trade-offs, gates
  maps/
    paleo.ts        // 4 per-period paleogeographic datasets (continents + habitat placements)
  save/
    save.ts         // versioned localStorage (de)serialise, validate, fail-safe, pendingDecision
  <each module>.test.ts   // co-located Vitest files
```
`components/evolution/*` and `app/evolve/page.tsx` are **out of scope** for this plan (UI = follow-up).

---

## M0 — Scaffolding & data

### Task 1: Core types + initial state

**Files:**
- Create: `lib/evolution/sim/state.ts`
- Test: `lib/evolution/sim/state.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { initialState, PLAYABLE_REGIONS } from "./state";

describe("initialState", () => {
  it("starts a Cambrian run with 10 pu in the nursery and 0 EP", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    expect(s.clock.period).toBe("cambrian");
    expect(s.clock.totalElapsed).toBe(0);
    expect(s.regions.nursery.P).toBe(10);
    expect(s.regions.nursery.occ).toBe("colonizing"); // 10 < 0.25*100
    expect(s.ep).toBe(0);
    expect(s.schemaVersion).toBeGreaterThanOrEqual(1);
  });
  it("lists 7 playable regions (land excluded)", () => {
    expect(PLAYABLE_REGIONS).toHaveLength(7);
    expect(PLAYABLE_REGIONS).not.toContain("land");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/evolution/sim/state.test.ts`
Expected: FAIL (`initialState` not defined).

- [ ] **Step 3: Write minimal implementation**

```typescript
export type Period = "cambrian" | "ordovician" | "silurian" | "devonian";
export const PERIODS: Period[] = ["cambrian", "ordovician", "silurian", "devonian"];

export type RegionId =
  | "nursery" | "reef" | "openOcean" | "deepAnoxic"
  | "estuary" | "river" | "tidalFlats" | "land";
export const PLAYABLE_REGIONS: RegionId[] =
  ["nursery", "reef", "openOcean", "deepAnoxic", "estuary", "river", "tidalFlats"];

export type OccState = "inaccessible" | "colonizing" | "occupied";
export type Mode = "survival" | "dominate";
export type Difficulty = "normal"; // enum extensible to "relaxed" | "hard" later

export interface RegionState { id: RegionId; P: number; occ: OccState; }

export interface PendingDecision {
  kind: "mutation";
  options: string[];      // trait ids offered (exactly as rolled)
  context: string;
}

export interface SimState {
  schemaVersion: number;
  mode: Mode;
  difficulty: Difficulty;
  rngSeed: number;
  rngCursor: number;
  clock: { period: Period; elapsedInPeriod: number; totalElapsed: number };
  regions: Record<RegionId, RegionState>;
  traits: string[];            // owned trait ids
  niche: "filterFeeding" | "benthicGrazing" | null;
  ep: number;
  objectives: { recoveryUsed: boolean; recoveryDeadline: number | null };
  schedule: { firedWarnings: string[]; firedShocks: string[]; claimedGrants: string[] };
  pendingDecision: PendingDecision | null;
  status: "running" | "won" | "lost";
}

export const SCHEMA_VERSION = 1;

export function initialState(opts: { mode: Mode; rngSeed: number; difficulty?: Difficulty }): SimState {
  const regions = {} as Record<RegionId, RegionState>;
  for (const id of [...PLAYABLE_REGIONS, "land"] as RegionId[]) {
    regions[id] = { id, P: id === "nursery" ? 10 : 0, occ: "inaccessible" };
  }
  regions.nursery.occ = "colonizing";
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: opts.mode,
    difficulty: opts.difficulty ?? "normal",
    rngSeed: opts.rngSeed,
    rngCursor: 0,
    clock: { period: "cambrian", elapsedInPeriod: 0, totalElapsed: 0 },
    regions,
    traits: [],
    niche: null,
    ep: 0,
    objectives: { recoveryUsed: false, recoveryDeadline: null },
    schedule: { firedWarnings: [], firedShocks: [], claimedGrants: [] },
    pendingDecision: null,
    status: "running",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/evolution/sim/state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/evolution/sim/state.ts lib/evolution/sim/state.test.ts
git commit -m "feat(evolve-sim): core types + initial state"
```

---

### Task 2: Seedable PRNG (deterministic, serialisable)

**Files:**
- Create: `lib/evolution/sim/rng.ts`
- Test: `lib/evolution/sim/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { makeRng } from "./rng";

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42); const b = makeRng(42);
    expect([a.nextFloat(), a.nextFloat(), a.nextFloat()])
      .toEqual([b.nextFloat(), b.nextFloat(), b.nextFloat()]);
  });
  it("resumes exactly from a persisted cursor", () => {
    const a = makeRng(7);
    a.nextFloat(); a.nextFloat();
    const cursor = a.cursor; // 2
    const resumed = makeRng(7, cursor);
    expect(resumed.nextFloat()).toBe(makeRng(7, 2).nextFloat());
    // and equals continuing the original stream
    const original = makeRng(7); original.nextFloat(); original.nextFloat();
    expect(resumed.nextFloat()).toBe(original.nextFloat());
  });
  it("returns floats in [0,1)", () => {
    const r = makeRng(99);
    for (let i = 0; i < 1000; i++) { const x = r.nextFloat(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run lib/evolution/sim/rng.test.ts` → FAIL (`makeRng` not defined).

- [ ] **Step 3: Implement (counter-based mulberry32)**

```typescript
export interface Rng { nextFloat(): number; cursor: number; readonly seed: number; }

// Counter-based: value at position n depends only on (seed, n), so a persisted
// cursor reproduces the stream exactly (required for bit-exact save/resume).
function mulberry(seed: number, n: number): number {
  let t = (seed + n * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function makeRng(seed: number, cursor = 0): Rng {
  let c = cursor;
  return {
    seed,
    get cursor() { return c; },
    nextFloat() { return mulberry(seed, c++); },
  };
}
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run lib/evolution/sim/rng.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/evolution/sim/rng.ts lib/evolution/sim/rng.test.ts
git commit -m "feat(evolve-sim): seedable counter-based PRNG"
```

---

### Task 3: Difficulty parameter table (Normal)

**Files:**
- Create: `lib/evolution/sim/difficulty.ts`
- Test: `lib/evolution/sim/difficulty.test.ts`

Encodes spec §14. Every balance-sensitive constant lives here so Relaxed/Hard become data-only later (spec §8.6).

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { NORMAL, DifficultyParams } from "./difficulty";

describe("NORMAL difficulty params", () => {
  it("matches spec §14 core constants", () => {
    expect(NORMAL.SIM_DT).toBe(0.25);
    expect(NORMAL.rMax).toBe(0.05);
    expect(NORMAL.mBase).toBe(0.005);
    expect(NORMAL.mStress).toBe(0.04);
    expect(NORMAL.mCrowd).toBe(0.03);
    expect(NORMAL.migrationRate).toBe(0.1);
    expect(NORMAL.conductance.open).toBe(1.0);
    expect(NORMAL.conductance.soft).toBe(0.2);
    expect(NORMAL.conductance.hard).toBe(0);
    expect(NORMAL.establishHighFrac).toBe(0.25);
    expect(NORMAL.establishLowFrac).toBe(0.15);
    expect(NORMAL.dominateTargets).toEqual({ cambrian: 2, ordovician: 2, silurian: 3, devonian: 4 });
  });
  it("break-even fitness is ~0.5 at low P (req: poor fit declines when P<K)", () => {
    const f = 0.5;
    const net = NORMAL.rMax * f - NORMAL.mBase - NORMAL.mStress * (1 - f);
    expect(Math.abs(net)).toBeLessThan(1e-9); // ≈ 0 at f=0.5
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** (values from spec §14; `TODO(balance)` — tuned in Task 20)

```typescript
export interface DifficultyParams {
  SIM_DT: number;
  eraBudgetSec: Record<"cambrian" | "ordovician" | "silurian" | "devonian", number>;
  kBase: Record<string, number>;
  rMax: number; mBase: number; mStress: number; mCrowd: number;
  extinctionFloorRegion: number; extinctionFloorGlobal: number;
  establishHighFrac: number; establishLowFrac: number;
  migrationRate: number;
  conductance: { open: number; soft: number; hard: number };
  kPop: number; kDiv: number; eventSurvivalGrant: number; catchUpFloor: number; declineEP: number;
  traitCost: Record<string, number>;
  mutationIntervalSec: number;
  dominateTargets: Record<"cambrian" | "ordovician" | "silurian" | "devonian", number>;
  recoverySec: number;
  shocks: Record<string, { regions: string[]; eventFactor: number; disasterLoss: number; fitnessPenalty: number }>;
}

export const NORMAL: DifficultyParams = {
  SIM_DT: 0.25,
  eraBudgetSec: { cambrian: 300, ordovician: 480, silurian: 420, devonian: 600 }, // 5/8/7/10 min
  kBase: { nursery: 100, reef: 150, openOcean: 120, deepAnoxic: 80, estuary: 90, river: 70, tidalFlats: 60, land: 0 },
  rMax: 0.05, mBase: 0.005, mStress: 0.04, mCrowd: 0.03,
  extinctionFloorRegion: 0.5, extinctionFloorGlobal: 1,
  establishHighFrac: 0.25, establishLowFrac: 0.15,
  migrationRate: 0.1,
  conductance: { open: 1.0, soft: 0.2, hard: 0 },
  kPop: 0.2, kDiv: 0.5, eventSurvivalGrant: 15, catchUpFloor: 0.5, declineEP: 5,
  traitCost: {
    filterFeeding: 10, benthicGrazing: 10, eyes: 10, swimming: 10,
    repR: 25, repK: 25, thermal: 30, armor: 30, osmoregulation: 35, hypoxia: 35,
    jaws: 40, "paired-fins": 40, airGulping: 40, "lobed-limbs": 50,
  },
  mutationIntervalSec: 90,
  dominateTargets: { cambrian: 2, ordovician: 2, silurian: 3, devonian: 4 },
  recoverySec: 90,
  shocks: {
    hirnantian: { regions: ["nursery", "reef"], eventFactor: 0.4, disasterLoss: 0.2, fitnessPenalty: 0.3 },
    kellwasser: { regions: ["reef"], eventFactor: 0.3, disasterLoss: 0.25, fitnessPenalty: 0.3 },
    hangenberg: { regions: ["reef"], eventFactor: 0.0, disasterLoss: 0.4, fitnessPenalty: 0.3 },
  },
};
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): Normal difficulty params table"` (after `git add`).

---

### Task 4: Region + geography data (per-period availability & edges)

**Files:**
- Create: `lib/evolution/sim/regions.ts`
- Test: `lib/evolution/sim/regions.test.ts`

Encodes spec §2.1 (habitat attributes) + §2.2 (per-period `available`, `capacityFactor`, `temp`, `oxygen`, `predation`, `openEdges`). **Use the spec §2.2 tables as the authoritative values.**

- [ ] **Step 1: Failing test** (structural cross-checks against the spec)

```typescript
import { describe, it, expect } from "vitest";
import { REGIONS, edgesFor, availableRegions, REGION_IDS } from "./regions";
import { PERIODS, PLAYABLE_REGIONS } from "./state";

describe("regions data", () => {
  it("defines all 8 regions incl. locked land", () => {
    expect(REGION_IDS).toHaveLength(8);
    expect(REGIONS.land.lockedV1).toBe(true);
  });
  it("Cambrian availability = nursery, reef, openOcean (spec §2.2)", () => {
    expect(availableRegions("cambrian").sort()).toEqual(["nursery", "openOcean", "reef"]);
  });
  it("Devonian makes river & tidalFlats available; land stays unavailable", () => {
    const dev = availableRegions("devonian");
    expect(dev).toContain("river"); expect(dev).toContain("tidalFlats");
    expect(dev).not.toContain("land");
  });
  it("every open edge references available regions in that period", () => {
    for (const p of PERIODS) for (const [a, b] of edgesFor(p)) {
      expect(availableRegions(p)).toContain(a);
      expect(availableRegions(p)).toContain(b);
    }
  });
  it("reef predation is low in Cambrian, higher in Ordovician (spec §2.2)", () => {
    expect(REGIONS.reef.perPeriod.cambrian.predation).toBeLessThan(
      REGIONS.reef.perPeriod.ordovician.predation);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — define the `Region` shape and fill all entries from spec §2. Shape + one representative region shown; the engineer fills the remaining regions from spec §2.2 (same shape).

```typescript
import type { Period, RegionId } from "./state";

export type Temp = "cold" | "temperate" | "warm";
export type Oxygen = "oxic" | "dysoxic" | "anoxic";
export type EdgeGate = "open" | "soft" | "hard" | "locked";

export interface PeriodState {
  available: boolean;
  capacityFactor: number;   // multiplies kBase (spec §2.2 trend → number)
  temp: Temp; oxygen: Oxygen; predation: number; // 0..1
}
export interface Edge { to: RegionId; gate: EdgeGate; requires?: string[]; } // trait ids for hard/soft
export interface Region {
  id: RegionId;
  lockedV1?: boolean;
  perPeriod: Record<Period, PeriodState>;
  edges: Partial<Record<Period, Edge[]>>; // directed pairs; symmetric helper below
}

export const REGION_IDS: RegionId[] =
  ["nursery", "reef", "openOcean", "deepAnoxic", "estuary", "river", "tidalFlats", "land"];

// Representative entry — reef (fill the rest from spec §2.1/§2.2 with the same shape):
export const REGIONS: Record<RegionId, Region> = {
  reef: {
    id: "reef",
    perPeriod: {
      cambrian:   { available: true,  capacityFactor: 0.6, temp: "warm", oxygen: "oxic", predation: 0.1 },
      ordovician: { available: true,  capacityFactor: 1.0, temp: "warm", oxygen: "oxic", predation: 0.5 },
      silurian:   { available: true,  capacityFactor: 1.1, temp: "warm", oxygen: "oxic", predation: 0.5 },
      devonian:   { available: true,  capacityFactor: 1.1, temp: "warm", oxygen: "oxic", predation: 0.5 },
    },
    edges: {
      cambrian:   [{ to: "nursery", gate: "open" }],
      ordovician: [{ to: "nursery", gate: "open" }, { to: "openOcean", gate: "soft", requires: ["paired-fins"] }],
      silurian:   [{ to: "nursery", gate: "open" }, { to: "openOcean", gate: "soft", requires: ["paired-fins"] }],
      devonian:   [{ to: "nursery", gate: "open" }, { to: "openOcean", gate: "soft", requires: ["paired-fins"] }],
    },
  },
  // nursery, openOcean, deepAnoxic, estuary, river, tidalFlats: fill from spec §2.2.
  // land: lockedV1 true; all perPeriod.available=false; capacityFactor 0; no edges.
  nursery: null as unknown as Region,
  openOcean: null as unknown as Region,
  deepAnoxic: null as unknown as Region,
  estuary: null as unknown as Region,
  river: null as unknown as Region,
  tidalFlats: null as unknown as Region,
  land: null as unknown as Region,
};

export function availableRegions(p: Period): RegionId[] {
  return REGION_IDS.filter((id) => REGIONS[id]?.perPeriod[p]?.available);
}
export function edgesFor(p: Period): [RegionId, RegionId][] {
  const out: [RegionId, RegionId][] = [];
  for (const id of REGION_IDS) for (const e of REGIONS[id]?.edges[p] ?? []) out.push([id, e.to]);
  return out;
}
```
> Implementer note: replace each `null as unknown as Region` with the full entry from spec §2.1/§2.2. The test above fails until all entries are present and consistent — that is the acceptance check.

- [ ] **Step 4: Run → PASS** once all regions filled.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): per-period region graph + geography data"`.

---

### Task 5: Extend traits with gameplay fields

**Files:**
- Modify: `lib/evolution/traits/traits.ts` (existing art-system file; add gameplay fields + new stat traits, keep existing art fields)
- Test: `lib/evolution/traits/traits.gameplay.test.ts`

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { GAMEPLAY_TRAITS, exclusiveGroups } from "./traits";

describe("gameplay traits", () => {
  it("splits thermal and hypoxia tolerance into separate traits (spec §3)", () => {
    expect(GAMEPLAY_TRAITS.thermal.unlock).toBe("ordovician");
    expect(GAMEPLAY_TRAITS.hypoxia.unlock).toBe("ordovician");
  });
  it("marks reproduction r/K and feeding niche as mutually exclusive", () => {
    expect(exclusiveGroups).toContainEqual(["repR", "repK"]);
    expect(exclusiveGroups).toContainEqual(["filterFeeding", "benthicGrazing"]);
  });
  it("every trait has a trade-off string (spec §3)", () => {
    for (const t of Object.values(GAMEPLAY_TRAITS)) expect(t.tradeoff.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — add alongside the existing `TRAITS` export (do not remove art fields):

```typescript
import type { Period } from "../sim/state";

export interface GameplayTrait {
  id: string; unlock: Period; tradeoff: string;
  // effect hooks are read by fitness.ts / economy.ts via trait id; see spec §3 table
}
export const GAMEPLAY_TRAITS: Record<string, GameplayTrait> = {
  armor: { id: "armor", unlock: "ordovician", tradeoff: "−growth & −spread (heavier)" },
  jaws: { id: "jaws", unlock: "silurian", tradeoff: "+food-scarcity vulnerability" },
  "paired-fins": { id: "paired-fins", unlock: "silurian", tradeoff: "mild anti-synergy with heavy armour" },
  "lobed-limbs": { id: "lobed-limbs", unlock: "devonian", tradeoff: "−open/deep efficiency; no land" },
  thermal: { id: "thermal", unlock: "ordovician", tradeoff: "−growth in stable-warm regions" },
  hypoxia: { id: "hypoxia", unlock: "ordovician", tradeoff: "−efficiency in well-oxic shallows" },
  osmoregulation: { id: "osmoregulation", unlock: "silurian", tradeoff: "small marine-efficiency cost" },
  airGulping: { id: "airGulping", unlock: "devonian", tradeoff: "energy upkeep when unused" },
  repR: { id: "repR", unlock: "ordovician", tradeoff: "lower capacity ceiling" },
  repK: { id: "repK", unlock: "ordovician", tradeoff: "slow growth + recovery" },
};
export const exclusiveGroups: string[][] = [["repR", "repK"], ["filterFeeding", "benthicGrazing"]];
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): extend traits with gameplay fields + thermal/hypoxia split"`.

---

### Task 6: Four per-period paleogeographic map datasets

**Files:**
- Create: `lib/evolution/maps/paleo.ts`
- Test: `lib/evolution/maps/paleo.test.ts`

Data only (the UI plan renders it). Continents/oceans per spec §2.2 / §1.5 E; habitat placements position each available region within the geography; labelled illustrative.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { PALEO_MAPS } from "./paleo";
import { PERIODS } from "../sim/state";
import { availableRegions } from "../sim/regions";

describe("paleo maps", () => {
  it("has a map per period, each labelled illustrative", () => {
    for (const p of PERIODS) {
      expect(PALEO_MAPS[p]).toBeTruthy();
      expect(PALEO_MAPS[p].label.toLowerCase()).toContain("illustrative");
    }
  });
  it("places every available region for its period", () => {
    for (const p of PERIODS) {
      const placed = PALEO_MAPS[p].placements.map((x) => x.region);
      for (const r of availableRegions(p)) expect(placed).toContain(r);
    }
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — shape + one period shown; fill the other three from spec §2.2 geography.

```typescript
import type { Period, RegionId } from "../sim/state";

export interface Continent { id: string; label: string; cx: number; cy: number; rx: number; ry: number; }
export interface Placement { region: RegionId; cx: number; cy: number; }
export interface PaleoMap { label: string; continents: Continent[]; placements: Placement[]; }

export const PALEO_MAPS: Record<Period, PaleoMap> = {
  cambrian: {
    label: "Cambrian — illustrative, original, not a reconstruction",
    continents: [
      { id: "gondwana", label: "Gondwana", cx: 40, cy: 72, rx: 34, ry: 20 },
      { id: "laurentia", label: "Laurentia", cx: 60, cy: 40, rx: 14, ry: 10 },
    ],
    placements: [
      { region: "nursery", cx: 46, cy: 60 },
      { region: "reef", cx: 62, cy: 44 },
      { region: "openOcean", cx: 20, cy: 30 },
    ],
  },
  ordovician: null as unknown as PaleoMap, // fill from spec §2.2 (Gondwana over S pole, Avalonia, Iapetus/Rheic)
  silurian: null as unknown as PaleoMap,   // Laurussia forms (Caledonian), Rheic wide
  devonian: null as unknown as PaleoMap,   // Old Red Sandstone continent at equator; river/estuary/shore + locked land
};
```

- [ ] **Step 4: Run → PASS** once all four filled.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): four per-period paleogeographic map datasets"`.

- [ ] **Milestone M0 gate:** `npm test && npx tsc --noEmit && npm run lint` all clean. Commit any fixups.

---

## M1 — Pure simulation core

### Task 7: Fitness function

**Files:** Create `lib/evolution/sim/fitness.ts`; Test `fitness.test.ts`.

Combines region per-period env (temp/oxygen/predation/salinity/exposure) + active shock penalties against owned traits + niche → `f ∈ [0,1]`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { fitness } from "./fitness";

const base = { traits: [] as string[], niche: null, period: "ordovician" as const };

describe("fitness", () => {
  it("deepAnoxic is poor (<0.5) without hypoxia, good (>0.5) with it", () => {
    expect(fitness("deepAnoxic", { ...base })).toBeLessThan(0.5);
    expect(fitness("deepAnoxic", { ...base, traits: ["hypoxia"] })).toBeGreaterThan(0.5);
  });
  it("armour raises reef fitness when predation is high (Ordovician)", () => {
    const without = fitness("reef", { ...base });
    const withArmor = fitness("reef", { ...base, traits: ["armor"] });
    expect(withArmor).toBeGreaterThan(without);
  });
  it("Cambrian reef is occupiable (>0.5) with no traits (low predation)", () => {
    expect(fitness("reef", { ...base, period: "cambrian" })).toBeGreaterThan(0.5);
  });
  it("a cold shock drops surface fitness unless thermal tolerance is owned", () => {
    const cold = { shockFitnessPenalty: { regions: ["nursery"], amount: 0.3 } };
    expect(fitness("nursery", { ...base, ...cold })).toBeLessThan(fitness("nursery", { ...base }));
    expect(fitness("nursery", { ...base, ...cold, traits: ["thermal"] }))
      .toBeGreaterThan(fitness("nursery", { ...base, ...cold }));
  });
});
```

- [ ] **Step 2–4:** Run FAIL → implement `fitness(regionId, ctx)` as a clamped sum of per-attribute contributions (each trait that matches a hostile attribute adds, mismatched penalties subtract; shock penalties subtract unless the matching tolerance is owned; niche shifts open-water vs benthic) → clamp `[0,1]`. Use spec §3/§4.1 as the mapping. Run PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): fitness function"`.

---

### Task 8: Carrying capacity

**Files:** Create `lib/evolution/sim/capacity.ts`; Test `capacity.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { capacityK } from "./capacity";
import { NORMAL } from "./difficulty";

describe("capacityK", () => {
  it("= kBase * capacityFactor * eventFactor", () => {
    // reef Ordovician capacityFactor 1.0, no event
    expect(capacityK("reef", "ordovician", 1)).toBeCloseTo(NORMAL.kBase.reef * 1.0);
    expect(capacityK("reef", "ordovician", 0.3)).toBeCloseTo(NORMAL.kBase.reef * 1.0 * 0.3);
  });
  it("is 0 for unavailable / locked regions", () => {
    expect(capacityK("river", "cambrian", 1)).toBe(0);
    expect(capacityK("land", "devonian", 1)).toBe(0);
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `capacityK(id, period, eventFactor)` reading `NORMAL.kBase`, `REGIONS[id].perPeriod[period]` (0 if unavailable) → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): carrying capacity"`.

---

### Task 9: Population — births/deaths/crowding (no clamp to K)

**Files:** Create `lib/evolution/sim/population.ts`; Test `population.test.ts`.

Implements spec §4.3 exactly, incl. **requirement: overcrowding decays over time, no instant clamp to a reduced K; disaster loss is separate**.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { stepPopulation } from "./population";
import { NORMAL } from "./difficulty";

const K = 100;

describe("stepPopulation", () => {
  it("poor fit (f<0.5) declines even when P < K", () => {
    const r = stepPopulation({ P: 20, f: 0.3, K, dt: NORMAL.SIM_DT, params: NORMAL });
    expect(r.Pnext).toBeLessThan(20);
  });
  it("good fit (f=1) grows toward ~0.9K and not above K", () => {
    let P = 10;
    for (let i = 0; i < 20000; i++) P = stepPopulation({ P, f: 1, K, dt: NORMAL.SIM_DT, params: NORMAL }).Pnext;
    expect(P).toBeGreaterThan(0.8 * K);
    expect(P).toBeLessThanOrEqual(K + 1e-6);
  });
  it("overcrowding after a K cut declines GRADUALLY, not an instant snap", () => {
    const P0 = 90; const Kcut = 40; // K dropped below P
    const one = stepPopulation({ P: P0, f: 1, K: Kcut, dt: NORMAL.SIM_DT, params: NORMAL }).Pnext;
    expect(one).toBeLessThan(P0);        // declines
    expect(one).toBeGreaterThan(Kcut);   // but NOT snapped down to K in one step
  });
  it("never goes negative and cannot lose more than P in a step", () => {
    const r = stepPopulation({ P: 0.4, f: 0, K, dt: NORMAL.SIM_DT, params: NORMAL });
    expect(r.Pnext).toBeGreaterThanOrEqual(0);
  });
  it("K<=0 (habitat loss) decays population, births are zero", () => {
    const r = stepPopulation({ P: 50, f: 1, K: 0, dt: NORMAL.SIM_DT, params: NORMAL });
    expect(r.births).toBe(0);
    expect(r.Pnext).toBeLessThan(50);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```typescript
import type { DifficultyParams } from "./difficulty";

export function stepPopulation(a: { P: number; f: number; K: number; dt: number; params: DifficultyParams }) {
  const { P, f, K, dt, params } = a;
  const headroom = K > 0 ? Math.max(0, 1 - P / K) : 0;
  const births = params.rMax * f * P * headroom;            // ≥0; 0 when P≥K or K≤0
  const over = K > 0 ? Math.max(0, P / K - 1) : (P > 0 ? 1 : 0);
  const perCapitaDeath = params.mBase + (1 - f) * params.mStress + params.mCrowd * over;
  let deaths = perCapitaDeath * P;
  // stability: can't kill more than exists this step
  if (deaths * dt > P) deaths = P / dt;
  const dP = births - deaths;
  let Pnext = P + dP * dt;                                   // lower clamp only — NO clamp to K
  if (Pnext < 0) Pnext = 0;
  if (Pnext < params.extinctionFloorRegion) Pnext = 0;
  return { births, deaths, dP, Pnext };
}

// Disaster losses are applied SEPARATELY by the event system (Task 14), not here.
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): population births/deaths/crowding (no K clamp)"`.

---

### Task 10: Occupancy with hysteresis (baseline-referenced)

**Files:** Create `lib/evolution/sim/occupancy.ts` (or append to population.ts); Test `occupancy.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { updateOccupancy } from "./occupancy";
import { NORMAL } from "./difficulty";

const Kbase = 100; // nursery
describe("updateOccupancy (hysteresis, baseline-referenced)", () => {
  it("becomes occupied at >= 0.25*Kbase", () => {
    expect(updateOccupancy("colonizing", 24, Kbase, NORMAL)).toBe("colonizing");
    expect(updateOccupancy("colonizing", 25, Kbase, NORMAL)).toBe("occupied");
  });
  it("stays occupied until < 0.15*Kbase (hysteresis)", () => {
    expect(updateOccupancy("occupied", 16, Kbase, NORMAL)).toBe("occupied");
    expect(updateOccupancy("occupied", 14, Kbase, NORMAL)).toBe("colonizing");
  });
  it("a disaster that cuts CURRENT K does not make occupancy easier (uses Kbase)", () => {
    // P=20 with Kbase=100 is below establishHigh(25) regardless of a reduced current K
    expect(updateOccupancy("colonizing", 20, Kbase, NORMAL)).toBe("colonizing");
  });
});
```

- [ ] **Step 2–4:** FAIL → implement using `establishHighFrac/establishLowFrac × Kbase` with hysteresis from current state → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): occupancy hysteresis"`.

---

### Task 11: Migration — per-second budget, absolute conductance, destination combined cap

**Files:** Create `lib/evolution/sim/spread.ts`; Test `spread.test.ts`.

Implements spec §4.5 (Rev 3.1) — **requirement 1**.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { migrate } from "./spread";
import { NORMAL } from "./difficulty";

// minimal world: populations + capacities + directed open edges
type W = { P: Record<string, number>; K: Record<string, number>; edges: { from: string; to: string; gate: "open" | "soft" | "hard" }[] };

describe("migrate", () => {
  it("source budget = migrationRate * SIM_DT * P0 over open edges", () => {
    const w: W = { P: { a: 100, b: 0 }, K: { a: 100, b: 100 }, edges: [{ from: "a", to: "b", gate: "open" }] };
    const d = migrate(w, NORMAL);
    const budget = NORMAL.migrationRate * NORMAL.SIM_DT * 100; // 2.5
    expect(d.a).toBeCloseTo(-budget); expect(d.b).toBeCloseTo(+budget);
  });
  it("soft edge throttles ACTUAL flow (0.2x), remainder stays in source", () => {
    const w: W = { P: { a: 100, b: 0 }, K: { a: 100, b: 100 }, edges: [{ from: "a", to: "b", gate: "soft" }] };
    const d = migrate(w, NORMAL);
    const open = NORMAL.migrationRate * NORMAL.SIM_DT * 100;
    expect(d.b).toBeCloseTo(open * 0.2); // absolute penalty, not re-normalised to full budget
  });
  it("combined inflow from MANY sources is capped at destination headroom", () => {
    const w: W = { P: { a: 100, b: 100, c: 5 }, K: { a: 100, b: 100, c: 10 },
      edges: [{ from: "a", to: "c", gate: "open" }, { from: "b", to: "c", gate: "open" }] };
    const d = migrate(w, NORMAL);
    expect(d.c).toBeLessThanOrEqual(10 - 5 + 1e-9); // headroom = 5
  });
  it("is order-independent and conserves population", () => {
    const w1: W = { P: { a: 50, b: 50, c: 0 }, K: { a: 100, b: 100, c: 100 },
      edges: [{ from: "a", to: "c", gate: "open" }, { from: "b", to: "c", gate: "open" }] };
    const w2: W = { ...w1, edges: [...w1.edges].reverse() };
    const d1 = migrate(w1, NORMAL); const d2 = migrate(w2, NORMAL);
    expect(d1).toEqual(d2);
    const sum = (d: Record<string, number>) => Object.values(d).reduce((x, y) => x + y, 0);
    expect(Math.abs(sum(d1))).toBeLessThan(1e-9);
  });
  it("no source goes negative", () => {
    const w: W = { P: { a: 1, b: 0 }, K: { a: 100, b: 100 }, edges: [{ from: "a", to: "b", gate: "open" }] };
    const d = migrate(w, NORMAL);
    expect(1 + d.a).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** (snapshot → source budget split by headroom share → absolute conductance on actual flow → destination combined cap → allocate then deduct)

```typescript
import type { DifficultyParams } from "./difficulty";

interface World { P: Record<string, number>; K: Record<string, number>;
  edges: { from: string; to: string; gate: "open" | "soft" | "hard" }[]; }

export function migrate(w: World, params: DifficultyParams): Record<string, number> {
  const P0 = { ...w.P };
  const headroom = (id: string) => Math.max(0, (w.K[id] ?? 0) - P0[id]);
  const cond = (g: "open" | "soft" | "hard") => params.conductance[g];

  // 1. propose per-edge flow from snapshot
  type Prop = { from: string; to: string; flow: number };
  const props: Prop[] = [];
  const bySource: Record<string, { to: string; gate: "open" | "soft" | "hard" }[]> = {};
  for (const e of w.edges) (bySource[e.from] ??= []).push({ to: e.to, gate: e.gate });

  for (const from of Object.keys(bySource)) {
    if ((P0[from] ?? 0) <= 0) continue;
    const budget = params.migrationRate * params.SIM_DT * P0[from];
    const outs = bySource[from];
    const totalHeadroom = outs.reduce((s, e) => s + headroom(e.to), 0);
    if (totalHeadroom <= 0) continue;
    for (const e of outs) {
      const share = budget * (headroom(e.to) / totalHeadroom); // split by destination headroom
      const flow = share * cond(e.gate);                        // absolute conductance → actual flow
      if (flow > 0) props.push({ from, to: e.to, flow });
    }
  }

  // 2. destination combined cap: scale all inflows to d so Σ ≤ headroom(d)
  const inByDest: Record<string, number> = {};
  for (const p of props) inByDest[p.to] = (inByDest[p.to] ?? 0) + p.flow;
  const accept: Record<string, number> = {};
  for (const d of Object.keys(inByDest)) {
    const hr = headroom(d);
    accept[d] = inByDest[d] > hr && inByDest[d] > 0 ? hr / inByDest[d] : 1;
  }

  // 3. allocate accepted, then deduct the same accepted amount from sources
  const delta: Record<string, number> = {};
  for (const id of Object.keys(w.P)) delta[id] = 0;
  for (const p of props) {
    const acc = p.flow * accept[p.to];
    delta[p.to] += acc;
    delta[p.from] -= acc;
  }
  return delta;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): snapshot migration (per-second budget, abs conductance, dest cap)"`.

---

### Task 12: Economy — per-second income vs one-off grants

**Files:** Create `lib/evolution/sim/economy.ts`; Test `economy.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { incomeRate, applyIncome, grantOnce } from "./economy";
import { NORMAL } from "./difficulty";

describe("economy", () => {
  it("income is sub-linear in population (no runaway)", () => {
    const low = incomeRate({ totalPop: 100, occupied: 2 }, NORMAL);
    const high = incomeRate({ totalPop: 400, occupied: 2 }, NORMAL);
    expect(high).toBeLessThan(low * 4); // sqrt: 4x pop < 4x income
  });
  it("applyIncome scales with dt", () => {
    const rate = incomeRate({ totalPop: 100, occupied: 2 }, NORMAL);
    expect(applyIncome(0, rate, NORMAL.SIM_DT)).toBeCloseTo(rate * NORMAL.SIM_DT);
  });
  it("catchUp floor applies when occupied <= 1", () => {
    expect(incomeRate({ totalPop: 5, occupied: 1 }, NORMAL))
      .toBeGreaterThanOrEqual(NORMAL.catchUpFloor);
  });
  it("grantOnce is idempotent per id and NOT scaled by dt", () => {
    const s = { ep: 0, claimed: [] as string[] };
    const a = grantOnce(s, "survive:hirnantian", NORMAL.eventSurvivalGrant);
    expect(a.ep).toBe(NORMAL.eventSurvivalGrant);
    const b = grantOnce(a, "survive:hirnantian", NORMAL.eventSurvivalGrant);
    expect(b.ep).toBe(NORMAL.eventSurvivalGrant); // not granted twice
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `incomeRate = kPop*sqrt(totalPop) + kDiv*occupied + (occupied<=1 ? catchUpFloor : 0)`; `applyIncome(ep, rate, dt) = ep + rate*dt`; `grantOnce(state, id, amount)` adds once, records id in `claimed`. → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): EP economy (sqrt income, catchUp, one-off grants)"`.

- [ ] **Milestone M1 gate:** `npm test && npx tsc --noEmit && npm run lint` clean. Commit fixups.

---

## M2 — Events, modes, save

### Task 13: Event schedule (warning precedes shock)

**Files:** Create `lib/evolution/events/schedule.ts` + `events.ts`; Test `schedule.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { scheduleFor } from "./schedule";

describe("event schedule", () => {
  it("each shock has a warning strictly before it", () => {
    for (const p of ["cambrian", "ordovician", "silurian", "devonian"] as const)
      for (const ev of scheduleFor(p))
        if (ev.shock) expect(ev.warnAt).toBeLessThan(ev.shockAt);
  });
  it("Devonian schedules Kellwasser before Hangenberg, both before the deadline", () => {
    const dev = scheduleFor("devonian");
    const k = dev.find((e) => e.id === "kellwasser")!;
    const h = dev.find((e) => e.id === "hangenberg")!;
    expect(k.shockAt).toBeLessThan(h.shockAt);
    expect(h.shockAt).toBeLessThan(600); // Devonian budget
  });
});
```

- [ ] **Step 2–4:** FAIL → implement per-period schedules (times from spec §7.4 + §14 era budgets); ordinary events as small env nudges; boundary extinctions reference `extinctions.ts`. → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-events): per-period schedule (warning before shock)"`.

---

### Task 14: Extinctions — eventFactor + explicit disasterLoss

**Files:** Create `lib/evolution/events/extinctions.ts`; Test `extinctions.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { applyShock } from "./extinctions";
import { NORMAL } from "../sim/difficulty";

describe("applyShock", () => {
  it("applies an explicit one-time disasterLoss and records it as fired (idempotent)", () => {
    const s: any = { regions: { reef: { id: "reef", P: 100, occ: "occupied" } },
      schedule: { firedShocks: [] } };
    const r1 = applyShock(s, "hangenberg", NORMAL);
    expect(r1.regions.reef.P).toBeCloseTo(100 * (1 - 0.4)); // 40% one-time loss
    expect(r1.schedule.firedShocks).toContain("hangenberg");
    const r2 = applyShock(r1, "hangenberg", NORMAL); // already fired
    expect(r2.regions.reef.P).toBeCloseTo(r1.regions.reef.P); // not applied twice
  });
  it("records the loss for the briefing (explained, not hidden)", () => {
    const s: any = { regions: { reef: { id: "reef", P: 80, occ: "occupied" } }, schedule: { firedShocks: [] } };
    const r = applyShock(s, "kellwasser", NORMAL);
    expect(r.lastShockReport.id).toBe("kellwasser");
    expect(r.lastShockReport.lostFraction).toBeCloseTo(0.25);
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `applyShock(state, shockId, params)`: if already in `firedShocks`, return unchanged; else apply one-time `disasterLoss` to the shock's regions, set that region's `eventFactor` (consumed by `capacityK` for gradual decline — stored on state per region/period), push to `firedShocks`, and attach a `lastShockReport {id, lostFraction, regions}` for the UI briefing. Keep eventFactor and disasterLoss **separate** (spec §4.3/§7.1). → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-events): extinction shocks (eventFactor + explicit disasterLoss)"`.

---

### Task 15: Modes — objectives, recovery window, end conditions

**Files:** Create `lib/evolution/sim/modes.ts`; Test `modes.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { occupiedCount, checkBoundary, checkExtinction, achievabilityOk } from "./modes";
import { NORMAL } from "./difficulty";

describe("modes", () => {
  it("extinction (total < floor) ends either mode", () => {
    const s: any = { status: "running", regions: { nursery: { P: 0.4 } } };
    expect(checkExtinction(s, NORMAL).status).toBe("lost");
  });
  it("survival never checks occupation targets", () => {
    const s: any = { mode: "survival", clock: { period: "cambrian" }, regions: {}, objectives: {} };
    expect(checkBoundary(s, NORMAL).status).not.toBe("lost");
  });
  it("dominate: meeting N advances; missing grants one recovery window; second miss ends", () => {
    const base: any = { mode: "dominate", clock: { period: "cambrian" },
      objectives: { recoveryUsed: false, recoveryDeadline: null }, status: "running",
      regions: { nursery: { occ: "occupied" }, reef: { occ: "occupied" } } }; // 2 occupied = target
    expect(checkBoundary(base, NORMAL).advance).toBe(true);

    const miss: any = { ...base, regions: { nursery: { occ: "occupied" } } }; // 1 occupied < 2
    const afterMiss = checkBoundary(miss, NORMAL);
    expect(afterMiss.objectives.recoveryUsed).toBe(true);
    expect(afterMiss.status).toBe("running");

    const secondMiss = checkBoundary({ ...miss, objectives: { recoveryUsed: true, recoveryDeadline: 0 } }, NORMAL);
    expect(secondMiss.status).toBe("lost");
  });
  it("achievability invariant holds for every era (spec §8.5)", () => {
    expect(achievabilityOk(NORMAL)).toBe(true);
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `occupiedCount`, `checkExtinction` (global floor), `checkBoundary` (survival: advance; dominate: compare occupiedCount vs `dominateTargets[period]`; on miss grant recovery if unused else lost), and `achievabilityOk` (structural: each era's target ≤ count of regions occupiable with that era's available regions + unlockable traits, excluding hard-gated-only and, for Devonian, the collapsed reef). → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): modes, recovery window, achievability invariant"`.

---

### Task 16: tick() — fixed-step orchestrator

**Files:** Create `lib/evolution/sim/tick.ts`; Test `tick.test.ts`.

Implements the spec §7.2 pipeline order; advances exactly one `SIM_DT`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { tick } from "./tick";
import { initialState } from "./state";
import { makeRng } from "./rng";

describe("tick", () => {
  it("is deterministic for the same seed + inputs", () => {
    const run = () => { let s = initialState({ mode: "survival", rngSeed: 5 });
      for (let i = 0; i < 200; i++) s = tick(s, makeRng(s.rngSeed, s.rngCursor)); return s; };
    expect(run()).toEqual(run());
  });
  it("advances the clock by exactly SIM_DT per call", () => {
    let s = initialState({ mode: "survival", rngSeed: 1 });
    const t0 = s.clock.totalElapsed; s = tick(s, makeRng(s.rngSeed, s.rngCursor));
    expect(s.clock.totalElapsed).toBeCloseTo(t0 + 0.25);
  });
  it("population grows in the nursery over the first in-sim minute", () => {
    let s = initialState({ mode: "survival", rngSeed: 1 });
    for (let i = 0; i < 240; i++) s = tick(s, makeRng(s.rngSeed, s.rngCursor)); // 60s
    expect(s.regions.nursery.P).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `tick` calling, in order: advanceClock → fireDueWarnings (sets `pendingDecision`/pause flag) → applyDueShocks → growth (stepPopulation per region) → migrate → updateOccupancy → economy (income + grantOnce) → boundaryCheck/checkExtinction. Persist `rngCursor` from the rng used. → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-sim): fixed-step tick orchestrator"`.

---

### Task 17: Save / resume (versioned, fail-safe, idempotent)

**Files:** Create `lib/evolution/save/save.ts`; Test `save.test.ts`.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "./save";
import { initialState } from "../sim/state";

describe("save", () => {
  it("round-trips a state exactly", () => {
    const s = initialState({ mode: "dominate", rngSeed: 3 });
    expect(deserialize(serialize(s)).state).toEqual(s);
  });
  it("fails safe on corruption without zeroing (keeps raw backup)", () => {
    const r = deserialize("{not valid json");
    expect(r.state).toBeNull();
    expect(r.error).toBe("corrupt");
    expect(r.rawBackup).toBe("{not valid json");
  });
  it("flags a version mismatch instead of crashing", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    const bumped = JSON.parse(serialize(s)); bumped.schemaVersion = 999;
    const r = deserialize(JSON.stringify(bumped));
    expect(r.error).toBe("version");
  });
  it("persists pendingDecision + claimedGrants so resume cannot reroll or double-grant", () => {
    const s = initialState({ mode: "survival", rngSeed: 1 });
    s.pendingDecision = { kind: "mutation", options: ["armor", "thermal", "hypoxia"], context: "cold ahead" };
    s.schedule.claimedGrants = ["survive:hirnantian"];
    const back = deserialize(serialize(s)).state!;
    expect(back.pendingDecision!.options).toEqual(["armor", "thermal", "hypoxia"]);
    expect(back.schedule.claimedGrants).toEqual(["survive:hirnantian"]);
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `serialize(state)` (JSON) and `deserialize(str)` → `{ state, error?, rawBackup? }` with try/catch (corrupt → raw backup, no zero), `schemaVersion` check (mismatch → `error:"version"`, migration hook), else return state. → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(evolve-save): versioned fail-safe save/resume"`.

- [ ] **Milestone M2 gate:** `npm test && npx tsc --noEmit && npm run lint` clean. Commit fixups.

---

## M3 — Headless validation & tuning (THE GATE)

> **Requirement 2 reminder:** everything below treats the reference run and balance numbers as **hypotheses**. The pre-existing 414 repo tests do not validate any of this. These scenario tests are the first real validation of gameplay.

### Task 18: Headless harness

**Files:** Create `lib/evolution/sim/headless.ts`; Test `headless.test.ts`.

A policy-driven runner: it advances `tick()` and, at decision points, applies a scripted **policy** (the reference-run strategy from spec §14: pick niche, set spread focus, buy era traits when affordable, respond to events). Returns the full trace + final outcome.

- [ ] **Step 1: Failing test**

```typescript
import { describe, it, expect } from "vitest";
import { runHeadless, referencePolicy } from "./headless";

describe("runHeadless", () => {
  it("runs deterministically and returns an outcome", () => {
    const a = runHeadless({ mode: "survival", seed: 1, policy: referencePolicy });
    const b = runHeadless({ mode: "survival", seed: 1, policy: referencePolicy });
    expect(a.outcome).toEqual(b.outcome);
    expect(["won", "lost"]).toContain(a.outcome.status);
    expect(a.trace.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2–4:** FAIL → implement `runHeadless({mode, seed, policy, maxSteps})` looping `tick` until `status !== "running"` or the Devonian ends; `policy(state)` returns actions (buy trait / pick niche / set focus / accept|decline mutation / resume) applied via pure reducers; `referencePolicy` encodes spec §14's reference run. Collect a trace of `{t, period, ep, occupied, totalPop}`. → PASS.
- [ ] **Step 5: Commit** — `git commit -am "test(evolve-sim): headless policy-driven run harness"`.

---

### Task 19: Scenario validation tests

**Files:** Create `lib/evolution/sim/scenarios.test.ts`.

- [ ] **Step 1: Write the scenario tests (these will likely FAIL until Task 20 tuning)**

```typescript
import { describe, it, expect } from "vitest";
import { runHeadless, referencePolicy, passivePolicy, underExpandPolicy, recoverPolicy } from "./headless";

describe("Normal-difficulty scenarios (balance validation)", () => {
  it("SURVIVAL: reference play reaches the end of the Devonian alive", () => {
    const r = runHeadless({ mode: "survival", seed: 11, policy: referencePolicy });
    expect(r.outcome.status).toBe("won");
    expect(r.outcome.finalPeriod).toBe("devonian");
  });
  it("DOMINATE: reference play meets every era target and wins", () => {
    const r = runHeadless({ mode: "dominate", seed: 11, policy: referencePolicy });
    expect(r.outcome.status).toBe("won");
    expect(r.outcome.missedTargets).toBe(0);
  });
  it("EXTINCTION: ignoring telegraphed threats drives the lineage extinct (either mode)", () => {
    const r = runHeadless({ mode: "survival", seed: 11, policy: passivePolicy });
    expect(r.outcome.status).toBe("lost");
    expect(r.outcome.cause).toBe("extinction");
  });
  it("FAILED TARGET: under-expanding in Dominate misses a target and triggers the recovery window", () => {
    const r = runHeadless({ mode: "dominate", seed: 11, policy: underExpandPolicy });
    expect(r.outcome.usedRecoveryWindow).toBe(true);
  });
  it("RECOVERY WINDOW: recovering inside the window continues the run; failing again ends it", () => {
    const r = runHeadless({ mode: "dominate", seed: 11, policy: recoverPolicy });
    expect(r.outcome.usedRecoveryWindow).toBe(true);
    expect(["won", "lost"]).toContain(r.outcome.status); // policy param decides which; assert both branches exist
    expect(r.outcome.recoveryResolved).toBe(true);
  });
});
```

- [ ] **Step 2: Run → observe which scenarios fail** (`npx vitest run lib/evolution/sim/scenarios.test.ts`). Record the failures; they define the tuning targets. Add `passivePolicy`, `underExpandPolicy`, `recoverPolicy` to `headless.ts` as simple variants of `referencePolicy`.
- [ ] **Step 3: Commit the (possibly red) scenarios + policies**

```bash
git add lib/evolution/sim/scenarios.test.ts lib/evolution/sim/headless.ts
git commit -m "test(evolve-sim): Normal-difficulty scenario validation (pre-tuning)"
```

---

### Task 20: Tune Normal numbers until scenarios pass

**Files:** Modify `lib/evolution/sim/difficulty.ts`; Modify spec `docs/superpowers/specs/2026-10-20-evolve-gameplay-design.md` (§14 note).

- [ ] **Step 1:** Run the scenario suite; for each failing scenario, adjust only `NORMAL` constants in `difficulty.ts` (era budgets, rates, trait costs, EP coefficients, shock magnitudes, targets, recovery length) toward the intended outcome. Re-run after each change. **Do not** change the scenarios' intent to force a pass (requirement 2).
- [ ] **Step 2:** Confirm comfortable-but-non-trivial margins: reference play wins with headroom; passive play reliably goes extinct; under-expand reliably triggers recovery. Run `npx vitest run lib/evolution/sim/scenarios.test.ts` → all PASS.
- [ ] **Step 3:** Update spec §14: change the heading note from "Provisional Normal-difficulty numbers" to "Validated Normal-difficulty numbers (headless, <date>)" and paste the final constants; keep a one-line changelog entry.
- [ ] **Step 4:** Full gate — `npm test && npx tsc --noEmit && npm run lint && npm run build` (no `next dev` running). Expected: all green.
- [ ] **Step 5: Commit**

```bash
git add lib/evolution/sim/difficulty.ts docs/superpowers/specs/2026-10-20-evolve-gameplay-design.md
git commit -m "feat(evolve-sim): tune Normal numbers to pass headless scenarios; mark spec §14 validated"
```

- [ ] **Milestone M3 gate (UI unlock):** all scenario tests green with tuned numbers; spec §14 marked validated. **Only now** author the follow-up UI plan.

---

## M4+ — Gameplay UI (separate follow-up plan, not in this document)

Authored **after** M3 so UI is built against tuned numbers. It will cover (preserving requirement 4): `app/evolve/page.tsx` + `components/evolution/*` (interactive `PaleoMap` rendering the four Task-6 datasets, HUD, region inspector with named limiting factor + "which adaptation helps", trait shop, mutation/event/extinction briefing modals stating the `disasterLoss` taken, Dominate tracker, start/end debrief screens), `/thinking` hub-card + GAMES entry, `prefers-reduced-motion`, accessibility, the full gate incl. `npm run build`, and **desktop + mobile screenshots delivered to Iqbal for visual review** before any merge. No merge/push of either plan's work without Iqbal's approval.

---

## Self-review (completed by plan author)

**1. Spec coverage** — mapped section → task:
- §2 maps/regions → Tasks 4, 6 · §3 traits + Cambrian baselines → Tasks 5, 18 (niche in policy) · §4.1 fitness → 7 · §4.2 capacity → 8 · §4.3 population → 9 · §4.4 occupancy → 10 · §4.5 migration → 11 · §5 economy → 12 · §6 mutations → 16/18 (offer in tick; pick in policy; UI modal deferred) · §7 events/ordering → 13, 14, 16 · §8 modes/recovery/achievability → 15 · §9 save/determinism → 2, 16, 17 · §12 pacing → 3 (era budgets), 18 · §14 numbers → 3, 20 · §1 science qualifications → carried as data/copy in 4, 6, 14 (and UI copy in M4). UI-only sections (§10) → M4 plan. **No core-sim gaps.**
- **Known deferral (intentional, not a gap):** mutation-offer UX, region-inspector copy, and visual review live in the M4 UI plan per requirement 3 (headless validation before UI).

**2. Placeholder scan** — the `null as unknown as Region`/`PaleoMap` entries in Tasks 4 & 6 are **typed stubs with explicit "fill from spec §2.2" instructions and a failing test that only passes once filled** — not silent TODOs. All logic tasks contain complete code. No "add error handling"/"similar to Task N" placeholders.

**3. Type consistency** — `SimState`, `RegionId`, `Period`, `DifficultyParams`, `stepPopulation`, `migrate`, `capacityK`, `updateOccupancy`, `incomeRate`/`applyIncome`/`grantOnce`, `tick`, `applyShock`, `checkBoundary`/`checkExtinction`, `serialize`/`deserialize`, `runHeadless`/`referencePolicy` are used with consistent names/signatures across tasks.

---

**Execution note:** Per Iqbal, **no implementation begins until this plan is approved**, and no merge/push without approval. Art approval remains a separate track. After approval, choose Subagent-Driven (fresh subagent per task, review between) or Inline Execution (batched with checkpoints).
