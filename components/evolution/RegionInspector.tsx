"use client";

import type { RegionId, SimState } from "@/lib/evolution/sim/state";
import { NORMAL } from "@/lib/evolution/sim/difficulty";
import { inspectRegion } from "@/lib/evolution/sim/inspect";
import { ScienceNote } from "./ScienceNote";

const NAME: Record<RegionId, string> = {
  nursery: "Nursery Shallows", reef: "Reef Shelf", openOcean: "Open Ocean", deepAnoxic: "Deep Anoxic Water",
  estuary: "Estuary", river: "River Lowlands", tidalFlats: "Tidal Flats / Shore", land: "Terrestrial Lowlands",
};

const NOTE: Partial<Record<RegionId, string>> = {
  deepAnoxic: "Early-Paleozoic deep water was warm (the cold abyss is a Cenozoic feature) and often low in oxygen — modelled here as one harsh attribute.",
  tidalFlats: "Submerged shallows with periodic air exposure — not land. Devonian tetrapodomorphs were still aquatic.",
  land: "Sustained land life needs lungs, weight-bearing limbs, desiccation-resistant skin and water-independent reproduction — a Carboniferous story.",
  reef: "Reef predation pressure intensifies through the Ordovician (a balancing device, not a claim predators first appeared then).",
};

export function RegionInspector({ state, selected }: { state: SimState; selected: RegionId | null }) {
  if (!selected) return <p className="evo-inspector__empty">Select a region on the map to inspect it.</p>;
  const ins = inspectRegion(state, selected, NORMAL);
  const pop = Math.round(state.regions[selected].P);
  return (
    <div className="evo-inspector">
      <h3 className="evo-inspector__name">{NAME[selected]}</h3>
      <p className={`evo-inspector__status evo-status--${ins.status}`}>
        {ins.status === "occupied" ? "Occupied" : ins.status === "colonizing" ? "Colonising" : "Inaccessible"}
        {ins.status !== "inaccessible" ? ` · ${pop} pop · ${ins.thriving ? "thriving" : "declining"}` : ""}
      </p>
      <p className="evo-inspector__detail">{ins.detail}</p>
      {ins.limitingFactor ? (
        <p className="evo-inspector__limit">
          Limiting factor: <strong>{ins.limitingFactor}</strong>
          {ins.suggestion ? <> — {ins.suggestion}.</> : null}
        </p>
      ) : null}
      {NOTE[selected] ? <ScienceNote>{NOTE[selected]}</ScienceNote> : null}
    </div>
  );
}
