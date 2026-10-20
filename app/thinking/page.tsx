import Link from "next/link";
import { GameLibrary } from "@/components/GameLibrary";

export const metadata = { title: "Thinking Mode — Games" };

export default function ThinkingPage() {
  return (
    <main className="page library-page">
      <Link className="play-back" href="/">← Home</Link>
      <header className="library-header"><p className="library-eyebrow">A little play. A little possibility.</p>
        <h1>Find your next <span>good game.</span></h1>
        <p>Quick puzzles, timeless classics, and worlds to explore.</p>
      </header>
      <GameLibrary />
    </main>
  );
}
