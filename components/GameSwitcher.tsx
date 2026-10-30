"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GAMES } from "@/lib/games";
import { GameGlyph } from "@/components/GameGlyph";

/** Keep navigation keys and search input separate from the active game. */
export function GameSwitcher({ title }: { title: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) {
        details.current.open = false;
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const games = GAMES.filter((game) => `${game.name} ${game.group}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <details ref={details} className="play-switcher" onToggle={(event) => {
    setOpen(event.currentTarget.open);
    if (!event.currentTarget.open) setSearch("");
  }} onKeyDown={(event) => {
    event.stopPropagation();
    if (event.key === "Escape" && details.current?.open) {
      event.preventDefault();
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }
  }}>
    <summary>Switch game <span aria-hidden="true">⌄</span></summary>
    <nav aria-label="Choose a game">
      <label className="play-switcher-search">
        <span className="sr-only">Find a game</span>
        <input type="search" placeholder="Find a game…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      {games.map((game) => <Link key={game.href} href={game.href} aria-current={game.name === title ? "page" : undefined}>
        <GameGlyph href={game.href} /> {game.name}
      </Link>)}
      {games.length === 0 && <p className="play-switcher-empty" role="status">No games found.</p>}
    </nav>
  </details>;
}
