import { WordGame } from "@/components/WordGame";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Wordle" };

export default function WordlePage() {
  return (
    <GameShell title="Wordle" description="guess the word in 6">
      <WordGame boards={1} guessLimit={6} />
    </GameShell>
  );
}
