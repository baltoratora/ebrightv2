import { Pool } from "@/components/Pool";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Pool" };

export default function PoolPage() {
  return (
    <GameShell title="Pool" description="sink them all">
      <Pool />
    </GameShell>
  );
}
