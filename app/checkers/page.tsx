import { Checkers } from "@/components/Checkers";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Checkers" };

export default function CheckersPage() {
  return (
    <GameShell title="Checkers" description="vs the computer">
      <Checkers />
    </GameShell>
  );
}
