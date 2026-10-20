"use client";

import { useState, useEffect, useRef } from "react";
import { useEvolveGame, type EvolveGameInit } from "./useEvolveGame";
import type { RegionId } from "@/lib/evolution/sim/state";
import { occupiedCount } from "@/lib/evolution/sim/state";
import { recordResult } from "./bestResult";
import type { TraitId } from "@/lib/evolution/traits/traits";
import { Environment } from "./Environment";
import { Creature } from "./Creature";
import { PaleoMap } from "./PaleoMap";
import { GameHud } from "./GameHud";
import { RegionInspector } from "./RegionInspector";
import { TraitShop } from "./TraitShop";
import { DecisionModal } from "./DecisionModal";
import { EndDebrief } from "./EndDebrief";
import { Collapsible } from "./Collapsible";

const ART_TRAITS: TraitId[] = ["armor", "jaws", "paired-fins", "lobed-limbs"];

export function RunScreen({ init, onExit, onAgain }: { init: EvolveGameInit; onExit: () => void; onAgain: () => void }) {
  const { state, speed, dispatch, setSpeed } = useEvolveGame(init);
  const [selected, setSelected] = useState<RegionId | null>(null);
  const [newBest, setNewBest] = useState(false);
  const recordedRef = useRef(false);

  // record the per-mode best result once, when the run reaches a terminal state
  useEffect(() => {
    if (state.status !== "running" && state.outcome && !recordedRef.current) {
      recordedRef.current = true;
      const { improved } = recordResult(state.mode, {
        status: state.outcome.status,
        cause: state.outcome.cause,
        finalPeriod: state.outcome.finalPeriod,
        occupied: occupiedCount(state),
        missedTargets: state.outcome.missedTargets,
        usedRecovery: state.outcome.usedRecoveryWindow,
      });
      setNewBest(improved);
    }
  }, [state]);

  const creatureTraits = state.traits.filter((t): t is TraitId => (ART_TRAITS as string[]).includes(t));

  return (
    <div className="evo-run" data-period={state.clock.period} data-testid="evo-run">
      <GameHud state={state} speed={speed} dispatch={dispatch} setSpeed={setSpeed} />

      <div className="evo-run__main">
        <section className="evo-run__world" aria-label="The living world">
          <div className="evo-run__lineage">
            <Environment era={state.clock.period}>
              <Creature form={state.clock.period} traits={creatureTraits} className="evo-run__creature" />
            </Environment>
          </div>
          <PaleoMap state={state} selected={selected} onSelect={setSelected} />
        </section>

        <aside className="evo-run__panels" aria-label="Details">
          <Collapsible title="Region inspector" badge={selected ? "selected" : undefined}>
            <RegionInspector state={state} selected={selected} />
          </Collapsible>
          <Collapsible title="Adaptations">
            <TraitShop state={state} dispatch={dispatch} />
          </Collapsible>
        </aside>
      </div>

      {state.status === "running" ? <DecisionModal state={state} dispatch={dispatch} /> : null}
      {state.status !== "running" ? <EndDebrief state={state} newBest={newBest} onAgain={onAgain} onHome={onExit} /> : null}
    </div>
  );
}
