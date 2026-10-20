"use client";

// Isolated art preview for /evolve/style-test. Independent of any future
// simulation. Immersive active scene; development controls live in a collapsible
// panel so they don't dominate the artwork.

import { useState } from "react";
import Link from "next/link";
import { ERAS, getEra } from "@/lib/evolution/eras/eras";
import { FORMS, FORM_ORDER } from "@/lib/evolution/creatures/lineage";
import { TRAITS, TRAIT_ORDER, type TraitId } from "@/lib/evolution/traits/traits";
import { evoCssVars, type EraId } from "@/lib/evolution/palette";
import { Creature } from "./Creature";
import { Environment } from "./Environment";
import { RegionMap } from "./RegionMap";
import { SampleHud } from "./SampleHud";
import { TraitIcon } from "./TraitIcon";

export function StyleTest() {
  const [era, setEra] = useState<EraId>("cambrian");
  const [traits, setTraits] = useState<TraitId[]>(FORMS.cambrian.defaultTraits);
  const [showAttachments, setShowAttachments] = useState(false);
  const [region, setRegion] = useState<string | null>(null);

  const activeEra = getEra(era);

  function pickEra(next: EraId) {
    setEra(next);
    setTraits(FORMS[next].defaultTraits); // reset to that form's default look
  }

  function toggleTrait(id: TraitId) {
    setTraits((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  return (
    <main className="evo-root" style={evoCssVars() as React.CSSProperties}>
      <header className="evo-head">
        <div>
          <h1 className="evo-title">Evolve</h1>
          <p className="evo-sub">
            Art style-test · <span className="evo-badge">development preview</span>
          </p>
        </div>
        <Link className="evo-back" href="/thinking">
          ← Thinking Mode
        </Link>
      </header>

      {/* Active scene */}
      <section className="evo-stage" aria-label="Active creature in its environment">
        <Environment era={era}>
          <Creature
            form={era}
            traits={traits}
            showAttachments={showAttachments}
            label={`${activeEra.name} lineage form`}
            className="evo-actor-svg"
          />
        </Environment>
        <div className="evo-hud-wrap">
          <SampleHud era={era} />
        </div>
      </section>

      {/* Collapsible development controls */}
      <details className="evo-panel" open>
        <summary className="evo-panel__summary">Controls</summary>
        <div className="evo-panel__body">
          <div className="evo-ctl-group" role="group" aria-label="Period">
            <span className="evo-ctl-label">Period</span>
            <div className="evo-seg">
              {ERAS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`evo-chip${era === e.id ? " is-active" : ""}`}
                  aria-pressed={era === e.id}
                  onClick={() => pickEra(e.id)}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>

          <div className="evo-ctl-group" role="group" aria-label="Adaptations">
            <span className="evo-ctl-label">Adaptations</span>
            <div className="evo-traits">
              {TRAIT_ORDER.map((id) => {
                const t = TRAITS[id];
                const on = traits.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`evo-trait${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggleTrait(id)}
                    title={`${t.blurb} (first evidence: ${t.earliestEvidence})`}
                  >
                    <TraitIcon name={t.iconId} size={20} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="evo-ctl-group">
            <label className="evo-switch">
              <input
                type="checkbox"
                checked={showAttachments}
                onChange={(e) => setShowAttachments(e.target.checked)}
              />
              <span>Show attachment points &amp; bounds (dev)</span>
            </label>
          </div>
        </div>
      </details>

      {/* Four-form comparison */}
      <section className="evo-section" aria-label="Lineage comparison across the four periods">
        <h2 className="evo-h2">One lineage, four periods</h2>
        <p className="evo-note">Possible branches of a fictional lineage — not a ladder, and not a claim one real species passed through all forms.</p>
        <div className="evo-compare">
          {FORM_ORDER.map((id) => (
            <figure key={id} className="evo-compare__item">
              <Creature form={id} traits={FORMS[id].defaultTraits} label={FORMS[id].label} className="evo-compare__svg" />
              <figcaption>{getEra(id).name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Region map study */}
      <section className="evo-section" aria-label="Region map study">
        <h2 className="evo-h2">Region map study</h2>
        <RegionMap era={era} selected={region} onSelect={setRegion} />
      </section>

      {/* Science notes */}
      <section className="evo-section evo-science" aria-label="Science notes">
        <h2 className="evo-h2">Science note</h2>
        <p className="evo-note">
          <strong>{activeEra.name}</strong> ({activeEra.baseMa}–{activeEra.topMa} Ma, ICS v2024/12). {activeEra.scienceNote}
        </p>
        <p className="evo-note">
          Transition out: <strong>{activeEra.transitionOut.label}</strong> — {activeEra.transitionOut.note}
        </p>
        <p className="evo-note evo-note--dim">
          Dates &amp; facts per the spec&apos;s sourced fact table. Geography is illustrative. Durations are geological, not game pacing.
        </p>
      </section>
    </main>
  );
}
