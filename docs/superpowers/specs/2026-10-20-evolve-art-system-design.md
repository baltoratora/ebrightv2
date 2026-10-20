# Evolve — Art System & Style-Test Route (design spec)

**Date:** 2026-10-20 · **Branch:** `feat/evolve-art-system`
**Scope of THIS milestone:** art system + the `/evolve/style-test` preview route **only**. No simulation, economy, events, timing, or gameplay. Those are deferred.

A later, separate project builds the game (`/evolve`) on top of this art system.

---

## 1. Science fact table (review gate)

Primary timescale source: **ICS International Chronostratigraphic Chart v2024/12** ([stratigraphy.org](https://stratigraphy.org/ICSchart/ChronostratChart2024-12.pdf)). v1 covers **four consecutive periods, no skip**.

| Period | Span (Ma, ICS 2024/12) | Documented facts used | Artistic simplification |
|---|---|---|---|
| **Cambrian** | 538.8 → 486.85 | Cambrian Explosion; life **marine only**; earliest fish-like chordates exist (*Haikouichthys*, *Myllokunmingia*, ~518 Ma) | fictional soft swimmer; colours |
| **Ordovician** | 486.85 → 443.1 | Great Ordovician Biodiversification Event; **armoured jawless fish** (*Arandaspis*, *Sacabambaspis*, ~480–470 Ma) with head/body armour, caudal fin, **no paired fins**; first non-vascular land plants (cryptospores ~470 Ma) | reef/seabed shapes stylised |
| **Silurian** | 443.1 → 419.62 | **First jawed vertebrates** (early Silurian ~439 Ma, *Qianodus*; ~436 Ma *Xiushanosteus*); **earliest paired fins** ~436 Ma (galeaspids, *Fanjingshania*); **first vascular land plants** (*Cooksonia*, mid–late Silurian); reefs expand | far-shore plants as silhouettes |
| **Devonian** | 419.62 → 358.86 | "Age of Fishes" (placoderms, **lobe-finned fish**, early sharks); **earliest forests Middle Devonian ~385 Ma** (Cairo & Gilboa, NY; *Eospermatopteris*); *Archaeopteris* forests spread later; **tetrapodomorphs** like *Tiktaalik* (~375 Ma) have paired **lobe-fins but are NOT tetrapods**; earliest tetrapod **body** fossils are Late Devonian (*Acanthostega*, *Ichthyostega*, Famennian); debated tetrapod **trackways** at Zachełmie, Poland (~390 Ma, Eifelian) — contested | shoreline/land-edge cues; fictional lobe-finned form |

### Transitions (distinguish ordinary vs mass extinction — do not invent events)

| Boundary | Type | Basis |
|---|---|---|
| Cambrian → Ordovician | **ordinary transition** | environmental change (sea-level, climate); no Big Five event |
| Ordovician → Silurian | **mass extinction (Big Five #1)** | Late Ordovician mass extinction ~445–443 Ma; Hirnantian glaciation + sea-level fall (± volcanism/anoxia debated), ~85% marine species |
| Silurian → Devonian | **ordinary transition** | environmental change; no Big Five event |
| End of Devonian (chapter end) | **mass extinction (Big Five #2), as pulses** | Late Devonian extinction — **Kellwasser ~372 Ma** and **Hangenberg ~359 Ma** pulses |

### Trait timing ledger (earliest evidence → diversification → game unlock)

| Trait | (a) Earliest evidence | (b) Main diversification | (c) Game unlock period | Simplification? |
|---|---|---|---|---|
| Bony armour (head/body) | Ordovician ~480–470 Ma (*Arandaspis*) | Ordovician–Silurian ostracoderms | Ordovician | none (a≈c) |
| Jaws | early Silurian ~439 Ma (*Qianodus*) | Devonian "Age of Fishes" | Silurian | none (a≈c) |
| Paired fins | early Silurian ~436 Ma (galeaspids) | Devonian | Silurian | none (a≈c) |
| Lobed limbs (proto-limb fins) | Devonian lobe-fins; tetrapodomorphs ~375 Ma | Late Devonian onward | Devonian | framed as *one possible branch*, not a tetrapod |

### Honesty rules (surfaced as short in-UI "science notes")
- **Not a ladder.** The four forms are *possible branches of one fictional lineage*, not proof a real species walked this path. The Devonian lobe-finned form is *one* possible branch; it is **not** labelled a tetrapod.
- **No invented extinctions.** Only the real Late Ordovician and Late Devonian (pulsed) events are mass extinctions; other boundaries are ordinary transitions.
- **Durations are geological, not game pacing.** Era data stores real ICS spans; run pacing (20–40 min target) is decided later during balancing and is independent of geological duration.
- **Maps are approximate.** Region geography is original, simplified, and labelled "illustrative — not a paleogeographic reconstruction."
- Where a trait's game-unlock period differs from its earliest evidence, the ledger + in-UI note flag it as a simplification.

Biology sources: [Cambrian](https://en.wikipedia.org/wiki/Cambrian) · [Ordovician](https://en.wikipedia.org/wiki/Ordovician) · [Sacabambaspis](https://en.wikipedia.org/wiki/Sacabambaspis) · [Oldest jawed vertebrates (*Nature* 2022)](https://www.nature.com/articles/s41586-022-05136-8) · [Evolution of paired fins](https://en.wikipedia.org/wiki/Evolution_of_paired_fins) · [Cooksonia](https://www.britannica.com/plant/Cooksonia) · [Oldest forest (Smithsonian)](https://www.smithsonianmag.com/science-nature/385-million-year-old-fossils-reveal-worlds-oldest-forest-had-modern-tree-roots-180973810/) · [Tetrapod](https://en.wikipedia.org/wiki/Tetrapod) · [Zachełmie trackways](https://en.wikipedia.org/wiki/Zachelmie_trackways) · [Late Ordovician mass extinction](https://en.wikipedia.org/wiki/Late_Ordovician_mass_extinction) · [Late Devonian extinction](https://en.wikipedia.org/wiki/Late_Devonian_extinction)

---

## 2. Art direction

**"Illustrated natural-history, flat vector with layered depth."** Calm, awe, ancient seas; a warm scientific-plate feel — a cohesive world, not a dashboard.

- **Scoped palette** (`--evo-*`) applied on the game root only, separate from the site's deep-space neon tokens. Neutrals + four era sub-palettes, all low-saturation. Defined in `lib/evolution/palette.ts` and mirrored as CSS vars.
- **Stroke/shape:** minimal outlines — prefer value contrast over strokes; organic bezier bodies; flat fills + at most one 2-stop linear gradient per shape for volume; **no heavy shadows, neon, or glassmorphism**.
- **Typography:** Plus Jakarta Sans (UI); JetBrains Mono (dates, `Ma`, numeric HUD). Reuse existing fonts; no new font deps.
- **Environments:** five layers — distant water/atmosphere → seabed/shoreline → habitat details → creature → foreground accents. **Optional raster background-image layer** (user supplies later) behind the SVG; SVG must look complete without it.
- **Motion:** gentle ambient drift/sway/parallax; **`prefers-reduced-motion` disables all** (render the resting frame). Decorative layers use `pointer-events: none`.

---

## 3. Creature system (modular, deterministic)

- **Shared frame:** one `viewBox="0 0 260 160"`, lineage faces left (head low-x, tail high-x).
- **Named attachment points** (normalized 0–1 within viewBox; resolved to coords in `parts.ts`):

| Point | Approx (x,y) | Used by |
|---|---|---|
| mouth | 0.14, 0.52 | simple mouth / jaws (exclusive) |
| eyes | 0.22, 0.42 | eye parts |
| dorsal | 0.46, 0.22 | dorsal fin/ridge |
| flank | 0.46, 0.66 | paired fins / lobed limbs (exclusive) |
| underside | 0.50, 0.86 | belly accents / limb anchor |
| tail | 0.86, 0.50 | caudal fin |

- **Parts** carry: `id`, attachment point, `origin`, `scale`, `rotation`, `layer` (z-order), `paletteRole` (so colours inherit from the active era sub-palette). A part is an SVG path/group factory taking `(idPrefix, palette)`.
- **Four forms** (one fictional finned-swimmer lineage; visibly kin via shared body + inherited palette, distinct silhouettes):
  1. **Cambrian** — small soft chordate swimmer: smooth body, simple mouth, simple eyes, finned tail.
  2. **Ordovician** — armoured jawless: bony head/body shield, simple mouth, caudal fin, **no paired fins**.
  3. **Silurian** — jawed form: hinged jaws + **paired fins** (verification-supported), slimmer armour.
  4. **Devonian** — lobe-finned, shallow-water: broad head, sturdy **lobed flank fins / proto-limbs**, land-edge posture cue.
- **Toggleable adaptations (4, each a distinct attached change + label):** Armour, Jaws, Paired fins, Lobed limbs — see trait ledger. Each form ships a default trait set; toggles layer on/off.
- **Exclusivity rules:** `mouth-simple` ⊕ `jaws`; `flank-fin` ⊕ `lobed-limb`. Resolver drops the superseded part.
- **Deterministic render:** `renderDescriptor(formId, activeTraitIds)` → ordered layer list `{partId, transform, paletteRole}`. Same input ⇒ identical output (unit-tested). No randomness in rendering.
- **Unique IDs:** every `<Creature>` instance takes an `idPrefix` (from React `useId`) applied to all gradient/clip IDs so multiple creatures on one page never collide.
- **No clipping:** viewBox has margin padding so trait parts (dorsal fin, limbs) never overflow; verified visually.

---

## 4. Environment studies (4, one per period)

Each is an original layered SVG with its own era sub-palette and habitat character, same five-layer composition. Optional raster layer slot behind.

- **Cambrian** — deep, cool water column; muddy seabed; sponge/alga + microbial-mat silhouettes; drifting particles.
- **Ordovician** — brighter shallow sea; early reef mounds; more life silhouettes; sunlit shafts.
- **Silurian** — clear reef sea; **first small plants on the far shore** (Cooksonia-like silhouettes); sunlit.
- **Devonian** — warm shallow water meeting a muddy shoreline; **early-forest silhouettes at the land edge**; warm sky band.

**Region-map study:** one original, simplified vector map with rounded, selectable territory regions over a large ocean, labelled **"approximate — illustrative."** Not a copied paleogeographic reconstruction.

---

## 5. Trait icons

Small reusable SVG icons in the same visual language, one per demoed trait (armour, jaws, paired fins, lobed limbs) + two HUD markers (population, evolution points). Recognisable at ~20–24px; original paths; when used as controls they get accessible labels + visible focus.

---

## 6. Style-test route (`/evolve/style-test`)

Isolated preview, independent of any future sim. Full-screen, scoped palette, no site chrome.
- **Four-form comparison** row (all four lineage forms side by side).
- **Large active creature** inside its period environment.
- **Period switcher** (Cambrian/Ordovician/Silurian/Devonian) — swaps environment + default form + palette.
- **Trait toggles** that visibly update the active creature.
- **Region-map study.**
- **Sample HUD** — population, evolution points, period/date — clearly marked **"demo data."**
- **Dev-only collapsible panel**: toggle attachment-point markers + part boundaries; the toggle does not dominate the artwork.
- Desktop + usable mobile layout; reduced-motion respected; accessible controls with visible focus.

---

## 7. Module structure

```
app/evolve/style-test/page.tsx          thin wrapper
lib/evolution/
  palette.ts            --evo-* tokens + 4 era sub-palettes
  eras/eras.ts          4 periods: ICS dates (source comment), sub-palette ref, env config, region data, transition type
  creatures/parts.ts    attachment points, part geometry, origins/scale/rotation/layer, paletteRole
  creatures/lineage.ts  4 forms, default traits, trait→part rules, exclusivity, renderDescriptor
  traits/traits.ts      trait defs (ledger a/b/c + simplification flag) + icon id
  *.test.ts             attachment resolution, exclusivity, determinism, data integrity (4 eras, monotonic dates, ledger fields)
components/evolution/
  Creature.tsx          SVG renderer (idPrefix via useId)
  parts/*               part path components
  Environment.tsx       layered env + optional raster slot
  RegionMap.tsx         region-map study
  TraitIcon.tsx         icon set
  SampleHud.tsx         demo-data HUD
  DevPanel.tsx          collapsible dev controls + overlay
  StyleTest.tsx         preview composition
```
`sim/`, `events/`, `save/` are **deferred** (not created now). No new npm packages.

---

## 8. Deferred / assumptions needing later review
- Devonian land-edge framing is *one branch*, not a tetrapod claim (confirmed with user).
- Region map is illustrative; a reviewed per-era geography comes with gameplay.
- Era raster backgrounds optional; user supplies later.
- Browser visual inspection may be unavailable this session (Chrome extension not connected); if so, that's stated at handoff and left for user visual review.
