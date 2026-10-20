import { WordGame } from "@/components/WordGame";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Quordle" };

export default function QuordlePage() {
  return (
    <GameShell title="Quordle" description="four words, nine guesses">
      <WordGame boards={4} guessLimit={9} />
    </GameShell>
  );
}
