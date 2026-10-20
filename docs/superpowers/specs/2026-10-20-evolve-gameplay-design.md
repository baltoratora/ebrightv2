# Evolve — Gameplay Design (draft spec)

**Date:** 2026-10-20 · **Branch:** `feat/evolve-gameplay` (from committed art branch `feat/evolve-art-system` @ `58a0535`)
**Status:** **DRAFT — NOT APPROVED.** For Iqbal's review. No gameplay code until the written spec is approved.
**Builds on:** `2026-10-20-evolve-art-system-design.md` (art + science fact table). Those science notes are authoritative and preserved; gameplay abstractions are labelled **[game simplification]**.

### Revision 2 — changes from Rev 1 (this review round)
1. **Cambrian agency** — added scientifically-grounded baseline adaptations + a "first few minutes" walkthrough (§3.1, §14).
2. **Population maths** — explicit **births − deaths** with signed per-capita net growth; poor fit now declines even when `P<K`; zero-capacity/unavailable behaviour + non-negativity + stability defined (§4).
3. **Migration** — snapshot-based, capped outflow, order-independent, conserves population (§4.5).
4. **Occupancy/objectives** — establishment uses **baseline** capacity + **hysteresis** (disasters no longer make a region easier to "occupy"); **one** Dominate metric chosen (§4.4, §8).
5. **Event/transition ordering** — explicit pipeline, boundary sequence, Devonian-target timing vs the pulses, second-miss behaviour, worked timeline proving targets can't shift at the deadline (§7).
6. **Real-Earth map** — kept: **original simplified paleogeographic map per period**, habitats embedded in geography (NOT an abstract graph). Flagged as an art/data extension beyond the committed art milestone (§2).
7. **Economy/determinism** — one-off grants separated from per-second income; mutation decline reward defined; **fixed simulation timestep** independent of render/speed; pending decisions + event progress + RNG persisted so resume can't duplicate rewards or reroll (§5, §6, §9).
8. **Science** — verified against sources (§1.5). **Deep ocean was warm, not cold** in the early Paleozoic (cold abyss is Cenozoic); real deep hazard = **anoxia**. **Temperature and oxygen split into separate region attributes and separate tolerance traits.** "Cold Deep" → **"Deep Anoxic Water."** Terrestrial deferral reconfirmed (amniotes = Carboniferous).
9. **Provisional normal-difficulty numbers** added for a complete playable run (§14).

---

## 0. Scope, cadence, tone

**In scope (v1):** simulation, economy, mutations, event/extinction timeline, two modes, save/resume, `/evolve` run UI consuming built art + four new per-period maps.
**Non-goals (v1):** terrestrial play (§1.3), multiplayer, D1 leaderboard wiring, user raster backgrounds, final balance constants (§14 gives a concrete provisional set).

**Cadence (approved):** real-time clock on a **fixed simulation timestep** (§9.1); world runs during spreading/population change; **auto-pause** on mutation offers, response-required events, extinction briefings, period transitions; info toasts don't pause. Manual pause + speed (1×/2×/3×, which change only how fast real time maps to sim time, never the step size). Stays paused after a decision until resumed. Pauses on hidden tab; **no offline sim**.

**Tone (approved):** children-inclusive, encouraging. Threats telegraphed with actionable counters — **no unavoidable rolls**. One wrong choice = setback, not game-over. Kind end-of-run debrief.

---

## 1. Science integrity (verified)

Rule (from art spec) stands: **no invented events; distinguish ordinary change from the two Big Five extinctions; the lineage is one possible branch, not a ladder.** Rev 2 corrects claims against sources (§1.5).

### 1.1 Temperature and oxygen are SEPARATE attributes (corrected)

**Correction:** It is **wrong** to model early-Paleozoic deep water as cold (~0–4 °C). That cold abyss is a **Cenozoic icehouse feature** (cold polar bottom-water formation, Eocene–Oligocene onward). The Cambrian–Devonian was a **hot greenhouse** with **warm deep water**; the real deep/offshore hazard was **low oxygen (anoxia/dysoxia)**, which was the *background state* of deep water until deep-ocean oxygenation after **~380 Ma** (late Middle/Late Devonian). [§1.5 A, B, C]

Consequences for the model:
- Each region carries **two independent environment attributes**: **temperature** (`cold | temperate | warm`) and **oxygen** (`oxic | dysoxic | anoxic`), plus light/predation/salinity/exposure.
- **Two separate tolerance traits** (not one combined trait): **Thermal tolerance** and **Hypoxia (low-oxygen) tolerance** (§3).
- Baseline early-Paleozoic seas are **warm**. **Cold** appears as a **transient event**: the **Late Ordovician Hirnantian glaciation** (~445–443 Ma) — a real, brief cold + sea-level fall shock — not a permanent cold region. [§1.5 A]
- The deep region is **warm + anoxic** → gated by **hypoxia tolerance**, not cold tolerance.
- **[game simplification]** flagged in-UI: temperature and oxygen are coarse 3-level attributes; absolute Paleozoic temperatures are debated, so the UI says "very warm greenhouse," never a thermometer value. [§1.5 A]

### 1.2 "Shore / Tidal Flats" = submerged shallows with periodic exposure

Represents **intertidal/estuarine margins** — submerged shallows with **periodic air exposure**, **not** sustained land. Matches the evidence: Devonian tetrapodomorphs (*Tiktaalik* ~375 Ma) and even the earliest tetrapods (*Acanthostega*, *Ichthyostega*, Late Devonian ~365 Ma) were **aquatic/shallow-water**, not terrestrial. [§1.5 D] Occupying it needs **lobed limbs** (shallow movement) + **air-gulping** (brief exposure + low-O₂ shallows).

### 1.3 Why terrestrial play is deferred (reconfirmed, stronger sourcing)

Sustained land life requires a **suite**: air-breathing **lungs**, weight-bearing **limbs with digits** + reinforced skeleton, **desiccation-resistant skin**, and **water-independent reproduction** (the **amniotic egg**). The earliest tetrapod bodies are **Late Devonian and still aquatic**; full terrestrial independence (**amniotes**, e.g. *Hylonomus* ~318 Ma) is **Carboniferous** (a 2025 trackway study hints origins may be slightly earlier — debated). [§1.5 D] Forcing land into v1 would imply a false ladder and need a different biomechanics model + new art. **Land stays locked.**

### 1.4 The Devonian ending is "reaching the threshold," honestly

Payoff = **arrive at the water's edge, don't cross it**: reach the **Tidal Flats / Shore** frontier (early-forest silhouettes already rendered on the far shore), **survive the Late Devonian pulses** while established at the margin, and get an honest, hopeful debrief: *"Your lineage stands at the water's edge — one possible branch poised at the threshold of land. True land life is another age's story (the Carboniferous)."* A locked **Terrestrial Lowlands** is visible, labelled as a future chapter.

### 1.5 Sources (newly verified this round)
- **A. Climate:** [Ocean temperatures through the Phanerozoic reassessed (PMC9142518)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9142518/); [An early Cambrian greenhouse climate (Science Advances)](https://www.science.org/doi/10.1126/sciadv.aar5690); [Late Ordovician Mass Extinction (National Science Review)](https://academic.oup.com/nsr/article/11/1/nwad319/7478030)
- **B. Deep-ocean temperature:** [Deep ocean temperatures through time (Climate of the Past, 2021)](https://cp.copernicus.org/articles/17/1483/2021/); [Deep-water production in the early Cenozoic (Nature)](https://www.nature.com/articles/nature02639)
- **C. Oxygenation:** [Dynamic deep marine oxygenation during the Early–Middle Paleozoic (PMC12407078)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12407078/); [Stepwise oxygenation of the Paleozoic atmosphere (Nature Communications)](https://www.nature.com/articles/s41467-018-06383-y); [Late Devonian extinction (Wikipedia)](https://en.wikipedia.org/wiki/Late_Devonian_mass_extinction)
- **D. Terrestrialization:** [Tiktaalik (Wikipedia)](https://en.wikipedia.org/wiki/Tiktaalik); [Vertebrate land invasion (Wikipedia)](https://en.wikipedia.org/wiki/Vertebrate_land_invasion); [Tetrapod colonization of land (Univ. of Maryland GEOL 104)](https://www.geol.umd.edu/~tholtz/G104/lectures/104land.html); [Earliest amniote tracks recalibrate the timeline (PMC12119326)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12119326/)
- **E. Paleogeography:** [The Early Paleozoic (Univ. of Maryland GEOL 102)](https://www.geol.umd.edu/~tholtz/G102/lectures/102earlypaleo.html); [Baltica (Wikipedia)](https://en.wikipedia.org/wiki/Baltica); [List of paleocontinents (Wikipedia)](https://en.wikipedia.org/wiki/List_of_paleocontinents)
- **F. Cambrian chordates:** [Myllokunmingia (Wikipedia)](https://en.wikipedia.org/wiki/Myllokunmingia); [Metaspriggina (Wikipedia)](https://en.wikipedia.org/wiki/Metaspriggina); [A long-headed Cambrian soft-bodied vertebrate (PMC11267725)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11267725/)

---

## 2. The real, changing Earth (per-period paleogeographic maps)

**Decision (honours "lineage spreading across real, changing Earth"):** v1 uses an **original, simplified paleogeographic map per period** — four maps — with **gameplay habitats embedded as regions within the geography**, **not** an abstract habitat graph. Continents/oceans are drawn from sourced paleogeography (§1.5 E), labelled *"illustrative — original, not a reconstruction."*

> **Scope flag (your call, not silently assumed):** this **extends** the committed art milestone, which shipped **one** neutral illustrative map. Four per-period map datasets + simplified continent backdrops are **new data/art work**. It reuses the existing `RegionMap` rendering approach (regions are data), so it is data-driven, but it is additional content. If you'd rather ship v1 with a single stylised map and defer per-period maps, say so — I will not substitute an abstract graph without your decision.

### 2.1 Habitat region set (7 playable + 1 locked); geography shifts per period

Each **region = a habitat type anchored to a paleogeographic place** that period. Habitat type carries the environment attributes; the place moves/forms/breaks as continents drift.

| # | Region (habitat) | Temp | Oxygen | Other | Gameplay role |
|---|---|---|---|---|---|
| R1 | **Nursery Shallows** (start) | warm | oxic | low predation, modest K | cradle |
| R2 | **Reef Shelf** | warm | oxic | predation **low in Cambrian, rises Ordovician+**, high K | rich; occupiable no-trait early, contested later; collapses Late Devonian |
| R3 | **Open Ocean** (pelagic) | warm | oxic | mobility-rewarding | strong once paired fins exist |
| R4 | **Deep Anoxic Water** *(was "Cold Deep")* | **warm** | **anoxic** | low light, high pressure | hypoxia-gated frontier + extinction **refuge** from surface shocks |
| R5 | **Estuary** | warm | oxic/dysoxic | **variable salinity** | gateway inland |
| R6 | **River Lowlands** | warm | oxic | **freshwater** | sheltered, needs salt regulation |
| R7 | **Tidal Flats / Shore** | warm, **swings** | **dysoxic shallows** | **periodic air exposure** (§1.2) | Devonian frontier (lobed limbs + air-gulping) |
| R8 | **Terrestrial Lowlands** | — | — | land | **LOCKED v1** (§1.3) |

### 2.2 Per-period geography, availability, capacity trend, and open edges

Geography per §1.5 E. Capacity trend: ↑ expand, ↓ contract, — steady, ✕ unavailable.

**Cambrian** — continents dispersed; Gondwana south, **Laurentia equatorial**, Baltica/Siberia; **Panthalassa** + opening **Iapetus**. Life marine only; land barren.
- Available: **R1** (Gondwanan/epeiric warm shallow shelf), **R2** (Laurentian equatorial reef shelf — archaeocyathid reefs; **low Cambrian predation → occupiable without armour**), **R3** (Panthalassa/Iapetus pelagic, **low fit** without fins).
- Edges: R1–R2 (open), R1–R3 (soft).

**Ordovician** — Gondwana drifts **over the South Pole**; **Hirnantian ice sheet late**; Avalonia rifts off; **Iapetus narrowing, Rheic opening**. GOBE; reefs expand; armoured jawless fish.
- Available: R1 —, R2 ↑ (reefs expand, +predation), R3 (low fit), **R4 opens** (offshore deep, anoxic).
- Edges: + R2–R3, + R3–R4 (hypoxia-gated).
- **Boundary:** → **Late Ordovician mass extinction** (Hirnantian cold + sea-level fall; shallow-shelf capacity crash; deep/offshore are refugia).

**Silurian** — **Baltica + Laurentia collide → Laurussia** (Caledonian orogeny); Iapetus closing; **Rheic** wide; warm. First jawed fish + paired fins; first vascular land plants.
- Available: R1 ↑ (recovery), R2 ↑, R3 **viable** (paired fins), R4 —, **R5 opens** (Laurussian brackish coasts).
- Edges: + R1–R5 (salinity-penalised without osmoregulation).
- **Boundary:** → Devonian: **ordinary transition** (no extinction).

**Devonian** — **Euramerica / "Old Red Sandstone continent"** straddling the **equator**; Gondwana south drifting north; **Rheic narrowing**. Age of Fishes; **first forests ~385 Ma**; rivers/estuaries/shores expand. Late Devonian anoxic pulses.
- Available: R1 —, R2 ↑ then **✕ collapse** (Late-Dev pulses), R3 ↑, R4 —, R5 ↑, **R6 opens** (freshwater, via Estuary), **R7 opens** (intertidal frontier). R8 visible, locked.
- Edges: + R5–R6 (osmoregulation-gated), + R5–R7 (lobed-limbs + air-gulping-gated), + R7–R8 (**locked**).
- **Boundary (chapter end):** → **Late Devonian mass extinction, two pulses** — **Kellwasser (~372 Ma)**, **Hangenberg (~359 Ma)**; anoxia + reef collapse; counters = hypoxia tolerance, air-gulping, spread off reefs/shallows.

Per-period state is data: each region has `{ available, place, capacityFactor, temp, oxygen, openEdges }` overrides applied at transitions; extinctions apply additional shocks (§7).

### 2.3 Region states (visible, distinct)
- **Inaccessible** — not available this period, or no open/ungated edge reaches it. Inspector shows **why** + **what would help** (trait or period).
- **Colonizing** — present but below establishment (§4.4).
- **Occupied** — at/above establishment (hysteresis). Only Occupied counts for Dominate + diversity.
- **Thriving/Declining** — sign of net growth, with the **named limiting factor** (e.g. *"declining — too little oxygen; Hypoxia tolerance would help"*).

---

## 3. Trait tree and trade-offs

Four art-backed traits carry gameplay; the rest are stat-only (no new art). **Trade-offs make "buy everything" wrong** (finite EP, context-dependence, one exclusive pair). Downsides are situational/ceilings, never cruel. Period-gated per the art-spec ledger, **extended with separate thermal/hypoxia traits**.

| Trait | Art? | Unlock | Benefit | Trade-off |
|---|---|---|---|---|
| **Bony armour** | ✅ | Ordovician | +predation survival, +event resilience | −growth & −spread (heavier) |
| **Jaws** | ✅ | Silurian | +feeding → +growth/capacity, +competition | +food-scarcity vulnerability |
| **Paired fins** | ✅ | Silurian | +spread, unlocks strong Open Ocean, +event dodge | mild anti-synergy w/ heavy armour |
| **Lobed limbs** | ✅ | Devonian | shallow/shore movement → Tidal Flats | −open/deep efficiency; **no land** |
| **Thermal tolerance** | — | Ordovician | survive **Hirnantian cold snap** + temp swings | −growth in stable-warm regions (metabolic) |
| **Hypoxia (low-O₂) tolerance** | — | Ordovician | opens **Deep Anoxic**; survives anoxic pulses | −efficiency in well-oxic shallows |
| **Osmoregulation** | — | Silurian | opens Estuary; (Devonian) River | small marine-efficiency cost |
| **Air-gulping (buccal)** | — | Devonian | brief-exposure + low-O₂ **shallow** resilience; pairs w/ lobed limbs | energy upkeep (−growth when unused) |
| **Reproduction: Fast (r)** ⊕ **Resilient (K)** | — | Ordovician | r: fast growth+recovery · K: high ceiling+resilience | **exclusive**; r: low ceiling · K: slow recovery |

**Thermal and hypoxia are deliberately separate** (your §8 point): the Hirnantian threat is *cold*; the deep-water and Late-Devonian threats are *low-oxygen*. A player can specialise.

### 3.1 Cambrian agency — what you actively decide in the first few minutes

The Cambrian is **not** passive. Traits in the table above unlock Ordovician+, so to give the Cambrian real decisions **without gating expansion on a purchase or mutation roll**, the Cambrian adds cheap **baseline adaptations** — scientifically defensible for early chordate-grade animals (filter feeding, early eyes, myomere swimming; feeding mode is *inferred*, flagged in-UI) [§1.5 F]:

| Baseline adaptation | Unlock | Effect | Note |
|---|---|---|---|
| **Suspension/filter feeding** ⊕ **Benthic grazing** | Cambrian | niche identity: filter → +fit in plankton-rich open/shelf shallows; benthic → +fit on seabed/shelf floor | exclusive ecological choice; *inferred feeding mode* |
| **Early eyes / photoreception** | Cambrian | +foraging efficiency (+growth), +event **awareness** (better warning lead time) | sourced in vertebrate-grade taxa |
| **Streamlined swimming (myomeres)** | Cambrian | +spread speed / +dispersal | well-supported for all early chordates |

**First few minutes, concretely:**
1. **Start screen:** choose **mode** (Survival/Dominate) + **difficulty**.
2. **Opening choice (auto-paused):** pick a **niche** — *filter feeding* (favours spreading into open shelf/water) or *benthic grazing* (favours holding shelf-floor shallows). This is a free identity pick, not a gate.
3. **Direct spreading:** set a **spread focus** (which neighbouring region migrants prioritise) — R1→R2 (reef shelf) is **open to all** (no trait needed), so expansion always begins immediately.
4. **Spend the early EP trickle** on cheap baseline adaptations (eyes/swimming) **or** bank EP toward Ordovician armour — a real short-vs-long trade-off.
5. **Respond** to the first mild ordinary events and the first **mutation offer** (free pick of 3; §6).

So within minutes the player has made a niche identity choice, a spread-direction choice, a spend-now-vs-save choice, and an event response — with expansion already underway and **no dependence on a specific roll**.

---

## 4. Population & spread (explicit births/deaths; snapshot migration)

All simulation is a **pure, seedable, fixed-step** function `tick(state, rng) → state` advancing one `SIM_DT` (§9.1).

### 4.1 Fitness
`fitness(region, traits, period) = f ∈ [0,1]`, combining the region's temperature, oxygen, predation, salinity, exposure, and light against the player's traits/niche. Continuous: a missing trait → **poor** fit (low `f`), not an automatic zero — except where an **edge is hard-gated** (§4.5). Examples: hypoxia tolerance raises `f` in Deep Anoxic; thermal tolerance raises `f` during the Hirnantian cold shock; armour raises `f` where predation is high and lowers it where speed matters.

### 4.2 Carrying capacity
`K(region, period) = K_base(region) × capacityFactor(period) × eventFactor(t)`. `K_base` is fixed per region (§14); period and events scale it. **`K_base` is the stable reference** used by occupancy (§4.4) — capacity shocks never change `K_base`.

### 4.3 Growth as explicit births minus deaths (signed net)
Per region, per step, from the step's snapshot:
```
births  B = r_max · f · P · (1 − P/K)         // density-limited; scales with fitness; 0 at P≥K or K≤0
deaths  D = ( m_base + (1 − f) · m_stress + m_event ) · P   // rises as fitness falls / during events
dP_growth = B − D                              // SIGNED: negative when fit is poor even if P < K
```
- **Poor-fit decline:** per-capita net at small `P` ≈ `r_max·f − m_base − (1−f)·m_stress`. With §14 constants this is **negative for `f < ~0.5`**, so a badly-adapted region **declines even when `P < K`** (fixes the Rev 1 logistic flaw). Good fit → a graded equilibrium `P* < K`.
- **Zero capacity / unavailable region** (`K ≤ 0` or `available=false`): `B = 0`, deaths apply → `P` decays toward 0 (habitat loss). Emigration (§4.5) can still rescue population out first.
- **Non-negativity + stability:** fixed `SIM_DT`; clamp losses so `D·SIM_DT ≤ P` (can't kill more than exist); clamp births to headroom `(K − P)`; `P_next = clamp(P + dP, 0, K)`; if `P < extinctionFloor` locally set `P = 0`. Bounded rates × fixed step ⇒ no oscillation/blowup.

### 4.4 Occupancy — baseline-referenced, with hysteresis
```
Occupied   when P ≥ establishHigh = 0.25 · K_base    // NOTE: K_base, not current K
Colonizing when P <  establishLow  = 0.15 · K_base
```
- Thresholds use **`K_base`**, so a disaster that cuts **current** `K` does **not** make a region easier to "occupy" (fixes the Rev 1 flaw). To count as Occupied you still need an **absolute** established population.
- **Hysteresis band** (0.15–0.25·K_base) prevents status flicker around the line. Only **Occupied** feeds Dominate targets and the diversity bonus.

### 4.5 Spread — snapshot, capped, order-independent, conserving
Spreading is automatic. Each fixed step, **after** growth, in a dedicated migration sub-step:
1. **Snapshot** all region populations `P0`.
2. For each **Occupied** source `s`: total outflow `O_s = min(maxEmigFrac · P0[s], Σ_e demand_e)`, where per-edge `demand_e = conductance(e, traits) · headroom(dest) ` and `headroom = max(0, K_dest − P0[dest])`. Distribute `O_s` across its open edges **proportionally to `demand_e`**.
3. Accumulate **deltas** from `P0` only: `Δ[s] −= flow_e`, `Δ[dest] += flow_e`.
4. **Apply all deltas simultaneously** after every flow is computed.
- Because all flows read `P0` (not partially-updated values), the result is **independent of region iteration order**.
- `O_s ≤ maxEmigFrac·P0[s]` ⇒ **no source goes negative**; capping each inflow by destination headroom ⇒ **no overfill**; population is **conserved** (sum unchanged by migration).
- **Edge conductance:** *open* (full, trait-independent — guarantees early expansion), *soft-gated* (low without the helpful trait, high with — never zero), *hard-gated* (≈0 until the trait is owned; only ever on later/optional regions, never a period's required Dominate set — §8.5).

---

## 5. Evolution Points (EP) economy

### 5.1 Two cleanly separated income paths (fixes the dt bug)
- **Per-second income** (accrues with `SIM_DT`): `incomeRate = k_pop · sqrt(totalOccupiedPop) + k_div · occupiedRegionCount + catchUp`. EP added each step = `incomeRate · SIM_DT`. **Sub-linear (`sqrt`)** on population ⇒ **no runaway snowball**.
- **One-off grants** (NOT multiplied by dt): discrete `grantEP(amount)` fired **once** when an event is survived / a milestone is hit, flagged **claimed** in state so a resume can't re-grant (§9).
- **Catch-up** (prevents lockout): if `occupiedRegionCount ≤ 1` or population is below a danger line or a setback just occurred, add a small EP floor + surface an "adaptation insight" hint. `catchUp → 0` as the player recovers.

### 5.2 Spending
EP buys **traits** (shop, §3) and nothing else in v1 (YAGNI). Costs in §14. Mutations are **free to accept** (§6) — they are not an EP sink.

### 5.3 Balance invariant (tested)
Config must satisfy: *a reasonable normal-difficulty player can afford the traits needed to (a) survive each telegraphed event and (b) meet each Dominate target within that era's time + EP budget.* A unit test checks required-trait EP cost per era ≤ attainable EP on a reference trace.

---

## 6. Mutation system

Two channels (matches the approved loop):
1. **Shop** — deliberate: spend EP on any unlocked trait while paused.
2. **Mutation offers** — periodic (every `mutationInterval`, and at era transitions): auto-pause, present **3** context-weighted options. **Accepting is free** (a spontaneous beneficial adaptation); you may **accept one or decline**.
   - **Decline reward:** since offers have **no upfront cost**, declining grants a small **`declineEP`** consolation ("unspent adaptive potential") — defined, not a refund of a non-existent cost.
   - **Context-weighting** makes offers actionable (a nearby cold/anoxic threat raises the odds of the matching tolerance; the card says what it helps with) → supports "show which adaptation would help."
   - **Never the sole path** to a period's required expansion (open/soft edges always exist) → no "one specific roll" gate.
   - Some strong traits are **shop-only**; the mutation pool is cheaper/situational picks + occasional early access. Exclusivity (r/K, feeding niche) still applies.
   - **Deterministic:** the 3 options are rolled from `rng(seed, cursor)`; the **open offer (its exact 3 options) is persisted** (§9) so a resume shows the **same** offer, never a reroll.

---

## 7. Event & extinction timeline + ordering

Events are scheduled on the **game clock** (not literal geological durations — the art-spec note stands). Each is **telegraphed** (advance warning, auto-pause), **names its basis**, **shows the counter**, and causes a **recoverable** regional effect. Sourced facts reused verbatim; abstractions labelled.

### 7.1 Per-period schedule
| Period | Ordinary events (examples) | Boundary |
|---|---|---|
| Cambrian | mild oxygenation / sea-level nudges | → Ordovician: **ordinary** |
| Ordovician | predation rise (Reef), diversification (K↑), late cooling onset | → **Late Ordovician extinction** (Hirnantian cold + sea-level fall) |
| Silurian | sea-level recovery (K↑), reef expansion | → Devonian: **ordinary** |
| Devonian | shoreline/freshwater opening, pre-pulse stress | → **Late Devonian extinction, two pulses** (Kellwasser, Hangenberg; anoxia + reef collapse) |

- **Late Ordovician (one event):** shallow regions (R1, R2) `eventFactor ×0.4`; cold fitness penalty to **surface** regions unless **thermal tolerance**; **Deep Anoxic / offshore are refugia** (unaffected by surface cooling). Counter: thermal tolerance, depth refuge, spread breadth. Not a roll.
- **Late Devonian (two pulses):** **Kellwasser** → Reef `×0.3` + anoxia fitness penalty to shallows unless **hypoxia tolerance**; **Hangenberg** → Reef `→ 0` (collapse) + broader anoxia. Two separate warnings + shocks. Counter: hypoxia tolerance, air-gulping, spread off reefs/shallows.
- **No invented extinctions** at the two ordinary boundaries.

### 7.2 Fixed per-step pipeline (deterministic order)
Each running `SIM_DT` step, in this exact order:
1. `advanceClock(SIM_DT)`
2. `fireDueWarnings()` → if any, enqueue briefing and **auto-pause** (player reads/acts; sim halts until resume)
3. `applyDueShocks()` (shock time always strictly **after** its warning)
4. `growthMortality()` (§4.3, from snapshot)
5. `migration()` (§4.5, snapshot)
6. `updateOccupancy()` (§4.4, hysteresis)
7. `economy()` — per-dt income + any **one-off grants** triggered this step (claimed-flagged)
8. `boundaryCheck()` (below)

### 7.3 Boundary sequence (at an era deadline)
1. The era's extinction **shocks already fired as scheduled events before the deadline** (telegraphed), so the world is already in its post-shock state.
2. **Survival:** no objective check — continue into transition.
3. **Dominate — objective check** against the era's **fixed** target `N_era` (shown since era start):
   - **Met** → period transition.
   - **Not met & recovery unused** → grant the **one-per-run recovery window**: fixed extra time `recoverySecs`, **same** target, with a specific hint (which regions/traits are short); set `recoveryUsed = true`; continue the **same** era; re-check at window end.
   - **Not met & (recovery already used, or this is the recovery re-check)** → **Dominate run ends** (debrief).
4. **Period transition:** apply next era's availability/capacity/edges, unlock next-era traits, load its event schedule, auto-pause transition briefing.

**Devonian target timing (explicit):** `N_Devonian` is evaluated at the **Devonian deadline**, which is **after** Kellwasser, Hangenberg, **and** reef closure (all scheduled earlier in the Devonian, each telegraphed). The target **number is fixed from Devonian start**; only the **world** changes (reef gone), predictably and with warning. The achievability invariant (§8.5) guarantees `N_Devonian` is reachable using regions that **survive** the pulses (never the reef, never land).

### 7.4 Worked timeline — Devonian, Dominate (targets cannot shift at the deadline)
Era budget 10:00 (sim-min at 1×), `N_Devonian = 4`, recovery `1:30`.
```
00:00  Devonian begins. HUD: "Occupy 4 of 7 regions by 10:00." Target = 4 (fixed, shown now).
       Available: Nursery, Reef, Open Ocean, Deep Anoxic, Estuary, River, Tidal Flats.
04:00  WARNING (auto-pause): Kellwasser anoxic pulse incoming. Counter: hypoxia tolerance / spread off reef.
04:30  SHOCK: Reef K ×0.3; shallow anoxia penalty (mitigated by hypoxia tolerance).
08:00  WARNING (auto-pause): Hangenberg pulse incoming; reef will collapse. Progress shown: e.g. 3/4.
08:30  SHOCK: Reef → 0 (collapse); broader anoxia.
10:00  DEADLINE. Count Occupied regions (target STILL 4 — unchanged since 00:00).
         • If ≥4 non-reef regions Occupied (e.g. Nursery, Open Ocean, Estuary, River) → WIN → (chapter end).
         • If 3 and recovery unused → recovery window to 11:30, same target 4, hint: "River needs Osmoregulation."
             – reach 4 by 11:30 → continue;  still 3 → Dominate run ends.
         • If 3 and recovery already used earlier → run ends now.
```
The target integer never changes at the deadline; the reef's telegraphed collapse is the only change, and ≥4 non-reef regions remain occupiable with Devonian traits — so the deadline is fair.

---

## 8. Modes (one simulation)

Same sim/regions/traits/economy/events; modes differ only in objective + end conditions. Difficulty tunes margins over shared rules.

### 8.1 Shared end
**Extinction ends either mode:** total population below an extinction floor across all regions → run ends with a debrief. In Survival this is the **only** game-over.

### 8.2 Survival
Don't go extinct; **reach the end of the Devonian** (past both pulses). No occupation targets. Forgiving on normal — but ignoring telegraphs can still drive you extinct. Victory = still established at Devonian close.

### 8.3 Dominate — single metric (chosen)
**One metric for v1:** **occupy ≥ `N_era` of the regions available that era** (count of Occupied regions, per §4.4). The "%-capacity" alternative is **dropped** for v1 (ambiguity + it interacts badly with capacity shocks). HUD always shows the target, current count, countdown, and an **early "falling behind"** projection. Plus the shared extinction end. Final victory = meet `N_Devonian` while surviving the pulses.

### 8.4 Recovery window (Dominate)
**One per run.** On a missed deadline with the window unused: fixed `recoverySecs` extension, same target, explicit hint. Meet it → continue. Miss it, **or** miss any later deadline after the window is used → **run ends** (§7.3).

### 8.5 Achievability invariant (tested)
*Every `N_era` is satisfiable using only regions available that era (§2.2) and traits unlockable by that era (§3), within its time+EP budget (§14); for the Devonian, satisfiable using the **post-extinction** surviving region set.* Provisional targets:

| Era | Regions available | `N_era` | Achievable with (no hard-gated reliance) |
|---|---|---|---|
| Cambrian | 3 (R1,R2,R3-low-fit) | **2** | R1+R2 — **no trait required** |
| Ordovician | 4 (+R4) | **2** | R1+R2 (armour for reef predation); R4 optional |
| Silurian | 5 (+R5) | **3** | R1+R2+R3 (paired fins) or +R5 (osmoregulation) |
| Devonian | 7 (R2 collapses) | **4** | R1+R3+R5+R6 (osmoregulation) — **excludes reef & land** |

A unit test encodes this table against region/trait/target config so balancing can't silently break it.

---

## 9. Save / resume (no duplicated rewards, no rerolls)

### 9.1 Fixed-step determinism
- Sim advances in **fixed `SIM_DT`** steps. Real elapsed × speed is accumulated and consumed in whole steps; **rendering interpolates** but never drives sim state. Step size is **independent of frame rate and speed setting** → deterministic and reproducible.
- All randomness flows through a **seedable PRNG** (`rng.ts`) advanced by an integer **cursor**; persisting `{seed, cursor}` + state makes resume **bit-exact**.

### 9.2 Versioned schema
```
EvolveSave {
  schemaVersion: number
  mode: "survival" | "dominate"
  difficulty: "relaxed" | "normal" | "hard"
  rngSeed: number
  rngCursor: number
  clock: { period, elapsedInPeriod, totalElapsed }
  sim: { regions:[{id,P,occState}], traits:[...], niche, economy:{ep}, ... }
  objectives: { targets, occupiedCount, recoveryUsed, recoveryDeadline? }
  schedule: { firedWarnings:[...], firedShocks:[...], claimedGrants:[...] }   // event progress
  pendingDecision?: { kind:"mutation"|"event", options:[...], context } // exact open offer
  savedAt: ISOstring
}
```
- **`claimedGrants` + `firedShocks/Warnings`** make rewards/shocks **idempotent** — a resume can't re-grant EP or re-fire a shock.
- **`pendingDecision`** persists the **exact** open mutation/event (its rolled options) → resume shows the **same** decision, never a reroll.

### 9.3 Autosave + error handling (data safety)
- Autosave on every auto-pause, on interval, and on tab-hide (no offline sim).
- On load: **validate schema**. Version mismatch → run a migration if available, else **fail safe** (keep old save, show "older version", offer **Start new run**). Parse/corruption → **never silently zero**; preserve the raw string under a backup key and offer a fresh run.
- One active-run slot + per-mode **best result**. No cloud sync.

---

## 10. UX / screens (reuse built art + new maps)
- **Route `/evolve`** (thin `app/evolve/page.tsx` → `"use client"` component), linked from `/thinking` (GAMES array + hub card).
- **Start:** mode + difficulty + one-screen how-to; Resume if a save exists.
- **Run:** composes `Environment` (era), `Creature` (form + owned visual traits), **interactive per-period `PaleoMap`** (new; select a region to inspect), real HUD (population, EP, period+date, speed/pause) + new panels: **region inspector** (status, **named limiting factor**, which adaptation helps), **evolution/trait shop** (period-gated, trade-offs shown), **mutation modal**, **event/extinction briefing**, **Dominate tracker** (target/progress/countdown/early-warning).
- **End:** encouraging debrief — what happened, what helped/hurt, what to try next; best-result line.
- `prefers-reduced-motion` respected; keyboard-operable, visible focus; child-friendly copy; scoped `--evo-*` tokens.

---

## 11. Architecture / modules (pure logic + Vitest)
Build the deferred `lib/evolution/{sim,events,save}`; logic pure + tested, components thin.
```
app/evolve/page.tsx                 thin wrapper
lib/evolution/
  sim/ rng.ts | state.ts | regions.ts (master set + per-period geography/overrides/edges)
       fitness.ts | capacity.ts | population.ts (births/deaths) | spread.ts (snapshot migration)
       economy.ts (per-dt income + one-off grants + catchUp) | niche.ts (Cambrian baselines)
       tick.ts (fixed-step orchestrator) | modes.ts (objectives, recovery, end checks)
  events/ events.ts | extinctions.ts (Hirnantian; Kellwasser+Hangenberg) | schedule.ts
  traits/traits.ts   EXTEND: gameplay fields, thermal/hypoxia split, trade-offs, gates
  maps/paleo.ts      4 per-period paleogeographic datasets (continents + habitat placements)
  save/save.ts       versioned localStorage, validation, fail-safe, migration, pendingDecision
  *.test.ts          fitness; births/deaths (poor-fit decline; K≤0; non-negativity);
                     migration (order-independence + conservation + caps);
                     occupancy hysteresis vs capacity shock; economy (sqrt anti-runaway;
                     grants not dt-scaled; catchUp); determinism (fixed-step + resume no dup/reroll);
                     modes (win/lose + recovery + second-miss); ACHIEVABILITY INVARIANT (§8.5);
                     save round-trip + corruption + version-mismatch
components/evolution/ reuse Environment, Creature; new interactive PaleoMap; promote SampleHud→HUD; panels/modals
```
No new npm deps. Gates: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Feature branch only; `main` auto-deploys to Cloudflare (merge = live).

---

## 12. Pacing
- **20–40 min/run** via **era time budgets** (loosely proportional, **not** literal geological spans) × speed (1×/2×/3×) on a fixed step. Provisional budgets (§14) sum to **30 sim-min at 1×** (≈10 min at 3×).

---

## 13. Science simplification ledger (labelled)
| Gameplay abstraction | Reality (sourced §1.5) | Surfaced |
|---|---|---|
| Temp & oxygen = 3-level attributes | absolute Paleozoic temps debated; redox varied | §1.1 + region notes |
| **Deep Anoxic = warm + low-O₂** (not cold) | early-Paleozoic deep water **warm + anoxic**; cold abyss is Cenozoic | §1.1 + region note |
| Cold appears only as the **Hirnantian** event | Late Ordovician glaciation ~445–443 Ma | §7.1 |
| Shore = occupiable intertidal margin | Devonian tetrapodomorphs were aquatic, not terrestrial | §1.2 |
| Land locked / deferred | full terrestriality (amniotes) = Carboniferous | §1.3 |
| Era budgets drive pacing | ICS durations are geological, not pacing | §12 |
| Four forms along one lineage | one **possible branch**, not a ladder / not a tetrapod | art-spec honesty rules |
| Original per-period maps | illustrative, not a reconstruction | §2 map labels |
| Cambrian feeding-niche choice | feeding modes are **inferred** from morphology | §3.1 note |

---

## 14. Provisional normal-difficulty numbers (concrete starting point; `TODO(balance)`)
Abstract "population units" (pu). **These demonstrate a complete run and will move during playtest.**

**Timestep & pacing:** `SIM_DT = 0.25 s` (sim). Speeds: 1× = 1 sim-s/real-s, 2×, 3×. **Era budgets (sim-min @1×):** Cambrian 5 · Ordovician 8 · Silurian 7 · Devonian 10 (**= 30 min**).

**Region baseline capacity `K_base` (pu):** Nursery 100 · Reef 150 · Open Ocean 120 · Deep Anoxic 80 · Estuary 90 · River 70 · Tidal Flats 60. **Start:** 10 pu in Nursery.

**Population rates (per sim-second):** `r_max = 0.05` · `m_base = 0.005` · `m_stress = 0.04` → net per-capita at low P ≈ `0.05f − 0.005 − 0.04(1−f)`; **break-even ≈ f = 0.5** (f<0.5 declines; f=1 → `P*≈0.9·K`; f=0.75 → `≈0.6·K`). `extinctionFloor = 0.5 pu/region`; global extinction if total < `1 pu`.

**Fitness:** `f ∈ [0,1]`; matched tolerance in a hostile region moves `f` from ~0.2 (unadapted) to ~0.8 (adapted).

**Occupancy:** `establishHigh = 0.25·K_base`, `establishLow = 0.15·K_base` (e.g. Nursery occupied at **25 pu**, drops at **15 pu**).

**Migration:** `maxEmigFrac = 0.1 /s`; inflow capped by destination headroom. Soft-gate conductance ≈ 0.2× open; hard-gate ≈ 0 without trait.

**Economy:** `k_pop = 0.2`, `k_div = 0.5` → `incomeRate = 0.2·sqrt(totalPop) + 0.5·occupiedCount (+ catchUp)` EP/s. One-off **event-survival grant = +15 EP**. `catchUp` floor = **+0.5 EP/s** when `occupiedCount ≤ 1`. Mutation **declineEP = +5**.

**Trait costs (EP):** baseline Cambrian adaptations 10 · reproduction r/K 25 · thermal tol 30 · armour 30 · osmoregulation 35 · hypoxia tol 35 · jaws 40 · paired fins 40 · air-gulping 40 · lobed limbs 50.

**Mutations:** `mutationInterval = 90 s` + one at each era transition; 3 options, context-weighted.

**Dominate targets:** Cambrian 2 · Ordovician 2 · Silurian 3 · Devonian 4 (§8.5). **Recovery window = 90 s**, one per run.

**Extinction shocks:** Hirnantian — Nursery+Reef `eventFactor ×0.4`, surface cold penalty (`−0.3 f` without thermal tol), deep/offshore unaffected. Kellwasser — Reef `×0.3` + shallow anoxia (`−0.3 f` without hypoxia tol). Hangenberg — Reef `→ 0` + broad anoxia.

**Reference run (sanity):** start Nursery → spread R1→R2 (open) in Cambrian (hit target 2, no traits) → buy armour + pick r/K in Ordovician, survive Hirnantian via depth/thermal (target 2) → paired fins/osmoregulation in Silurian, occupy 3 → lobed limbs/air-gulping/hypoxia in Devonian, spread off the reef before Hangenberg, occupy 4 non-reef regions, survive both pulses → Survival win / Dominate win. Demonstrates every system engages within 30 sim-min.

---

## 15. Open items for review / later balancing
- All §14 constants (`TODO(balance)`, playtest).
- Per-period **paleogeographic maps** confirmed as a v1 art/data extension (§2 scope flag) — your decision.
- Ship **relaxed/normal/hard** as margin multipliers over shared rules (recommended) vs normal-only.
- D1 **leaderboard** wiring — deferred (recommend post-balance).
- Optional user **raster era backgrounds** — deferred (art slot exists).

---

**Review gate:** draft for Iqbal's review. After review + revisions, approval is requested separately; only then does implementation (writing-plans → code) begin. No gameplay code before approval.
