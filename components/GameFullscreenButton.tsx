"use client";

export function GameFullscreenButton({ expanded, onToggle, className = "" }: {
  expanded: boolean; onToggle: () => void | Promise<void>; className?: string;
}) {
  return <button className={`game-fullscreen-toggle ${className}`} onClick={onToggle} aria-pressed={expanded} title={expanded ? "Exit fullscreen (Esc)" : "Play fullscreen"}>
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={expanded ? "M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5" : "M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5"} /></svg>
    <span>{expanded ? "Exit fullscreen" : "Fullscreen"}</span>
  </button>;
}
