export type GameGroup = "Puzzles" | "Words" | "Cards" | "Strategy" | "Arcade" | "Adventure";
export type GameEntry = { name: string; desc: string; icon: string; href: string; group: GameGroup };

export const GAMES: GameEntry[] = [
  { name: "Evolve", desc: "Guide a lineage across a changing Earth", icon: "🐟", href: "/evolve", group: "Adventure" },
  { name: "Sudoku", desc: "Fill the grid 1–9", icon: "🔢", href: "/sudoku", group: "Puzzles" },
  { name: "Minesweeper", desc: "Clear the field", icon: "💣", href: "/minesweeper", group: "Puzzles" },
  { name: "Wordle", desc: "Guess the word in 6", icon: "🟩", href: "/wordle", group: "Words" },
  { name: "Quordle", desc: "Four words at once", icon: "🟨", href: "/quordle", group: "Words" },
  { name: "Solitaire", desc: "Classic Klondike", icon: "🃏", href: "/solitaire", group: "Cards" },
  { name: "Big 2", desc: "Shed your hand vs 3 bots", icon: "🎴", href: "/big2", group: "Cards" },
  { name: "Chess", desc: "vs the computer", icon: "♟️", href: "/chess", group: "Strategy" },
  { name: "Checkers", desc: "vs the computer", icon: "⛀", href: "/checkers", group: "Strategy" },
  { name: "Battleship", desc: "Sink the fleet", icon: "🚢", href: "/battleship", group: "Strategy" },
  { name: "Carrom", desc: "Flick & pocket", icon: "🎯", href: "/carrom", group: "Arcade" },
  { name: "Pool", desc: "Sink them all", icon: "🎱", href: "/pool", group: "Arcade" },
  { name: "Tetris", desc: "Stack & clear lines", icon: "🟦", href: "/tetris", group: "Arcade" },
  { name: "Pinball", desc: "Keep it alive", icon: "🕹️", href: "/pinball", group: "Arcade" },
  { name: "Brick Breaker", desc: "Clear the wall", icon: "🧱", href: "/breakout", group: "Arcade" },
  { name: "Puzzle Bobble", desc: "Shoot & match bubbles", icon: "🫧", href: "/puzzle-bobble", group: "Arcade" },
  { name: "2048", desc: "slide & merge to 2048", icon: "🧮", href: "/2048", group: "Puzzles" },
  { name: "Simon Says", desc: "repeat the pattern", icon: "🎵", href: "/simon", group: "Puzzles" },
  { name: "Sokoban", desc: "push boxes to goals", icon: "📦", href: "/sokoban", group: "Puzzles" },
  { name: "Frogger", desc: "cross the road & river", icon: "🐸", href: "/frogger", group: "Arcade" },
  { name: "Pac-Man", desc: "eat the dots, dodge the ghosts", icon: "👻", href: "/pacman", group: "Arcade" },
  { name: "Tower Defense", desc: "build towers, survive the waves", icon: "🏰", href: "/tower-defense", group: "Strategy" },
  { name: "Rail Patrol", desc: "Aim, reload and protect the helpers", icon: "🎯", href: "/rail-patrol", group: "Arcade" },
  { name: "Guess", desc: "Narrow it down A–Z", icon: "🔤", href: "/guess", group: "Words" },
];
