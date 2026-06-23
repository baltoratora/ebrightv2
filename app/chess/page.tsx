import { Chessboard } from "@/components/Chess";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Chess" };

export default function ChessPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Chess</h1>
          <span className="tag">vs the computer</span>
        </div>
      </header>
      <Chessboard />
    </main>
  );
}
