# Game feedback and motion review

Reviewed the 27 catalogue entries, their game components, shared shell, controls, result panels and existing engine tests. This is a source review, not a manual play-through of every game.

## Sudoku regression

The responsive overhaul (`07756f2`) replaced the earlier hybrid number-first input with cell-first-only editing. This change restores the earlier interaction: choose a digit, then tap empty cells repeatedly; selecting a cell first also works, and successful keypad fills clear selection to avoid accidental replacement. Keyboard editing retains selection.

Normal player entries previously inherited the pink brand accent while the error override used pale pink. Correct entries now use blue, incorrect entries use red with an underline and explicit accessible labels, and given clues remain white. Feedback explains rejected duplicates rather than silently ignoring them. Wrong guesses no longer reduce the keypad's remaining count. Notes, hints, undo/redo, saving, difficulty selection and the 42-second hint penalty remain supported. Paused editing and keypad input are blocked consistently. Completion validation no longer mutates the board and rejects out-of-range digits.

## References and scope

- [Motion](https://motion.dev/docs/react-lazy-motion): installed and used for library card hover/tap feedback with `LazyMotion`, minimal `m` components, and `MotionConfig reducedMotion="user"`. No frame-by-frame game state runs through Motion. Cards remain visible without an entrance animation or delayed feature load.
- [Anime.js](https://animejs.com/documentation/): interpreted from “Anime.dev”, which was not accessible. Useful for choreographed SVG effects, but not added alongside Motion because this pass has no effect requiring another animation engine.
- [Kokonut UI](https://kokonutui.com/docs): navigation, input and restrained control-feedback patterns informed the searchable game switcher. Components are original to this repository; no copied component code or additional Tailwind/shadcn setup.
- [Bklit UI](https://bklit.com/docs): charts fit future history/progression screens. Existing game HUDs do not have recorded time-series data that would justify installing a chart stack in this pass.
- [Manus](https://manus.im/): an app-building service, not a runtime component library. No Manus API, external account or dependency is introduced.

Shared improvements across the 26 GameShell routes: searchable switcher; Escape closes and returns focus; outside tap closes; menu keyboard input does not reach game hotkeys; short button/border responses, disclosure fades, and existing result-banner fades. CSS honours reduced motion. Evolve retains its separate custom layout. No decorative animation gates game logic, alters simulation timing, or moves canvas hit targets.

## Per-game assessment

| Game | Assessment |
| --- | --- |
| Sudoku | Fix validation distinction and restore hybrid input in this change. |
| Minesweeper | Shared controls and result fade; retain immediate reveal/flag input. |
| Wordle | Shared navigation; retain letter states and existing feedback timing. |
| Quordle | Shared navigation; retain board tabs and keyboard layout. |
| Solitaire | Shared controls/result feedback; retain card selection and legal-target hints. |
| Big 2 | Shared controls/navigation; retain turn and deal timing. |
| Chess | Shared controls/navigation; preserve move, promotion and AI scheduling. |
| Checkers | Shared controls/navigation; preserve piece and forced-capture animation. |
| Battleship | Shared controls/navigation; preserve placement and shot feedback. |
| Carrom | Shared controls/navigation; preserve aim/power and physics loop. |
| Pool | Shared controls/navigation; preserve aim/power and physics loop. |
| Tetris | Shared controls/navigation; preserve key repeat, drop and line-clear timing. |
| Pinball | Shared controls/navigation; preserve flipper and physics responsiveness. |
| Brick Breaker | Shared controls/navigation; preserve paddle and ball loop. |
| Puzzle Bobble | Shared controls/result feedback; preserve shot and collapse timing. |
| 2048 | Shared controls/result fade; retain tile identity and merge timing. |
| Simon Says | Shared controls/navigation; retain pattern timing as gameplay information. |
| Sokoban | Shared controls/navigation; retain immediate grid movement. |
| Frogger | Shared controls/navigation; preserve hop/collision timing. |
| Pac-Man | Shared controls/navigation; preserve movement/ghost simulation. |
| Tower Defense | Shared controls/navigation; preserve targeting and wave simulation. |
| Rail Patrol | Shared controls/navigation; preserve aim/reload and canvas coordinates. |
| Guess | Shared controls/banner feedback; retain input and suggestions. |
| Merge Lab | Shared navigation; retain drop/merge and next-block effects. |
| Blast Arena | Shared navigation; retain bomb/collision timing. |
| Rune Bastion | Shared navigation; retain stage/skill states and spell simulation. |
| Evolve | Existing bespoke HUD and scene already use their own motion. Retain them. Bklit could suit a future run-history screen once history is stored. |

## Validation

610 tests across 61 files pass, including new regression coverage for legal-but-incorrect guesses, peer conflicts, replacement checks, remaining digit counts, frozen board completion and out-of-range values. Production build and changed-file ESLint pass. Browser checks confirm the computed blue/red colours, red underline, non-conflicting incorrect input, correction, undo, duplicate rejection, hint penalty, pause locks, save restoration, switcher search/Escape focus and library category filtering. All 27 catalogue routes pass an initial-load browser smoke check with their expected main heading; this is not a complete manual play-through.
