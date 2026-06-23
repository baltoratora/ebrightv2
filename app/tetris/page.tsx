import { Tetris } from "@/components/Tetris";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Tetris" };

export default function TetrisPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Tetris</h1>
          <span className="tag">stack &amp; clear lines</span>
        </div>
      </header>
      <Tetris />
    </main>
  );
}
