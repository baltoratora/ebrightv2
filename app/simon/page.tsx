import { Simon } from "@/components/Simon";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Simon Says" };

export default function SimonPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Simon Says</h1>
          <span className="tag">repeat the pattern</span>
        </div>
      </header>
      <Simon />
    </main>
  );
}
