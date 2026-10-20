"use client";

import { useState, useEffect, useRef } from "react";
import { useEvolveGame, type EvolveGameInit } from "./useEvolveGame";
import type { RegionId } from "@/lib/evolution/sim/state";
import { occupiedCount } from "@/lib/evolution/sim/state";
import { recordResult } from "./bestResult";
import { TRAIT_NAMES, visibleHabitat } from "@/lib/evolution/presentation";
import { LivingScene } from "./immersion/LivingScene";
import styles from "./immersion/Immersion.module.css";
import { PaleoMap } from "./PaleoMap";
import { GameHud } from "./GameHud";
import { RegionInspector } from "./RegionInspector";
import { TraitShop } from "./TraitShop";
import { DecisionModal } from "./DecisionModal";
import { EndDebrief } from "./EndDebrief";
import { Collapsible } from "./Collapsible";

export function RunScreen({ init, onExit, onAgain }: { init: EvolveGameInit; onExit: () => void; onAgain: () => void }) {
  const { state, speed, dispatch, setSpeed } = useEvolveGame(init);
  const [selected, setSelected] = useState<RegionId | null>("nursery");
  const [notice, setNotice] = useState<string | null>(null);
  const previous = useRef({ traits: state.traits, occupied: Object.values(state.regions).filter(r => r.occ === "occupied").map(r => r.id) });
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

  useEffect(() => {
    const added = state.traits.filter(t => !previous.current.traits.includes(t));
    const established = Object.values(state.regions).filter(r => r.occ === "occupied").map(r => r.id);
    const newHome = established.some(id => !previous.current.occupied.includes(id));
    previous.current = { traits: state.traits, occupied: established };
    if (added.length) setNotice(`Adapted: ${added.map(t => TRAIT_NAMES[t] ?? t).join(" · ")}`);
    else if (newHome) setNotice("A new foothold. Your lineage has established a habitat.");
  }, [state.traits, state.regions]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 4500); return () => clearTimeout(timer); }, [notice]);
  const habitat = visibleHabitat(state, selected);

  return (
    <div className="evo-run" data-period={state.clock.period} data-testid="evo-run">
      <div className={styles.masthead}>
        <div className={styles.brand}><span aria-hidden="true">e</span><div>EVOLVE<small>A lineage across a changing Earth</small></div></div>
        <button type="button" className="evo-btn evo-btn--sm" onClick={() => { dispatch({ type: "pause" }); onExit(); }}>Save & exit</button>
      </div>
      <GameHud state={state} speed={speed} dispatch={dispatch} setSpeed={setSpeed} />
      <div className={styles.liveRegion}>
        <LivingScene state={state} selected={habitat} speed={speed} onSelect={setSelected} />
        <div className={styles.notice} role="status" aria-live="polite">{notice ? <span key={notice}>{notice}</span> : null}</div>
      </div>
      <div className={styles.workspace}>
        <div className={styles.mapPanel}>
          <div className={styles.sectionHeading}><span>THE CHANGING EARTH</span><small>Select a region to explore</small></div>
          <PaleoMap state={state} selected={habitat} onSelect={setSelected} />
          <p className={styles.visualNote}>Habitat scenes and swimmers are illustrative. Population values and habitat states come from your run.</p>
        </div>
        <aside className={styles.details} aria-label="Habitat and adaptations">
          <Collapsible title="Habitat field notes" defaultOpen>
            <RegionInspector state={state} selected={habitat} />
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
