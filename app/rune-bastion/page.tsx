import RuneBastion from "@/components/rune-bastion/RuneBastion";
import { GameShell } from "@/components/GameShell";
import "./style.css";
export const metadata = {
  title: "Rune Bastion — Stages & permanent upgrades",
  description:
    "Defend the crystal through thirty stages and grow a permanent branching skill tree.",
};
export default function Page() {
  return (
    <GameShell
      title="Rune Bastion"
      description="Defend. Earn. Upgrade. Return stronger."
    >
      <RuneBastion />
    </GameShell>
  );
}
