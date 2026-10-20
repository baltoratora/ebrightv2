# Rail Patrol

Original, non-gory arcade rail shooter at `/rail-patrol`, listed in the games hub.
Six encounters visit three procedural canvas environments: midnight docks, a transit
terminal and a reactor approach. No third-party artwork, game branding, dependencies
or network services are required.

## Play

- Mouse or tap to aim and fire. Arrows/WASD move the keyboard reticle; Space fires.
- Six cells per magazine. Reload with R or the large on-screen button; firing on
  empty also starts a reload. Reloading takes one second of active game time.
- Stop threat robots before their charge bars fill. Armoured robots take two body
  hits or one precision hit to the visor. Mint helper robots carry marked parcels:
  protect them to restore shield; shooting them costs shield and score.
- Easy, Normal and Hard vary attack deadlines and damage. Local best scores are
  stored separately per difficulty; unavailable storage never blocks play.
- P/Escape or Pause freezes the game. Hidden tabs and window blur pause it too;
  returning requires Resume. There is no offline catch-up.
- Sound is optional and off initially; pulse effects are synthesized locally.

## Implementation

`lib/rail-patrol.ts` is a pure seeded fixed-step engine. The React component owns
input, timers and guarded persistence. `paint.ts` draws decorative environments,
robots and effects using simulation time; hit testing and painting share target
radii. Canvas resolution follows its displayed size with device pixel ratio capped
at two. Styles are scoped with a CSS module. No simulation debug hooks are exposed.

The patch is based on main `eedcdbc` and is independent of Blast Arena: it adds
separate files and inserts its registry/glyph entries away from Blast Arena's hunks.

## Validation

- 13 engine tests cover deterministic state, immutable updates, aspect-correct
  hitboxes, overlap priority, ammo/reload, invalid aim, armour, helper penalties and
  rescues, attacks, extinction of shield, combos, travel and a full six-wave win.
- Full repository suite: 538 passing. TypeScript and production static export pass;
  lint has no errors (17 existing warnings elsewhere).
- Browser checks cover pointer hits, keyboard controls, reload timing, pause,
  natural loss, debrief and stored best scores at desktop, tablet and phone sizes.

Phone checks use Chromium viewport/touch emulation. Physical iPhone Safari and
Android devices have not been tested. This is a short arcade route, with no online
leaderboard or mid-run save. Canvas play has keyboard controls and text instructions,
but is not a nonvisual screen-reader game.
