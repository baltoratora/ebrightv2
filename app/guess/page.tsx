import { GuessGame } from "@/components/GuessGame";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Guess" };

export default function GuessPage() {
  return (
    <GameShell title="Guess" description="narrow it down A–Z">
      <GuessGame />
    </GameShell>
  );
}
