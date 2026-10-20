import { Game2048 } from "@/components/Game2048";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "2048" };

export default function Page2048() {
  return (
    <GameShell title="2048" description="slide &amp; merge to 2048">
      <Game2048 />
    </GameShell>
  );
}
