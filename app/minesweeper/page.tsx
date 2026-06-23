import { Minesweeper } from "@/components/Minesweeper";
import { BackBar } from "@/components/BackBar";

export const metadata = {
  title: "Minesweeper",
};

export default function MinesweeperPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Minesweeper</h1>
          <span className="tag">clear the field</span>
        </div>
      </header>
      <Minesweeper />
    </main>
  );
}
