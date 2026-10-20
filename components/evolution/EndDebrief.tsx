"use client";

import type { SimState } from "@/lib/evolution/sim/state";
import { occupiedCount } from "@/lib/evolution/sim/state";
import { periodLabel } from "@/lib/evolution/sim/inspect";

const CAUSE_TITLE: Record<string, string> = {
  survived: "Your lineage endured",
  dominated: "You dominated the seas",
  extinction: "The lineage went extinct",
  missedTarget: "You fell short of the target",
};

function advice(cause: string): string {
  switch (cause) {
    case "extinction":
      return "Prepare for telegraphed threats: thermal tolerance before the Hirnantian cold, and hypoxia tolerance — or a freshwater refuge — before the Late Devonian anoxic pulses.";
    case "missedTarget":
      return "Spread earlier: buy paired fins and osmoregulation to open new habitats, and keep enough regions established before each deadline.";
    case "dominated":
      return "A strong run. Try Survival for a longer, open-ended game — or push for an earlier clear.";
    default:
      return "Try Dominate mode to chase occupation targets, or branch into the deep and freshwater refuges.";
  }
}

export function EndDebrief({ state, newBest, onAgain, onHome }: { state: SimState; newBest?: boolean; onAgain: () => void; onHome: () => void }) {
  const o = state.outcome;
  if (!o) return null;
  return (
    <div className="evo-modal" role="dialog" aria-modal="true" aria-label="Run complete">
      <div className="evo-modal__card evo-debrief">
        <h2 className="evo-modal__title">{o.status === "won" ? "🌱 " : "🜍 "}{CAUSE_TITLE[o.cause]}</h2>
        {newBest ? <p className="evo-debrief__best">★ New best for {state.mode === "dominate" ? "Dominate" : "Survival"} mode</p> : null}
        <p>
          You reached the <strong>{periodLabel(o.finalPeriod)}</strong> with {occupiedCount(state)} region(s) occupied.
          {state.schedule.firedShocks.length > 0 ? ` You weathered: ${state.schedule.firedShocks.join(", ")}.` : ""}
        </p>
        {o.usedRecoveryWindow ? <p className="evo-muted">You used your one recovery window.</p> : null}
        <p className="evo-debrief__advice">{advice(o.cause)}</p>
        <div className="evo-start__actions">
          <button type="button" className="evo-btn evo-btn--primary" onClick={onAgain}>Play again</button>
          <button type="button" className="evo-btn" onClick={onHome}>Back to Thinking</button>
        </div>
      </div>
    </div>
  );
}
