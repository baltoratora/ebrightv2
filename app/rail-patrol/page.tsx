import { GameShell } from "@/components/GameShell";
import { RailPatrol } from "@/components/rail-patrol/RailPatrol";
export const metadata = { title: "Rail Patrol" };
export default function RailPatrolPage() {
  return <GameShell title="Rail Patrol" description="Steady aim. Clear the route."><RailPatrol /></GameShell>;
}
