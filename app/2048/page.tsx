import { Game2048 } from "@/components/Game2048";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "2048" };

export default function Page2048() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>2048</h1>
          <span className="tag">slide &amp; merge to 2048</span>
        </div>
      </header>
      <Game2048 />
    </main>
  );
}
