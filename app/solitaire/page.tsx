import { Solitaire } from "@/components/Solitaire";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Solitaire" };

export default function SolitairePage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Solitaire</h1>
          <span className="tag">Klondike</span>
        </div>
      </header>
      <Solitaire />
    </main>
  );
}
