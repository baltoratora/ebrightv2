import { ClientGame } from "@/components/ClientGame";
import { Solitaire } from "@/components/Solitaire";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Solitaire" };

export default function SolitairePage() {
  return (
    <GameShell title="Solitaire" description="Klondike">
      <ClientGame><Solitaire /></ClientGame>
    </GameShell>
  );
}
