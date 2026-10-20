import { Battleship } from "@/components/Battleship";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Battleship" };

export default function BattleshipPage() {
  return (
    <GameShell title="Battleship" description="sink the fleet">
      <Battleship />
    </GameShell>
  );
}
