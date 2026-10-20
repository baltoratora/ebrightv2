/** Small, original SVG symbols stay crisp without platform emoji fonts. */
const PATHS: Record<string, string[]> = {
  "blast-arena": ["M17 14a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M13 8l2-4 3 1 M19 2v3 M19 8h3 M21 3l-2 2"],
  sudoku: ["M4 4h16v16H4z M9 4v16 M15 4v16 M4 9h16 M4 15h16"],
  minesweeper: ["M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2", "M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0"],
  wordle: ["M3 5h5v5H3z M10 5h5v5h-5z M17 5h4v5h-4z M3 13h5v5H3z M10 13h5v5h-5z M17 13h4v5h-4z"],
  quordle: ["M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"],
  guess: ["M4 6h15l-4-4 M20 18H5l4 4 M6 10v4 M18 10v4 M10 10h4l-4 4h4"],
  solitaire: ["M5 3h12v18H5z M8 12l3-4 3 4-3 4z M17 6h3v13"],
  big2: ["M3 6l8-3 6 16-8 3z M13 3h7v16h-3 M7 9l4 7"],
  chess: ["M5 21h14 M7 18h10l-2-6 3-3-2-5-5-1-5 7 4 1-3 7 M12 6h.01"],
  checkers: ["M4 8a8 4 0 1 0 16 0 8 4 0 1 0-16 0 M4 8v8c0 5 16 5 16 0V8 M4 12c0 5 16 5 16 0"],
  battleship: ["M3 14h18l-4 6H7z M8 14V8h7v6 M11 8V3 M3 22q3-3 6 0t6 0t6 0"],
  carrom: ["M3 3h18v18H3z M7 3v4H3 M17 3v4h4 M3 17h4v4 M17 21v-4h4 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0"],
  pool: ["M3 3l10 10 M20 16a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 14v4 M14 16h4"],
  tetris: ["M8 3h6v6h6v6H2V9h6z M8 9h6 M8 9v6 M14 9v6 M2 21h18"],
  pinball: ["M5 2h14v20H5z M7 17l4 2 M17 17l-4 2 M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0"],
  breakout: ["M3 3h18v6H3z M9 3v6 M15 3v6 M5 21h14 M12 17l5-5"],
  'puzzle-bobble': ["M7 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M15 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M23 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M11 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M12 23v-6l3 3 M12 17l-3 3"],
  '2048': ["M3 3h18v18H3z M12 3v18 M3 12h18 M6 7h3 M15 7h3 M6 17h3 M16 15v4 M14 17h4"],
  simon: ["M12 2v8H4 M12 22v-8h8 M2 12h8v8 M22 12h-8V4"],
  sokoban: ["M4 4h16v16H4z M4 4l16 16 M20 4L4 20"],
  frogger: ["M6 7l-3-4 M18 7l3-4 M4 15l-2 5 M20 15l2 5 M5 10q7-7 14 0v6q-7 5-14 0z M8 11h.01 M16 11h.01"],
  pacman: ["M20 6a10 10 0 1 0 0 12l-8-6z M10 6h.01 M20 12h.01"],
  'tower-defense': ["M5 21V9L3 7V3h4v3h3V3h4v3h3V3h4v4l-2 2v12 M5 10h14 M10 21v-5h4v5"],
  "rail-patrol": ["M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M12 1v5 M12 18v5 M1 12h5 M18 12h5 M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0"],
  evolve: ["M3 12c5-10 15-9 18 0-3 9-13 10-18 0z M3 12H1 M12 4l-1 5 M16 11h.01 M8 17l3-3"],
};
export function GameGlyph({ href }: { href: string }) {
  return <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(PATHS[href.slice(1)] ?? PATHS.sudoku).map((d, i) => <path key={i} d={d} />)}
  </svg>;
}
