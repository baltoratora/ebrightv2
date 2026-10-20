"use client";

import { useState } from "react";
import type { Mode } from "@/lib/evolution/sim/state";

export function StartScreen({
  hasSave,
  onStart,
  onResume,
}: {
  hasSave: boolean;
  onStart: (mode: Mode) => void;
  onResume: () => void;
}) {
  const [mode, setMode] = useState<Mode>("survival");
  const [confirming, setConfirming] = useState(false);

  const start = () => {
    if (hasSave) setConfirming(true);
    else onStart(mode);
  };

  return (
    <div className="evo-start">
      <div className="evo-start__card">
        <h1 className="evo-start__title">Evolve</h1>
        <p className="evo-start__tag">Guide one fictional lineage across a real, changing Earth — Cambrian to Devonian.</p>

        <fieldset className="evo-start__modes">
          <legend>Mode</legend>
          <label className={mode === "survival" ? "is-active" : ""}>
            <input type="radio" name="mode" checked={mode === "survival"} onChange={() => setMode("survival")} />
            <span><strong>Survival</strong> — reach the end of the Devonian without going extinct.</span>
          </label>
          <label className={mode === "dominate" ? "is-active" : ""}>
            <input type="radio" name="mode" checked={mode === "dominate"} onChange={() => setMode("dominate")} />
            <span><strong>Dominate</strong> — meet each period&apos;s occupation target in time.</span>
          </label>
        </fieldset>

        <div className="evo-start__diff">
          Difficulty: <strong>Normal</strong> <span className="evo-muted">(Relaxed / Hard coming soon)</span>
        </div>

        <details className="evo-science">
          <summary className="evo-science__summary">How to play</summary>
          <div className="evo-science__body">
            The world runs on its own. Spread automatically into neighbouring habitats, earn Evolution Points,
            buy adaptations (each with a trade-off), accept or decline mutations, and respond to telegraphed
            events — including two real mass extinctions. Pause any time; the game also pauses on a hidden tab.
          </div>
        </details>

        <div className="evo-start__actions">
          <button type="button" className="evo-btn evo-btn--primary" onClick={start}>Start new run</button>
          {hasSave ? (
            <button type="button" className="evo-btn" onClick={onResume}>Resume</button>
          ) : null}
        </div>
      </div>

      {confirming ? (
        <div className="evo-modal" role="dialog" aria-modal="true" aria-label="Replace active run?">
          <div className="evo-modal__card">
            <h2>Replace your active run?</h2>
            <p>You have a saved run in progress. Starting a new one will overwrite it.</p>
            <div className="evo-start__actions">
              <button type="button" className="evo-btn evo-btn--primary" onClick={() => { setConfirming(false); onStart(mode); }}>
                Replace it
              </button>
              <button type="button" className="evo-btn" onClick={() => setConfirming(false)}>Keep my run</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
