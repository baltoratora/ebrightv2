import { Frogger } from "@/components/Frogger";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Frogger" };

export default function FroggerPage() {
  return (
    <GameShell title="Frogger" description="cross the road &amp; river">
      <Frogger />
    </GameShell>
  );
}
