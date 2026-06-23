import { Pinball } from "@/components/Pinball";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Pinball" };

export default function PinballPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Pinball</h1>
          <span className="tag">keep it alive</span>
        </div>
      </header>
      <Pinball />
    </main>
  );
}
