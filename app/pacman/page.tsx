import { Pacman } from "@/components/Pacman";
import { BackBar } from "@/components/BackBar";

export const metadata = { title: "Pac-Man" };

export default function PacmanPage() {
  return (
    <main className="page page--game">
      <BackBar href="/thinking" label="← Thinking Mode" />
      <header className="brand">
        <div>
          <h1>Pac-Man</h1>
          <span className="tag">eat the dots, dodge the ghosts</span>
        </div>
      </header>
      <Pacman />
    </main>
  );
}
