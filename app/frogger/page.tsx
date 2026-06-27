import { Frogger } from "@/components/Frogger";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Frogger" };

export default function FroggerPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Frogger</h1>
          <span className="tag">cross the road &amp; river</span>
        </div>
      </header>
      <Frogger />
    </main>
  );
}
