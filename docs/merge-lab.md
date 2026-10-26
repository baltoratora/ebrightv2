# Merge Lab

Route: `/merge-lab`; linked in the Puzzles group of `/thinking`.

An original cozy laboratory drop-and-merge puzzle inspired by the supplied gameplay references. Evolve remains a separate game.

## Play

Tap a column or focus the board and use Left/Right then Enter/Space. Blocks fall to the lowest empty cell. The dropped target combines with up to three orthogonally adjacent equal-level blocks: pair +1, triple +2, quad +3. Gravity settles all columns, then the upgraded target and every other falling specimen are rechecked until the board has no further matches. Specimen identities are preserved as columns move, with the upgraded target taking priority over secondary falls. The board has five columns and eight rows; the top row is the warning zone. A round ends if that row remains occupied after resolution. Level 44 is terminal.

The collection contains eleven species in four tiers (Bubble, Ice, Crystal, Golden), for 44 levels. Each merge scores `new level × 10 × consumed neighbours`; coins are one tenth of those points. Each first discovery has a once-only reward of `level × 20` coins. The shop exchanges earned coins for tools. All currency and rewards belong to this game only.

- Clear: remove one chosen block, settle its column, and resolve all resulting matches with normal points, coin and discovery credit. Clearing or rearranging preserves the next block.
- Rearrange: sort a clamped 3×3 region from bottom-left across each row, high to low, settle, then resolve pairwise matches.
- Omni-gene: a wild block that waits for a block directly above it; it adopts that block's level and merges. Side neighbours alone do not activate it.

Progress saves to `ebright.merge-lab.v1` in browser local storage, validated on restore. New rounds reset only board and round score; best score, discoveries, coins, claimed rewards and unused tools persist. There are no server accounts or shared rankings. Storage failures show an in-game notice. Real-world evolution is not a literal linear ladder; this collection is a fictional puzzle sequence.

## Upcoming blocks and progression

The tray shows the current block followed by **Next 1** and **Next 2**, in actual draw order. All three levels are saved and restored exactly. A normal drop shifts the queue and appends one weighted roll. Clear, Rearrange and Omni do not consume the normal queue; when Omni is selected, the previews show the normal current block followed by Next 1.

Spawn odds use the highest level reached **this round**, retained even if that specimen is cleared. New rounds reset that peak independently of the lifetime collection. The upper spawn level is `max(3, round peak)`, so the starter pool is 1–3 and the ceiling grows all the way to level 44. Each eligible level L has weight `clamp(2L + 5 - peak, 0, 4)`; divide each weight by the sum to obtain its probability. Newly rolled level-1 odds are 33.3% at peaks 1–3, 20% at peak 4, 11.1% at peak 5, 5% at peak 6 and 0% from peak 7. Level 2 retires at peak 9, level 3 at peak 11, and so on.

Already advertised blocks retain their order unless a milestone makes their weight zero. Those retired entries are replaced immediately, so level 1 cannot remain queued after peak 7. Expanding **Block odds** displays the current probabilities for new rolls. Older saves retain their board and collection, infer the round peak from the current board, and initialize the previously nonexistent previews once; subsequent reloads preserve the queue.

## Implementation

- `lib/merge-lab.ts`: pure game rules, tools and save validation.
- `components/merge-lab/MergeLab.tsx`: responsive client UI, keyboard controls and focus-trapped dialogs.
- `app/merge-lab/style.css`: scoped visual styling and reduced-motion support.
- `public/merge-lab/`: generated artwork, compressed to WebP.

The engine has focused tests for pairs, triples, quads, gravity chains, diagonals, warning-line resolution, full columns, Omni direction, terminal level, tools, save corruption and spawn limits. Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

The screenshot's timed event economy, external inventory rewards, paid bundles, stamina, live rankings and glowing resource chests are outside this standalone implementation. Browser click-through and mobile screenshots could not be completed in the build environment because the Playwright browser download returned an invalid archive; manually verify those before merging.

## Artwork provenance

Created with the built-in image_gen tool. The designated screenshot was the edit source for the background. The specimen atlas was generated separately; individual alpha sprites were extracted and compressed for the game. No original game's screenshot or extracted commercial artwork is shipped.

Background prompt:

> Use case: style-transfer. Edit target: the provided mobile game screenshot. Transform this image into a clean background illustration asset for an original evolution merge puzzle game. Keep the warm storybook laboratory atmosphere, cream and honey wood palette, arched glass roof, illustrated mobile game finish. Remove ALL UI, text, panels, shop products, currency, buttons, and the human scientist. Replace the foreground with a welcoming empty wooden laboratory workbench; behind it glass flasks, leafy plants, books and softly glowing tiny life specimens in jars. Calm teal shadows, amber sunlight, hand painted cozy scientific discovery atmosphere. Wide landscape composition 1536x1024. No text, no logos, no watermark. This is a background asset, not a screenshot or mockup.

Specimen prompt:

> Use case: stylized-concept. Asset type: production game sprite atlas. Create a square sprite sheet of 12 original cute evolution game specimens in a STRICT regular 4 column by 3 row grid, each centered in its own equal square cell with generous padding. Transparent background. NO tile backplates, NO labels, NO numbers, NO text, NO shadows beyond each character. Whimsical hand painted cozy mobile puzzle game style, soft clear outlines, friendly faces, readable at 48 pixels, consistent illustration style. EXACT row-major ordering: row 1: a colorful double helix DNA strand, a green oval microbe with little cilia, a yellow smiling sea sponge cube, a light blue jellyfish with tiny face; row 2: a blue fish, a green mudskipper with front fins, a pink axolotl with frilly gills, a turquoise little lizard; row 3: a small olive green dinosaur, a cream speckled egg in tiny nest, a yellow chick hatching from shell, a luminous iridescent pink-blue cell with two nuclei. All 12 icons centered exactly at cell centers in the 4x3 grid. No objects crossing cell boundaries. Square canvas.
