import { Minesweeper } from "@/components/Minesweeper";
import { GameShell } from "@/components/GameShell";

export const metadata = {
  title: "Minesweeper",
};

export default function MinesweeperPage() {
  return (
    <GameShell title="Minesweeper" description="clear the field">
      <Minesweeper />
    </GameShell>
  );
}
