import { Chessboard } from "@/components/Chess";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Chess" };

export default function ChessPage() {
  return (
    <GameShell title="Chess" description="vs the computer">
      <Chessboard />
    </GameShell>
  );
}
