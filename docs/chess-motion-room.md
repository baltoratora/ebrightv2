# Chess Room redesign

Chess now has an ivory-and-forest layout, original vector piece silhouettes, coordinates, player/captured-piece panels, a separate match-control card and a scrolling two-column move journal. It is scoped to Chess; other games keep their current layout.

## Motion

Motion's minimal `m` components with `LazyMotion/domMax` and `LayoutGroup` animate shared piece identities between squares. Identity replay handles same-type pieces, captures, en passant, castling, promotion and undo. Legal destinations scale into view; selection follows the selected square; the difficulty pill slides; match-status text crossfades; promotion enters as a modal. `MotionConfig reducedMotion="user"` respects system preferences, and rules do not depend on animation completion.

The SVG piece art is original repository code, not a font or downloaded asset. Motion is the only animation library used here. The other supplied references inform the restrained card/segmented-control direction; no Anime.js, chart stack or copied Kokonut components are added.

## Previous move and undo

Both source and destination of the most recent move stay gold, with a stronger destination outline, accessible square labels and a coordinate summary. Hint outlines and selected/legal squares remain separate states. The trail follows the bot reply and returns to the earlier move on undo; a new game removes it.

Undo against the bot takes back the bot reply and its preceding human move. Before the bot replies it takes back only the unanswered human move. The bot timeout is cancelled synchronously, and scheduled work checks the game instance and FEN before applying. New games and mode changes cancel pending work too. The undo action also clears promotion/hint/selection state and can recover from checkmate. Live rooms retain their no-takeback rule. Incoming legal room moves are applied through chess.js when possible so session notation is retained, with FEN resynchronisation as fallback.

## Verification

- 616 tests across 62 files pass, including six new undo/identity regression cases. Production build, changed-file ESLint and diff checks pass.
- Browser: move/animation transform verified; undo during bot thinking leaves the original position without a delayed reply; completed-turn undo restores both pieces and an empty journal; bot source/destination highlights and notation verified; captured-piece panel verified after a bot capture.
- Desktop screenshot and a real 16-frame capture of piece motion recorded from the browser.
- 390-pixel iframe viewport checked: board fits, controls stack, and document has no horizontal overflow. This checks responsive CSS, not a physical phone or touch device.
- Promotion, castling and en passant identities are unit tested; online two-device play, promotion-dialog keyboard behaviour and system reduced-motion mode have not been manually exercised in this pass.

## Movement refinement

Piece movement uses a 180 ms ease-out tween with position-only layout interpolation, replacing the spring that could overshoot and bounce. Captured-piece rows reserve their height so a capture does not shift the entire board and animate stationary pieces. The difficulty pill also uses a non-spring transition.

Refinement verification: production build and changed-file ESLint pass. Browser replay of Nf3 / d5 / e4 / dxe4 confirms the captured-piece count changes while board top and height remain exactly unchanged.
