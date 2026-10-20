import { Sokoban } from "@/components/Sokoban";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Sokoban" };

export default function SokobanPage() {
  return (
    <GameShell title="Sokoban" description="push crates onto targets">
      <Sokoban />
    </GameShell>
  );
}
