import { TowerDefense } from "@/components/TowerDefense";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Tower Defense" };

export default function TowerDefensePage() {
  return (
    <GameShell title="Tower Defense" description="build towers, survive the waves">
      <TowerDefense />
    </GameShell>
  );
}
