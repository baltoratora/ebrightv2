# Evolve: living-seas visual pass

Base: `584884eb804a59aeb79a04a93bd2dcab24fb911e` on `feat/evolve-gameplay`.
Working branch: `feat/evolve-living-seas`. Nothing is pushed or deployed.

## Changes

- Original high-DPI procedural underwater environments with three depth layers,
  sponge silhouettes, light shafts, suspended particles and population samples.
- Habitat selection reads actual population, fitness, capacity and penalties.
  Empty habitats have no population sample; a labelled specimen view remains.
- All four period forms keep the existing body parameters and modular attachments.
  Added skin detail, muscle segments, translucent tail rays, shaded bone plates,
  a visual eye upgrade, tail motion and adaptation/establishment feedback.
- Interactive period maps retain the existing datasets, add original stylised
  coastlines and eligible connection lines, and use numbered regions with a
  readable, keyboard-accessible legend.
- A quieter natural-history UI with an illustrated title screen and Save & exit.
- Presentation styles are isolated in a CSS module. Existing simulation rules,
  save schema, game timing, balance and scientific data are unchanged.

## Limits and interpretation

The artwork is a habitat study, not a reconstruction. Sprites illustrate density;
they are not individually simulated animals. Corridor labels indicate eligible
connections, not measured per-edge migrant counts. No new audio or raster assets.

Motion freezes during game pause and hidden-tab pauses. Reduced-motion uses
static illustration; population values remain live. Canvas is capped at 2x
device-pixel ratio and 30fps. It does not advance or consume simulation RNG.

## Review locally

Apply the accompanying patch from the base commit on a new branch. Then use the
existing npm scripts: `npm test`, `npx tsc --noEmit`, `npm run lint`, and
`npm run build`. Stop any development server before building. Start one fresh
development server and verify its port before opening `/evolve`.

Review at 390px, 1440px and 2560px: opening choice, paused/running scene, adaptation
purchase, all periods, habitat selection, map legend, save/exit/resume, and an end
screen. Check reduced motion and a hidden-tab pause. No merge or deployment is
part of this handoff.

## Validation

Automated checks cover the existing suite plus read-only presentation selectors.
Browser screenshot verification in the build environment was blocked: Playwright's
browser download was invalid, and the managed preview supervisor supplies Vite
flags (`--host`, `--strictPort`) that this Next.js project does not accept.
Do not treat the generated interactive preview as screenshot or E2E verification.
