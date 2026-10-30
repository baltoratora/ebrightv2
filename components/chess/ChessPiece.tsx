import type { PieceSymbol } from "chess.js";

/** Original vector silhouettes. No font-dependent chess glyph rendering. */
export function ChessPiece({ type, color }: { type: PieceSymbol; color: "w" | "b" }) {
  return <svg viewBox="0 0 64 72" className={`cs-piece-art cs-piece-${color}`} aria-hidden="true" focusable="false">
    <g strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round">
      {type === "p" && <><circle cx="32" cy="21" r="9" /><path d="M26 31h12l-2 9 6 13H22l6-13z" /><path d="M23 31h18M22 53h20" /></>}
      {type === "r" && <><path d="M16 13h8v8h5v-8h6v8h5v-8h8v17l-7 5 2 19H21l2-19-7-5z" /><path d="M17 29h30M23 36h18M22 47h20" /></>}
      {type === "n" && <><path d="M20 53c-2-10 0-17 8-22l-9 7-8-5 7-15 9-4 3-8 8 7c12 2 15 16 10 27l-5 13z" /><path d="M28 22l-9 7m16-11 3 8c-10 7-14 14-13 20" /><circle cx="27" cy="20" r="1.3" fill="currentColor" stroke="none" /></>}
      {type === "b" && <><path d="M32 8c0 0-15 12-15 22 0 7 7 11 15 11s15-4 15-11C47 20 32 8 32 8z" /><path d="m37 17-9 13m-1 11-4 12h18l-4-12M23 46h18" /><circle cx="32" cy="7" r="3" /></>}
      {type === "q" && <><path d="m15 22 10 10 7-16 7 16 10-10-6 23H21z" /><circle cx="13" cy="18" r="4" /><circle cx="32" cy="12" r="4" /><circle cx="51" cy="18" r="4" /><path d="M22 45h20l2 9H20zM23 39h18" /></>}
      {type === "k" && <><path d="M28 6h8v7h7v7h-7v8h-8v-8h-7v-7h7z" /><path d="M32 29c-16-17-25 3-14 13l5 6h18l5-6c11-10 2-30-14-13z" /><path d="M23 48h18l3 7H20zM32 30v14" /></>}
      <path d="M21 54h22l4 7H17zM16 62h32l2 5H14z" />
    </g>
  </svg>;
}
