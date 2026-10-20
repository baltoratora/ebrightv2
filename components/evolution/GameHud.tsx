"use client";

import type { SimState } from "@/lib/evolution/sim/state";
import { totalPop, occupiedCount } from "@/lib/evolution/sim/state";
import { NORMAL } from "@/lib/evolution/sim/difficulty";
import { periodLabel } from "@/lib/evolution/sim/inspect";
import type { Action } from "@/lib/evolution/sim/actions";

export function GameHud({
  state,
  speed,
  dispatch,
  setSpeed,
}: {
  state: SimState;
  speed: number;
  dispatch: (a: Action) => void;
  setSpeed: (n: number) => void;
}) {
  const period = state.clock.period;
  const target = NORMAL.dominateTargets[period];
  const occ = occupiedCount(state);
  const remaining = Math.max(0, Math.ceil(NORMAL.eraBudgetSec[period] - state.clock.elapsedInPeriod));
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const behind = state.mode === "dominate" && occ < target && state.clock.elapsedInPeriod > NORMAL.eraBudgetSec[period] * 0.6;
  const canResume = state.status === "running" && !state.pendingDecision;

  return (
    <header className="evo-bar">
      <div className="evo-bar__era">
        <span className="evo-bar__period">{periodLabel(period)}</span>
        <span className="evo-bar__mode">{state.mode === "dominate" ? "Dominate" : "Survival"}</span>
      </div>

      <dl className="evo-bar__stats">
        <div><dt>Population</dt><dd>{Math.round(totalPop(state))}</dd></div>
        <div><dt>Evolution pts</dt><dd>{Math.floor(state.ep)}</dd></div>
        <div><dt>Regions</dt><dd>{occ} occupied</dd></div>
      </dl>

      {state.mode === "dominate" ? (
        <div className={`evo-bar__objective${behind ? " is-behind" : ""}`}>
          <span className="evo-bar__objlabel">Target</span>
          <span className="evo-bar__objval">{occ} / {target} regions</span>
          <span className="evo-bar__timer">⏱ {mm}:{ss}</span>
          {behind ? <span className="evo-bar__warn">falling behind</span> : null}
        </div>
      ) : (
        <div className="evo-bar__objective">
          <span className="evo-bar__objlabel">Goal</span>
          <span className="evo-bar__objval">reach end of Devonian</span>
          <span className="evo-bar__timer">⏱ {mm}:{ss}</span>
        </div>
      )}

      <div className="evo-bar__controls" role="group" aria-label="Speed and pause">
        {state.paused ? (
          <button type="button" className="evo-btn evo-btn--sm evo-btn--primary" disabled={!canResume} onClick={() => dispatch({ type: "resume" })}>▶ Resume</button>
        ) : (
          <button type="button" className="evo-btn evo-btn--sm" onClick={() => dispatch({ type: "pause" })}>⏸ Pause</button>
        )}
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`evo-btn evo-btn--sm${speed === n ? " is-active" : ""}`}
            aria-pressed={speed === n}
            onClick={() => setSpeed(n)}
          >
            {n}×
          </button>
        ))}
      </div>
    </header>
  );
}
