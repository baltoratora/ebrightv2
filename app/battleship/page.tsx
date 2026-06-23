import { Battleship } from "@/components/Battleship";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Battleship" };

export default function BattleshipPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Battleship</h1>
          <span className="tag">sink the fleet</span>
        </div>
      </header>
      <Battleship />
    </main>
  );
}
