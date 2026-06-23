import { Carrom } from "@/components/Carrom";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Carrom" };

export default function CarromPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Carrom</h1>
          <span className="tag">flick &amp; pocket</span>
        </div>
      </header>
      <Carrom />
    </main>
  );
}
