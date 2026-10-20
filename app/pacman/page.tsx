import { Pacman } from "@/components/Pacman";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Pac-Man" };

export default function PacmanPage() {
  return (
    <GameShell title="Pac-Man" description="eat the dots, dodge the ghosts">
      <Pacman />
    </GameShell>
  );
}
