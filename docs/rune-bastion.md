# Rune Bastion

A standalone original 2D crystal-defense campaign at `/rune-bastion`. It replaces both removed Aether games. The Aether routes, catalogue entries, glyphs, components, engine, tests, documentation, model assets and unused Three.js packages have been deleted.

## Loop and controls

Choose an unlocked stage, survive three waves, earn Essence, invest in the permanent skill tree, and return stronger. There are 30 stages with increasing enemy health, speed and spawn pressure. Each stage ends with an elite. The crystal automatically fires at the closest foe; click/tap a foe to focus fire on it instead. Nova is available immediately (key 1). Frost (2) and Mend (3) require their skill-tree unlocks. Space pauses after focusing the arena; on-screen controls support touch. Tabs hide no active game state. Upgrades and respecs are blocked during an attempt. Switching away from the browser suspends simulation.

An attempt uses a fixed build snapshot. Each defeated normal enemy grants 1 Essence and each defeated elite grants 5. First clear bonus: 15 + 10 × stage. Replay clear bonus: 5 + 2 × stage. Kills and earned Essence are kept on defeat or retreat; neither unlocks a new stage. UI settlement is guarded so each attempt is applied once. Battle positions and mid-attempt HP are transient; permanent progression is saved at settlement. Closing the tab during an unfinished attempt discards its transient rewards.

## Skill tree

Three branches with three nodes each: Assault (damage, haste, additional targets), Sanctuary (integrity, armour, Mend), and Arcana (Nova, spell cooldowns, Frost). Each deeper node requires 2 ranks in its parent. Rank cost is 8 + 5r + 3r², with r the current rank. Ranks have finite caps and all costs are refunded on a free respec. Browser-local progress uses `ebright.rune-bastion.v1`; malformed saves and invalid prerequisites are validated. No accounts, multiplayer or purchases.

## Files

- `lib/rune-bastion.ts`: progression and deterministic transient simulation.
- `lib/rune-bastion.test.ts`: stage locks, exact upgrade costs, refund accounting, complete Stage 1 simulation, first/replay clear rewards, failure/retreat rewards, spell unlocks, cooldowns, deterministic ticks, corrupted saves and terminal-state guards.
- `components/rune-bastion/RuneBastion.tsx`: 2D canvas arena, stage map, skill tree, spells and persistence.
- `public/rune-bastion/observatory.webp`: generated arena artwork, actually used as the playable background.

## Research

GitHub examples were consulted for the genre and progression patterns:
- https://github.com/foslock/breakout-roguelite — persistent upgrades between attempts.
- https://github.com/shelldonbrooks/tower-defense — Canvas 2D wave-defense structure.

The implementation is original. No code or assets were copied from either repository.

## Artwork provenance

Built-in image_gen, edit mode, source: the exact user-selected crop `upload/image-edit-target-ce9e35784725e321.png`. The generated output is converted to WebP at quality 82 for the game. Source generation: `generated_images/exec-7c2b2316-1d96-426b-ac2f-30c1aed816fd.png`.

Final prompt:

> Use case: style-transfer. Edit target: the supplied game-catalog screenshot. Transform the entire screenshot into a finished landscape background illustration for a NEW 2D stage-based crystal-defense game called Rune Bastion. Remove ALL interface cards, lettering, clothing symbols and sword symbols. Preserve only the midnight navy, muted violet and teal atmosphere as visual continuity. Create an original painterly top-down fantasy clearing inside an ancient ruined observatory, stone borders and softly glowing runestones around the perimeter. Central 70 percent must be dark quiet empty ground with no objects so moving enemies and defensive crystal can be drawn by code over it. Distinct high-quality hand-painted game art, atmospheric mist, subtle violet bioluminescence at edges, crisp readable restrained textures, wide 3:2 composition. No characters, no text, no logos, no UI, no arrows, no central tower or crystal. This will be the actual playable arena background.

## Verification

599 tests across 61 files pass, including 12 Rune Bastion tests. Clean production build exports 35 pages; neither removed Aether route is present. Changed-file ESLint and TypeScript pass. Browser QA confirmed arena artwork, stage-map locks, tree prerequisites, and an entire three-wave Stage 1 clear. The clear earned 53 Essence (24 kills including the elite, plus first-clear bonus). A Runic Force purchase cost 8 Essence and raised bolt damage from 14 to 17. Reload retained 45 Essence, 17 damage and the Stage 2 unlock. Stages 2–30 have not been manually played through for difficulty balance.
