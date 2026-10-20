# Blast Arena

An original single-player grid arena at `/blast-arena`: a mint robot versus three bots. Registered in the shared game library and switcher. Original SVG characters; CSS steel/crates, bombs, fuse rings and fire; no external assets or new dependencies.

## Rules and controls

- Four-direction movement, 2.4-second bomb fuses, cross-shaped fire, instant bomb chains. Both your own and other robots' fire can tag you.
- Steel blocks fire; the first crate stops each ray and breaks. Simultaneous blasts use intact crate geometry consistently. Fire remains hazardous for 560 ms.
- Crates can reveal range, bomb-capacity and speed upgrades. All three have caps.
- Last survivor wins; simultaneous total elimination or a 150-second time limit draws. A player elimination otherwise ends the round.
- Easy, Normal and Hard bots differ in movement speed and bomb-placement frequency. Bots predict shortened chain fuses and look for an escape before planting bombs; other robots can still block their escape.
- Arrow keys/WASD move, Space places one bomb, P/Escape pauses. Held pointer controls repeat movement, with pointer capture/cancellation; Bomb is a separate tap button. Both movement controls and the bomb button support native keyboard activation.
- Manual pause, window blur and hidden tabs stop simulation. Returning requires Resume, with no elapsed-time catch-up.
- Personal wins/finished rounds persist locally with guarded storage. Current rounds do not save; reloading starts at the intro.

## Implementation

`lib/blast-arena.ts` is a pure seeded fixed-step simulation. `components/BlastArena.tsx` owns the timer, input and presentation. Initial preview uses a fixed seed to avoid hydration mismatches; new rounds use a fresh seed. Spawn corridors always provide room to escape an initial bomb. A round may finish well before the 2½-minute cap.

## Verification

- 10 new engine tests; full suite: 535 tests passing.
- TypeScript, ESLint (17 existing warnings, no errors), static production export pass.
- Headless Chromium: desktop 1440×900, tablet 768×1024, iPhone-size 390×844, Android-size 360×800, small phone 375×667, landscape 844×390.
- Browser interactions: start, held pointer movement, bomb placement, clock freeze while paused, resume, keyboard movement and visibility-handler pause. Self-elimination ends a round, records it once and restores personal totals after reload.
- Original responsive layouts inspected in screenshots. Short landscape screens scroll so controls retain their size.

These are browser-emulation checks, not physical-device Safari/Android checks. No multiplayer, online scoreboard, audio or campaign in this first version.
