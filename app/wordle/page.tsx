import { WordGame } from "@/components/WordGame";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Wordle" };

export default function WordlePage() {
  return (
    <main className="page">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Wordle</h1>
          <span className="tag">guess the word in 6</span>
        </div>
      </header>
      <WordGame boards={1} guessLimit={6} />
    </main>
  );
}
