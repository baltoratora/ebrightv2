import { Sudoku } from "@/components/Sudoku";

export const metadata = {
  title: "Thinking Mode",
};

export default function SudokuPage() {
  return (
    <main className="page">
      <header className="brand">
        <h1>Thinking Mode</h1>
        <span className="tag">one puzzle, full focus</span>
      </header>
      <Sudoku />
    </main>
  );
}
