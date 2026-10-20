import { Breakout } from "@/components/Breakout";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Brick Breaker" };

export default function BreakoutPage() {
  return (
    <GameShell title="Brick Breaker" description="clear the wall">
      <Breakout />
    </GameShell>
  );
}
