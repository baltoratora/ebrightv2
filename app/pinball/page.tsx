import { Pinball } from "@/components/Pinball";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Pinball" };

export default function PinballPage() {
  return (
    <GameShell title="Pinball" description="keep it alive">
      <Pinball />
    </GameShell>
  );
}
