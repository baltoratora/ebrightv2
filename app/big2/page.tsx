import { ClientGame } from "@/components/ClientGame";
import { Big2 } from "@/components/Big2";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Big 2" };

export default function Big2Page() {
  return (
    <GameShell title="Big 2" description="shed your hand · vs 3 bots">
      <ClientGame><Big2 /></ClientGame>
    </GameShell>
  );
}
