import { Simon } from "@/components/Simon";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Simon Says" };

export default function SimonPage() {
  return (
    <GameShell title="Simon Says" description="repeat the pattern">
      <Simon />
    </GameShell>
  );
}
