import { Sudoku } from "@/components/Sudoku";
import { BackBar } from "@/components/BackBar";

export const metadata = {
  title: "Sudoku",
};

export default function SudokuPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Sudoku</h1>
          <span className="tag">fill the grid 1–9</span>
        </div>
      </header>
      <Sudoku />
    </main>
  );
}
