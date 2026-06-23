import { WordGame } from "@/components/WordGame";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Quordle" };

export default function QuordlePage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Quordle</h1>
          <span className="tag">four words, nine guesses</span>
        </div>
      </header>
      <WordGame boards={4} guessLimit={9} />
    </main>
  );
}
