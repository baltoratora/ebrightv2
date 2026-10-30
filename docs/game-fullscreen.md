# Fullscreen games and Sudoku viewport fit

Chess and Sudoku share `useGameFullscreen` and the Fullscreen/Exit fullscreen button. The existing game component stays mounted. The hook supports native Fullscreen API entry, viewport fallback when unavailable/rejected, Escape, explicit exit, native fullscreen-change events, body-scroll restoration and cancellation of pending requests. A quick Escape cannot reopen the fallback after an asynchronous fullscreen rejection. Pending requests are invalidated on unmount.

Sudoku's board, keypad, editing controls, difficulty, pause, timer and exit control fit in the available playing viewport. Normal mode also reserves space for the shell and collapsed help/leaderboard panels. A ResizeObserver measures the actual remaining play area and side controls, including feedback-message height, and fits a square board into that space. Desktop keeps the keypad alongside the grid; compact portrait layouts put a single keypad row and two tool rows below it. Fullscreen expands the same puzzle without clearing notes, history, difficulty, pause state or timer. The correct/incorrect entry colours and number-first input remain unchanged.

## Verification

- Production build, changed-file ESLint and diff checks pass.
- 33 focused Sudoku/progress/Chess tests pass; no engine rules changed.
- Browser fallback: Sudoku entry/exit, notes and timer preservation, pause controls, undo/redo, hints and Escape verified. Chess entry/exit and quick-Escape cancellation checked after sharing the implementation.
- Desktop 1363 × 936: normal document fits in 936 px; expanded Sudoku content height equals its 936 px viewport, with a 739 px board and all controls visible.
- Embedded 390 × 667 and 390 × 844 portrait viewports: normal documents match the viewport height and width without scrolling. The compact fullscreen viewport also has equal content/client dimensions, including after hint feedback.
- Help and leaderboard can still be deliberately expanded in normal mode; those optional panels may require reading beyond the playing viewport.
- The cloud browser rejects native fullscreen, so browser-window fallback was manually tested; native-mode behaviour remains unverified here. These iframe checks are responsive-layout checks, not physical-device testing.
