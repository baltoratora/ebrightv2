# Evolve — Gameplay Design (draft spec)

**Date:** 2026-10-20 · **Branch:** `feat/evolve-gameplay` (branched from committed art branch `feat/evolve-art-system` @ `58a0535`)
**Status:** **DRAFT — NOT APPROVED.** Written for Iqbal's review. No gameplay code until the written spec is approved.
**Builds on:** `docs/superpowers/specs/2026-10-20-evolve-art-system-design.md` (art system, science fact table). The science notes in that spec are authoritative and are **preserved, not restated loosely, here**; every gameplay abstraction is labelled **[game simplification]**.

---

## 0. Scope and non-goals

**In scope (v1 gameplay):** the simulation, economy, mutation system, event/extinction timeline, two win modes, save/resume, and the `/evolve` run UI that consumes the already-built art components.

**Explicit non-goals (v1):** fully terrestrial play (see §11), multiplayer, leaderboards (the site has a D1 leaderboard pattern; wiring Evolve into it is deferred), user-supplied raster backgrounds (optional art slot already exists), and final numeric balancing constants (the spec fixes the *shapes* and invariants; constants are `TODO(balance)` and set by playtest).

**Design cadence (approved):** real-time clock; the world runs during spreading and population change; **auto-pause** on mutation offers, response-required events, extinction briefings, and period transitions; informational toasts do not pause. Manual pause + speed (1×/2×/3×). After any decision, stays paused until the player resumes. Pauses on hidden tab; **no offline simulation in v1**.

**Tone (approved):** children-inclusive, encouraging, positive framing. Threats are telegraphed with actionable counters — **no unavoidable extinction rolls**. A wrong single choice is a setback, not a game-over. Every run ends with a short, kind debrief: what happened and what to try next.

---

## 1. Science integrity (the five clarifications)

This section answers the specific points raised in review. The rule from the art spec stands: **do not invent events; distinguish ordinary environmental change from the two Big Five mass extinctions; the lineage is one possible branch, not a ladder.**

### 1.1 "Cold Deep" bundles two *distinct* real phenomena — flagged as a simplification

Real environmental facts, **sourced separately** (not as one thing):

- **Cold deep water** is a general oceanographic fact: the deep ocean is cold (~0–4 °C) regardless of period. This is a property of depth, not of any extinction.
- **Low oxygen / anoxia** is **not** a permanent property of all deep water. Widespread marine anoxia is tied to **specific events** — notably the **Late Devonian Kellwasser and Hangenberg anoxic pulses** — and to oxygen-minimum zones, not to "deep = always anoxic." (Source: art spec fact table, Late Devonian extinction entry.)
- The **Late Ordovician** extinction mechanism is **glacial cooling + sea-level fall (Hirnantian glaciation)** — a *cold/shallow-habitat-loss* driver, **not** primarily anoxia. (Source: art spec fact table.)

**[game simplification]** The gameplay region "**Cold Deep**" merges "cold" and "low-oxygen" into a single harsh-environment attribute purely for playable region variety. The in-UI science note will state this explicitly: *"Game region. Real deep water is cold everywhere; widespread low-oxygen (anoxia) is tied to specific events like the Late Devonian pulses, not to depth itself."* The two **extinction mechanisms stay modelled separately** (Ordovician = cooling/sea-level; Devonian = anoxia/reef collapse), so the simplification never contaminates the sourced extinction science.

### 1.2 What the "Shore / Tidal Flats" region represents

It represents **submerged shallows with periodic air exposure (intertidal/estuarine margins)** — **not** sustained land occupation. Mechanically it is a water region whose environment includes exposure/air-contact risk. This matches the Devonian evidence: tetrapodomorphs such as *Tiktaalik* were **shallow-water animals** that could prop in shallows and possibly tolerate brief air exposure, but were **not terrestrial** (art spec fact table). Occupying it needs **lobed limbs** (move through very shallow water) **plus air-gulping** (tolerate low-O₂ / brief exposure) — and even then it is a *margin*, not land.

### 1.3 Why fully terrestrial play is deferred

Sustained land life requires a **suite** of adaptations beyond this fictional branch's four-period arc: weight-bearing limbs with digits, lungs for sustained air breathing, desiccation-resistant skin, and land-tolerant reproduction. The earliest tetrapod *body* fossils are **Late Devonian** (*Acanthostega*, *Ichthyostega*) and true terrestrial radiation is **Carboniferous** (art spec fact table). Forcing land into v1 would either (a) imply a false ladder (*"lobed fins → walking on land"*), contradicting the art spec's honesty rules, or (b) demand new art + a different biomechanics model. Deferring land keeps the science honest and scopes v1.

### 1.4 How the Devonian ending still feels like a transition toward land

The payoff is **reaching the threshold, not crossing it**:

- The Devonian frontier region (**Tidal Flats / Shore**) is the farthest your branch reaches — the water's edge, with early-forest silhouettes on the far shore (art already renders this).
- Surviving the **Late Devonian pulses** while established at the margin is the climactic act.
- The **end-of-run debrief** frames it honestly and hopefully: *"Your lineage stands at the water's edge — one possible branch poised at the threshold of land. True land life is another story, for another age."* A locked **Terrestrial Lowlands** region is visible but labelled *"beyond this branch — a future chapter (Carboniferous)."*
- This seeds a clearly-scoped future project (a Carboniferous terrestrial chapter) without over-claiming now.

---

## 2. The world changes across periods (dynamic region graph)

The world is **not one static habitat graph.** There is a single **master region set**, but each region carries **per-period state**: whether it is *available*, its *carrying capacity*, its *environment attributes* (which drive fitness), and which *edges* are open. Periods reshape the map — regions appear, expand, contract, and connect — reflecting real paleoenvironmental change and giving the four periods distinct strategic texture.

### 2.1 Master region set (8: 7 playable + 1 locked)

| # | Region | Nature | Core environment attributes |
|---|---|---|---|
| R1 | **Nursery Shallows** (start) | shallow marine cradle | temperate, oxygenated, low predation, modest capacity |
| R2 | **Reef Shelf** | warm shallow reef | warm, high capacity, **high predation/competition** |
| R3 | **Open Ocean** | pelagic | open, mobile; rewards sustained swimming |
| R4 | **Cold Deep** | deep harsh | cold + **[game simplification]** low-O₂ (see §1.1), low light |
| R5 | **Estuary** | brackish margin | variable salinity, gateway inland |
| R6 | **River Lowlands** | freshwater | fresh (needs salt regulation), sheltered |
| R7 | **Tidal Flats / Shore** | intertidal margin (§1.2) | periodic air exposure, temperature swings, low-O₂ shallows |
| R8 | **Terrestrial Lowlands** | land | **LOCKED in v1** (§1.3) |

### 2.2 Per-period availability, capacity trend, and open edges

Capacity trend is relative (↑ expanding, ↓ contracting, — steady, ✕ unavailable). "New edges" lists connectivity that *opens* that period.

| Region | Cambrian | Ordovician | Silurian | Devonian |
|---|---|---|---|---|
| R1 Nursery Shallows | available, — | available, ↓ late (glaciation) | available, ↑ (recovery) | available, — |
| R2 Reef Shelf | available (small) | ↑ (reefs expand, +predation) | ↑ | ↑ then ✕-collapse in Late-Dev pulses |
| R3 Open Ocean | present, **low fit** | present, low fit | **viable** (paired fins) ↑ | ↑ |
| R4 Cold Deep | ✕ | opens late (cooling) | available | available |
| R5 Estuary | ✕ | ✕ | **opens** (osmoregulation) | available ↑ |
| R6 River Lowlands | ✕ | ✕ | ✕ | **opens** (via Estuary) |
| R7 Tidal Flats/Shore | ✕ | ✕ | ✕ | **opens** (lobed limbs + air-gulping) |
| R8 Terrestrial | ✕ locked | ✕ locked | ✕ locked | ✕ locked (visible, labelled) |

**Edges (open ocean/shelf web first, inland/margin later):**
- **Cambrian:** R1–R2, R1–R3 (R3 low-fit). Shallow marine web only (life is marine; §ref art spec).
- **Ordovician:** + R2–R3, + R3–R4 (R4 opens late, gated by cold tolerance).
- **Silurian:** + R1–R5 (Estuary opens), R5 thrives with osmoregulation; R3 becomes a strong node with paired fins.
- **Devonian:** + R5–R6 (River, gated osmoregulation), + R5–R7 (Tidal Flats, gated lobed-limbs + air-gulping), + R7–R8 (**locked**).

The world-state per period is data (`regions.ts` + `eras.ts`): each region has an array of per-era overrides `{ available, capacityFactor, env, openEdges }`. Transitions **apply** these at period change (and extinctions apply additional capacity shocks — §7).

### 2.3 "Available / occupied / inaccessible" are distinct, visible states

- **Inaccessible:** region not available this period, or no open/un-gated edge reaches it. Inspector shows *why* and *what would help* (trait or period).
- **Colonizing:** population present but below the establishment threshold (§4.4).
- **Occupied:** population ≥ establishment threshold. Only **occupied** regions count toward Dominate targets and the diversity bonus.
- **Declining / thriving:** sign of net growth this tick, with the **limiting factor named** (e.g., *"declining — too cold; Cold tolerance would help"*).

---

## 3. Trait tree and trade-offs

Four art-backed traits carry gameplay effects; the remainder are **stat-only** (no new art). **Trade-offs make "buy everything" a bad strategy** — via opportunity cost (finite EP), context-dependence (good here, bad there), and one **mutually-exclusive** pair. Trade-offs are never cruel: no trait actively harms you everywhere; downsides are situational or ceilings. Traits are **period-gated** (buyable only once that period is reached) per the art spec's trait ledger, extended.

| Trait | Art? | Unlock | Benefit | Trade-off |
|---|---|---|---|---|
| **Bony armour** | ✅ | Ordovician | +predation survival, +event resilience | −growth & −spread speed (heavier) |
| **Jaws** | ✅ | Silurian | +feeding → +growth, +capacity use, +competition | +vulnerability to food-scarcity events |
| **Paired fins** | ✅ | Silurian | +spread speed, unlocks strong Open Ocean, +event dodge | mild anti-synergy with heavy armour |
| **Lobed limbs** | ✅ | Devonian | **shallow/shore movement** → Tidal Flats; props in shallows | −efficiency in open/deep water; **no land** |
| **Cold & low-O₂ tolerance** | — | Ordovician | opens Cold Deep; insurance vs cooling/anoxia events | −growth in warm regions (metabolic cost) |
| **Osmoregulation** | — | Silurian | opens Estuary; (with Devonian) River | small marine-efficiency cost |
| **Air-gulping (buccal)** | — | Devonian | low-O₂ + brief-exposure resilience; pairs w/ lobed limbs | energy upkeep (slightly −growth when unused) |
| **Reproduction: Fast (r)** | — | Ordovician | fast growth + fast recovery after setbacks | **lower capacity ceiling**; worse in crashes |
| **Reproduction: Resilient (K)** | — | Ordovician | higher ceiling + event resilience | slow growth + slow recovery |

**Reproduction is one exclusive choice** (pick r **or** K, not both), re-specifiable later only via a rare mutation — a deliberate strategic identity so the tree can't be fully owned.

**Cambrian is intentionally trait-light:** no traits unlock in the Cambrian. Early game is pure spreading across the open shallow web, so **first expansion never depends on a trait or a mutation roll** (achievability, §6.3 + §8).

Trait effects are pure modifiers on the fitness/growth/spread functions (§4), data-defined in `traits.ts`, so balancing is config, not code.

---

## 4. Population & spread rules

All simulation is a **pure, seedable** function `tick(state, dtMs, rng) → state`. Within a tick, for each available region the lineage touches:

### 4.1 Fitness (how well current adaptations suit a region, this period)

`fitness(region, traits, period) ∈ [fMin, fMax]` combines region environment attributes against the player's trait set. Examples: armour raises fitness where predation is high (Reef Shelf) and lowers it where speed matters (Open Ocean); cold tolerance raises fitness in Cold Deep and lowers it in warm regions. Fitness is **continuous**, so a missing trait means *poor* fit (slow/negative growth), **not a hard zero** — except where an edge is explicitly **gated** (§4.5).

### 4.2 Carrying capacity

`K(region, period) = baseCapacity(region) × capacityFactor(period) × fitnessCapScale(fitness)`. Period factors expand/contract capacity (§2.2); extinctions apply shocks (§7). Fitness scales the *usable* share of a region's capacity.

### 4.3 Logistic growth

Per region, population `P` moves toward `K` logistically:
`dP = growthRate × fitness × P × (1 − P/K) × dt`, clamped. Reproduction trait sets `growthRate` and the `K` ceiling (r: high rate, low ceiling; K: low rate, high ceiling). Negative when `P > K` or fitness is poor → recoverable decline, with the limiting factor surfaced.

### 4.4 Establishment threshold (occupancy)

A region becomes **Occupied** when `P ≥ establishmentThreshold = max(absFloor, occupancyFraction × K)`. Below it the region is **Colonizing** and does **not** count for Dominate or diversity. This enforces "*occupied = established population, not a single migrant*."

### 4.5 Spread along edges (automatic, gated)

Spreading is automatic: an **Occupied** region seeds **migrants** into each connected, available region along **open edges**. Migration inflow `∝ spreadRate × sourceP × edgeConductance`. `edgeConductance` depends on the edge and traits:
- **Open edges** (e.g. Nursery↔Reef): full conductance regardless of traits → early expansion always possible.
- **Soft-gated edges** (e.g. Nursery↔Open Ocean): low conductance without the helpful trait (paired fins), high with it → viable but slow without, never zero.
- **Hard-gated edges** (e.g. Estuary↔River needs osmoregulation; Estuary↔Tidal Flats needs lobed-limbs + air-gulping): conductance ≈ 0 until the trait is owned. Hard gates are only ever on **later/optional** regions, never on a period's required Dominate set (§6.3).

Spread speed and reach are modifiers, so paired fins (and events) visibly change expansion.

---

## 5. Evolution Points (EP) economy

### 5.1 Earning (anti-runaway + catch-up, both required)

EP accrues over game-time:
`dEP = [ popTerm + diversityTerm + eventBonuses + catchUp ] × dt`

- **popTerm = k_pop × f(totalOccupiedPop)** where `f` is **sub-linear (sqrt/log)** → a big lead yields diminishing EP, preventing runaway snowball.
- **diversityTerm = k_div × (number of Occupied regions)** → rewards breadth (and incidentally extinction-resilience), capped.
- **eventBonuses** — one-off EP for surviving telegraphed events / meeting milestones.
- **catchUp** — if the player is struggling (few Occupied regions, or population below a danger line, or just took a setback), a small EP floor + an "adaptation insight" nudge so they can always afford a corrective trait. **No lockout, no death spiral.** catchUp → 0 as the player recovers.

### 5.2 Spending

EP is spent on **traits** (shop, §3) and **mutation picks** (§6, usually discounted). Trait costs rise modestly with tier; early traits are cheap. No other sink in v1 (YAGNI). All costs are `TODO(balance)` config.

### 5.3 Balancing invariant

The economy config must satisfy: *a player who makes reasonable choices on normal difficulty can afford the traits required to (a) survive each telegraphed event and (b) meet each Dominate target, within that period's time budget.* A unit test asserts the required-trait EP cost per period ≤ attainable EP under a reference play trace.

---

## 6. Mutation system

Two acquisition channels (matches the approved loop: *purchase traits* **and** *random mutation offers*):

1. **Shop** — deliberate: spend full EP on any unlocked trait, any time (while paused).
2. **Mutation offers** — periodic: the sim auto-pauses and presents **a choice of 3** mutations. These are **discounted or situational** access to tree traits, plus a few **mutation-only minor variants** (small tunable buffs). The player **picks one or declines** (decline → partial EP refund).

**Offer rules:**
- **Context-weighted** so offers are *actionable*: when a cold region or a cooling event is near, cold tolerance is more likely to appear; the offer text says what it would help with. This satisfies "*show which adaptations would help*."
- **Never the sole path** to a period's required expansion (open/soft edges always exist) → "*early expansion doesn't require one specific mutation roll*."
- **Deterministic from seed+cursor** (§9) for testability and exact resume.
- Positive framing: you always choose a *beneficial* adaptation; the only "cost" is opportunity (you pick one of three; exclusivity rules still apply, e.g. r/K).

---

## 7. Event & extinction timeline

Events are **scheduled per period** against the game clock (not literal geological durations — the art spec's "durations are geological, not pacing" note stands). Each event is **telegraphed** (advance warning via auto-pause briefing), **names its basis**, **shows the counter**, and causes a **recoverable** regional effect. Game abstractions are labelled; sourced facts are reused from the art spec verbatim.

| Period | Ordinary events (examples) | Boundary event |
|---|---|---|
| **Cambrian** | mild sea-level / oxygenation shifts (small capacity nudges) | → Ordovician: **ordinary transition** (no extinction) |
| **Ordovician** | predation rise (Reef), diversification (capacity ↑), late cooling onset | → **Late Ordovician mass extinction (Big Five #1)** |
| **Silurian** | sea-level recovery (capacity ↑), reef expansion, first-plants flavour | → Devonian: **ordinary transition** (no extinction) |
| **Devonian** | shoreline/freshwater opening, forest-edge flavour, pre-pulse stress | → **Late Devonian mass extinction (Big Five #2), two pulses** |

### 7.1 Late Ordovician extinction (one event, cooling-driven)

Basis (art spec): Hirnantian glaciation + sea-level fall; ~85% marine species. **Mechanic:** strong capacity shock to **shallow** regions (Nursery, Reef) + a cold penalty. **Counters shown in briefing:** cold tolerance, depth flexibility (Cold Deep), and spread breadth. Preparation sets how much population survives — **not a roll**.

### 7.2 Late Devonian extinction (two pulses, anoxia/reef-collapse)

Basis (art spec): **Kellwasser (~372 Ma)** and **Hangenberg (~359 Ma)** pulses. **Mechanic:** two telegraphed shocks; **Reef Shelf collapses** (R2 → ✕), low-O₂ stress across shallows. **Counters:** low-O₂ tolerance, air-gulping, and being spread off the reefs (Estuary/River/Tidal Flats/Open Ocean). Two-pulse structure = two separate briefings and shocks.

**No invented extinctions** at the two ordinary boundaries — those are environmental transitions only.

---

## 8. Modes (one simulation, different objectives)

Both modes run the **same sim, regions, traits, economy, events**. They differ only in objective and end conditions. Difficulty settings tune margins over shared core rules.

### 8.1 Shared end condition

**Extinction ends either mode:** if total population across all regions falls below an extinction floor (effectively zero), the run ends with a debrief. This is the **only** true game-over in Survival.

### 8.2 Survival

**Goal:** don't go extinct; **reach the end of the Devonian** (past both Late Devonian pulses). No occupation targets. Forgiving on normal — but **preparation and adaptation matter** (ignore the telegraphs and you can still be driven to extinction over time). Victory = you're still established when the Devonian closes.

### 8.3 Dominate

**Goal:** same survival constraint **plus** a per-era **occupation target** that must be met by the era's transition.

- Target is expressed over **Occupied** regions available that era — e.g. *"occupy ≥ N of the M regions available this period"* and/or *"reach ≥ X% of available carrying capacity."* (`TODO(balance)` picks N, X per era.)
- The HUD **always shows** the target and the **remaining time**, and warns **early** when the player is falling behind (projected to miss).
- **Miss handling (recovery window, §8.4).**
- Final victory = meet the **Devonian** target while surviving the pulses.

### 8.4 Recovery window (Dominate only)

If an era's target is missed at the transition, the player gets **exactly one** clearly-explained, **time-limited recovery window** (a short grace extension with the target and a specific hint on what's short — regions/traits). If the target is met during the window → continue normally. If still missed → **the Dominate run ends** (debrief). One per run (not per era): using it is a one-time lifeline. *(This reflects the approved correction: a missed target after the recovery window ends a Dominate run; extinction ends either mode.)*

### 8.5 Achievability invariant (verifiable)

**Design invariant:** *every per-era Dominate target is satisfiable using only regions available in that era (§2.2) and traits unlockable by that era (§3), within that era's time + EP budget (§5.3).* Concretely:
- Cambrian target ⊆ shallow marine web reachable with **no traits**.
- Ordovician target achievable with **armour / reproduction** (predation + stability); Cold Deep is optional, never required.
- Silurian target achievable with **jaws / paired fins / osmoregulation**.
- Devonian target achievable with the Devonian kit; it may include a frontier region but **never requires** the locked land (R8).
A unit test encodes this invariant against the region/trait/target config so balancing can't silently break it.

---

## 9. Save / resume

- **Deterministic sim:** all randomness flows through a **seedable PRNG** (`rng.ts`) advanced by an integer **cursor**. Persisting `{seed, cursor}` + state makes resume **bit-exact**.
- **Versioned schema:**
  ```
  EvolveSave {
    schemaVersion: number
    mode: "survival" | "dominate"
    difficulty: "relaxed" | "normal" | "hard"
    rngSeed: number
    rngCursor: number
    sim: SimState          // regions, populations, traits, period, clock, economy
    objectives: ObjState   // dominate targets, recovery-window-used flag
    savedAt: ISOstring
  }
  ```
- **Autosave:** on every auto-pause, on a periodic interval, and on tab-hide (since there is no offline sim).
- **Error handling (data safety):** validate schema on load; on **version mismatch** run a migration if available, else **fail safe** — keep the old save, show *"this save is from an older version"*, and offer **Start new run** rather than crashing or silently discarding. On **corruption/parse failure**, **never silently zero** the save: preserve the raw string under a backup key and offer a fresh run.
- **Slots:** one active-run slot in v1 + a per-mode **best result** record. No cloud sync.

---

## 10. UX / screens (reuse built art)

- **Route `/evolve`** (thin `app/evolve/page.tsx` wrapper → `"use client"` component), linked from `/thinking` (add to the `GAMES` array + a hub card).
- **Start screen:** mode (Survival/Dominate) + difficulty + a one-screen how-to; "Resume" if a save exists.
- **Run screen** composes existing components — `Environment` (current era), `Creature` (current form + owned visual traits), **interactive** `RegionMap` (select a region to inspect), real HUD (population, EP, period + date, speed/pause) — plus new gameplay panels:
  - **Region inspector:** status (thriving/declining/colonizing/inaccessible), the **named limiting factor**, and **which adaptation would help** (your transparency requirement).
  - **Evolution panel:** period-gated trait shop with costs and **trade-offs shown**.
  - **Mutation modal** (auto-pause): choice of 3 + decline.
  - **Event / extinction briefing modal** (auto-pause): basis, effect, counters.
  - **Dominate tracker:** target, progress, countdown, early-warning state.
- **End screen:** encouraging debrief — what happened, what helped/hurt, what to try next; best-result line.
- **Accessibility:** `prefers-reduced-motion` respected (resting frames), keyboard-operable controls, visible focus, readable child-friendly copy. Scoped `--evo-*` tokens; no site neon.

---

## 11. Architecture / modules (repo pattern: pure logic + Vitest)

Build out the **deferred** folders (`lib/evolution/{sim,events,save}`); keep logic pure and tested, components thin.

```
app/evolve/page.tsx                 thin wrapper
lib/evolution/
  sim/
    rng.ts            seedable PRNG (seed + cursor); pure
    state.ts          SimState / ObjState types
    regions.ts        master region set + per-era overrides + edges
    fitness.ts        fitness(region, traits, period)
    capacity.ts       K(region, period, fitness)
    spread.ts         edge conductance + migration
    economy.ts        EP earn (sub-linear + diversity + catchUp) + costs
    tick.ts           pure tick(state, dtMs, rng) → state (orchestrates above)
    modes.ts          Survival/Dominate objectives, recovery window, end checks
  events/
    events.ts         ordinary events per period (telegraph + effect + counter)
    extinctions.ts    Late Ordovician; Late Devonian (two pulses)
    schedule.ts       game-clock scheduling + briefings
  traits/traits.ts    EXTEND existing: gameplay fields (effects, trade-offs, gates)
  save/save.ts        versioned localStorage, validation, fail-safe, migration hook
  *.test.ts           fitness, spread/occupancy, economy anti-runaway + catchUp,
                      determinism (seed+cursor resume), mode win/lose + recovery,
                      event effects, ACHIEVABILITY INVARIANT (§8.5), save round-trip + corruption
components/evolution/  reuse Environment, Creature, RegionMap (make interactive),
                      HUD (promote SampleHud → real), + new panels/modals above
```

No new npm dependencies. Existing gates apply: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Feature branch only; never commit to `main`; `main` auto-deploys to Cloudflare, so merging = going live.

---

## 12. Pacing

- Target **20–40 min/run** via **game-clock budgets per era** (loosely proportional to the eras, **not** literal geological spans — honesty note stands) + 1×/2×/3× speed and auto-pause.
- Constants (`growthRate`, EP coefficients, capacities, trait costs, era time budgets, Dominate N/X) are `TODO(balance)` in a single tunable config module, set by playtest. A balancing checklist ships with the plan.

---

## 13. Science simplification ledger (abstractions, labelled)

| Gameplay abstraction | Reality (sourced in art spec) | How surfaced |
|---|---|---|
| "Cold Deep" = cold **+** low-O₂ in one region | Deep = cold (oceanography); anoxia = event-driven (Late Devonian), not depth | §1.1 + in-UI region note |
| Shore region = occupiable intertidal margin | *Tiktaalik* etc. were shallow-water, **not** terrestrial | §1.2 + region note |
| Land locked / deferred | Tetrapods Late Devonian; land radiation Carboniferous | §1.3 + locked-region label |
| Era time budgets drive pacing | ICS durations are geological, independent of pacing | §12 + existing eras.ts note |
| Lineage traverses four forms | One **possible branch**, not a ladder / not a tetrapod | existing art-spec honesty rules, reused |
| Region map geography | Illustrative, not a paleogeographic reconstruction | existing REGION_MAP note |

---

## 14. Open items for review / later balancing

- Exact **Dominate N/X per era** and all numeric constants (`TODO(balance)`, playtest).
- Whether **difficulty** presets ship in v1 or just "normal" (recommend: ship relaxed/normal/hard as margin multipliers only — shared core rules).
- Whether to wire the site **D1 leaderboard** (deferred; recommend after balancing).
- Optional user-supplied **era raster backgrounds** (art slot already exists; deferred).

---

**Review gate:** This is a **draft for Iqbal's review**. After review and any revisions, approval is requested separately. Only then does implementation (writing-plans → code) begin. No gameplay code is written before approval.
