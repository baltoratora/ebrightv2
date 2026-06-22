import { Big2 } from "@/components/Big2";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Big 2" };

export default function Big2Page() {
  return (
    <main className="page">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Big 2</h1>
          <span className="tag">shed your hand · vs 3 bots</span>
        </div>
      </header>
      <Big2 />
    </main>
  );
}
