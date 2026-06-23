import { BackBar } from "@/components/BackBar";
import { PuzzleBobble } from "@/components/PuzzleBobble";

export const metadata = { title: "Puzzle Bobble" };

export default function PuzzleBobbblePage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Games" />
      <PuzzleBobble />
    </main>
  );
}
