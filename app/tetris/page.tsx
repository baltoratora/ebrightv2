import { ClientGame } from "@/components/ClientGame";
import { Tetris } from "@/components/Tetris";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Tetris" };

export default function TetrisPage() {
  return (
    <GameShell title="Tetris" description="stack &amp; clear lines">
      <ClientGame><Tetris /></ClientGame>
    </GameShell>
  );
}
