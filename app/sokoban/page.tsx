import { Sokoban } from "@/components/Sokoban";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Sokoban" };

export default function SokobanPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Sokoban</h1>
          <span className="tag">push crates onto targets</span>
        </div>
      </header>
      <Sokoban />
    </main>
  );
}
