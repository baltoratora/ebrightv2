import { GuessGame } from "@/components/GuessGame";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Guess" };

export default function GuessPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Guess</h1>
          <span className="tag">narrow it down A–Z</span>
        </div>
      </header>
      <GuessGame />
    </main>
  );
}
