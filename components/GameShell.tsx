import { GameSwitcher } from "@/components/GameSwitcher";
import Link from "next/link";
import type { ReactNode } from "react";

/** Compact, shared chrome. Boards keep their own routes and save identities. */
export function GameShell({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  return (
    <main className="page page--game" id="game-content">
      <header className="play-header">
        <Link className="play-back" href="/thinking" aria-label="Back to all games">← <span>Games</span></Link>
        <div className="play-heading"><h1>{title}</h1><p>{description}</p></div>
        <GameSwitcher title={title} />
      </header>
      {children}
    </main>
  );
}
