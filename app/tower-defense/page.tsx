import { TowerDefense } from "@/components/TowerDefense";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Tower Defense" };

export default function TowerDefensePage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Tower Defense</h1>
          <span className="tag">build towers, survive the waves</span>
        </div>
      </header>
      <TowerDefense />
    </main>
  );
}
