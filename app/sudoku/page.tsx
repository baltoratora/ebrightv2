import { Sudoku } from "@/components/Sudoku";
import { GameShell } from "@/components/GameShell";

export const metadata = {
  title: "Sudoku",
};

export default function SudokuPage() {
  return (
    <GameShell title="Sudoku" description="fill the grid 1–9">
      <Sudoku />
    </GameShell>
  );
}
