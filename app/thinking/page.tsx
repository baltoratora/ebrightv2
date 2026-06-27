import Link from "next/link";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Thinking Mode" };

type Game = {
  name: string;
  desc: string;
  icon: string;
  href?: string;
  ready: boolean;
};

const GAMES: Game[] = [
  { name: "Sudoku", desc: "Fill the grid 1–9", icon: "🔢", href: "/sudoku", ready: true },
  { name: "Minesweeper", desc: "Clear the field", icon: "💣", href: "/minesweeper", ready: true },
  { name: "Wordle", desc: "Guess the word in 6", icon: "🟩", href: "/wordle", ready: true },
  { name: "Quordle", desc: "Four words at once", icon: "🟨", href: "/quordle", ready: true },
  { name: "Solitaire", desc: "Classic Klondike", icon: "🃏", href: "/solitaire", ready: true },
  { name: "Big 2", desc: "Shed your hand vs 3 bots", icon: "🎴", href: "/big2", ready: true },
  { name: "Chess", desc: "vs the computer", icon: "♟️", href: "/chess", ready: true },
  { name: "Checkers", desc: "vs the computer", icon: "⛀", href: "/checkers", ready: true },
  { name: "Battleship", desc: "Sink the fleet", icon: "🚢", href: "/battleship", ready: true },
  { name: "Carrom", desc: "Flick & pocket", icon: "🎯", href: "/carrom", ready: true },
  { name: "Pool", desc: "Sink them all", icon: "🎱", href: "/pool", ready: true },
  { name: "Tetris", desc: "Stack & clear lines", icon: "🟦", href: "/tetris", ready: true },
  { name: "Pinball", desc: "Keep it alive", icon: "🕹️", href: "/pinball", ready: true },
  { name: "Brick Breaker", desc: "Clear the wall", icon: "🧱", href: "/breakout", ready: true },
  { name: "Puzzle Bobble", desc: "Shoot & match bubbles", icon: "🫧", href: "/puzzle-bobble", ready: true },
  { name: "2048", desc: "slide & merge to 2048", icon: "🧮", href: "/2048", ready: true },
  { name: "Simon Says", desc: "repeat the pattern", icon: "🎵", href: "/simon", ready: true },
];

function Card({ g }: { g: Game }) {
  const inner = (
    <>
      <span className="game-icon">{g.icon}</span>
      <span className="game-name">{g.name}</span>
      <span className="game-desc">{g.desc}</span>
      {!g.ready ? <span className="soon-badge">Soon</span> : null}
    </>
  );
  if (g.ready && g.href) {
    return (
      <Link className="game-card" href={g.href}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="game-card soon" aria-disabled="true">
      {inner}
    </div>
  );
}

export default function ThinkingPage() {
  return (
    <main className="page">
      <BackBar href="/" label="← Home" />
      <header className="brand">
        <div>
          <h1>Thinking Mode</h1>
          <span className="tag">pick a game</span>
        </div>
      </header>

      <div className="games">
        {GAMES.map((g) => (
          <Card key={g.name} g={g} />
        ))}
      </div>
    </main>
  );
}
