import { GameGlyph } from "@/components/GameGlyph";
import Link from "next/link";
import type { ReactNode } from "react";
import { GAMES } from "@/lib/games";

/** Compact, shared chrome. Boards keep their own routes and save identities. */
export function GameShell({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  return (
    <main className="page page--game" id="game-content">
      <header className="play-header">
        <Link className="play-back" href="/thinking" aria-label="Back to all games">← <span>Games</span></Link>
        <div className="play-heading"><h1>{title}</h1><p>{description}</p></div>
        <details className="play-switcher">
          <summary>Switch game <span aria-hidden="true">⌄</span></summary>
          <nav aria-label="Choose a game">
            {GAMES.map((game) => <Link key={game.href} href={game.href} aria-current={game.name === title ? "page" : undefined}>
              <GameGlyph href={game.href} /> {game.name}
            </Link>)}
          </nav>
        </details>
      </header>
      {children}
    </main>
  );
}
