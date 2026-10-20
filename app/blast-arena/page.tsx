import { BlastArena } from "@/components/BlastArena";
import { GameShell } from "@/components/GameShell";

export const metadata = { title: "Blast Arena" };
export default function BlastArenaPage() {
  return <GameShell title="Blast Arena" description="Make a plan. Leave a way out."><BlastArena /></GameShell>;
}
