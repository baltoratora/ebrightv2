import { Breakout } from "@/components/Breakout";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Brick Breaker" };

export default function BreakoutPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Brick Breaker</h1>
          <span className="tag">clear the wall</span>
        </div>
      </header>
      <Breakout />
    </main>
  );
}
