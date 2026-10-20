# Game-room usability and responsive pass

Base: `main` at `78725a2` (merged Evolve work). Branch: `feat/games-responsive-ux`.

## What changed

The `/thinking` library has search, category filters and original SVG icons. All 22 classic game routes share a compact header, a game switcher, expandable instructions and leaderboards. Evolve retains its immersive presentation and remains in the library. Existing routes/bookmarks continue to work.

Gameplay aims to fit one portrait screen. Controls keep useful sizes, zoom stays enabled, notch/home-indicator safe areas are preserved, and short landscape screens can scroll. Large Minesweeper boards scroll within the minefield rather than reducing every cell to an unreadable size. The game library intentionally scrolls.

| Games | Reviewed changes |
| --- | --- |
| Sudoku | Restore every saved difficulty; validate saves; consistent cell-first touch/keyboard input; prune peer notes after entry; auto-notes replace stale candidates; hints can repair wrong entries; pause hides board and stops timer; Ctrl/Cmd+Z and redo; compact difficulty selector and phone number row. Hints retain the existing +42-second penalty. |
| Wordle / Quordle | Validated local save/resume, duplicate-guess protection, readable keyboard independent of tile size, accessible tile/key status, form-safe shortcuts. Quordle has phone board selectors and keyboard clues for the selected word; desktop keeps all four boards visible. Solved boards stop receiving further guesses. |
| Guess | Inclusive answer range derived only from revealed clues, remaining possibilities, progress indicator, inline input above the software keyboard, keyboard autocomplete, category notes, give-up confirmation, safer saved-data handling. |
| Solitaire | Larger card presentation on a felt surface, legal destination outlines, explicit touch button for foundations, score-aware Undo, foundation-to-tableau return moves, suit-specific foundation destinations, new-game/draw-mode confirmation. |
| Minesweeper | Reachable flag control before the board, scrollable larger minefields, storage failures do not prevent play. |
| Chess / Checkers | Shared navigation/help, available-width board sizing and compact layouts. Rules and AI unchanged. |
| Battleship | Side-by-side fleets on desktop, phone selectors for enemy waters/your fleet, both boards remain interactive through the existing rules. |
| Big 2 / Tetris / Solitaire | Random deals/bags initialize after hydration, fixing server/client markup mismatches on direct page loads. |
| 2048 | Shared layout, guarded keyboard input, validated saved board and metadata; corrupt saves start a fresh board. Rules unchanged. |
| Sokoban | Tiles scale using actual level column count; form-safe shortcuts. |
| Tower Defense | Scaled canvas taps and hover map back to simulation coordinates; keyboard input respects forms/navigation. |
| Frogger / Pac-Man / Pinball / Brick Breaker / Puzzle Bobble / Pool / Carrom / Simon | Available-width canvases, compact phone layouts, shared navigation/help; applicable global shortcuts respect forms. Pinball cancels held touch controls on pointer cancellation. Physics and scoring unchanged. |
| Evolve | Checked for layout/runtime regressions; no gameplay or presentation changes. |

## Validation

- Vitest: 525 tests passing, including regressions for clue ranges, note pruning, save validation, foundation return moves and keyboard routing.
- TypeScript: `npx tsc --noEmit` passes.
- ESLint: no errors; 17 existing warnings remain.
- Production static export: all 31 pages build successfully.
- Headless Chromium: library plus 23 games, at 1440×900, 390×844, 360×800, 375×667 768×1024 and 844×390 (144 route/viewport checks). No JavaScript/hydration errors or horizontal page overflow.
- Browser interaction checks cover library filtering, word-game submissions/save/resume/duplicates/native keyboard activation, typing in another input, win/debrief name entry and Escape, Quordle board selection/shared guesses, Sudoku non-Easy recovery/input/notes/undo/redo/pause, Solitaire draw-three/score Undo, Guess range/autocomplete, large Minesweeper scrolling, Battleship active-play fleet selection, corrupt 2048 recovery and scaled Tower Defense placement/selling.
- Screenshots inspected at desktop and phone sizes; short-phone layouts revised after inspection.

Browser checks use the built static export with a local stub for `/api/scores`. They do **not** verify the live Cloudflare/D1 service, real iOS Safari, Android hardware, or networked chess/checkers rooms. Physical phone checks remain useful before merge. No gameplay balance, Evolve science data, multiplayer protocol or leaderboard API contracts were changed.
