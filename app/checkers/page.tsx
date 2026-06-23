import { Checkers } from "@/components/Checkers";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Checkers" };

export default function CheckersPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Checkers</h1>
          <span className="tag">vs the computer</span>
        </div>
      </header>
      <Checkers />
    </main>
  );
}
