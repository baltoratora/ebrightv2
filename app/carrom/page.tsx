import { Carrom } from "@/components/Carrom";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Carrom" };

export default function CarromPage() {
  return (
    <GameShell title="Carrom" description="flick &amp; pocket">
      <Carrom />
    </GameShell>
  );
}
