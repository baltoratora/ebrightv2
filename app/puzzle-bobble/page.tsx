import { GameShell } from "@/components/GameShell";
import { PuzzleBobble } from "@/components/PuzzleBobble";

export const metadata = { title: "Puzzle Bobble" };

export default function PuzzleBobbblePage() {
  return (
    <GameShell title="Puzzle Bobble" description="Shoot & match bubbles">
      <PuzzleBobble />
    </GameShell>
  );
}
