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
  { name: "Solitaire", desc: "Classic Klondike", icon: "🃏", ready: false },
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
