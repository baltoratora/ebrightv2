"use client";

import type { SimState } from "@/lib/evolution/sim/state";
import type { Action } from "@/lib/evolution/sim/actions";
import { NORMAL } from "@/lib/evolution/sim/difficulty";
import { ScienceNote } from "./ScienceNote";

const NICHE = {
  filterFeeding: { title: "Suspension / filter feeding", desc: "Favours spreading through open and shelf waters." },
  benthicGrazing: { title: "Benthic grazing", desc: "Favours holding the seabed and sheltered habitats." },
} as const;

const TRAIT_NAME: Record<string, string> = {
  eyes: "Early eyes", swimming: "Streamlined swimming", armor: "Bony armour", thermal: "Thermal tolerance",
  hypoxia: "Hypoxia tolerance", repR: "Fast breeders (r)", repK: "Resilient broods (K)", jaws: "Jaws",
  "paired-fins": "Paired fins", osmoregulation: "Osmoregulation", "lobed-limbs": "Lobed limbs", airGulping: "Air-gulping",
};

export function DecisionModal({ state, dispatch }: { state: SimState; dispatch: (a: Action) => void }) {
  const d = state.pendingDecision;
  if (!d) return null;
  const resolve = (choice: string | null) => dispatch({ type: "resolveDecision", choice });

  let body: React.ReactNode;
  if (d.kind === "niche") {
    body = (
      <>
        <p>{d.context}</p>
        <div className="evo-choices">
          {d.options.map((o) => {
            const n = NICHE[o as keyof typeof NICHE];
            return (
              <button key={o} type="button" className="evo-choice" onClick={() => resolve(o)}>
                <strong>{n?.title ?? o}</strong>
                <span>{n?.desc}</span>
              </button>
            );
          })}
        </div>
        <ScienceNote>Feeding modes of early chordates (Haikouichthys, Metaspriggina…) are inferred from morphology.</ScienceNote>
      </>
    );
  } else if (d.kind === "mutation") {
    body = (
      <>
        <p>{d.context}</p>
        <div className="evo-choices">
          {d.options.map((o) => (
            <button key={o} type="button" className="evo-choice" onClick={() => resolve(o)}>
              <strong>Adopt {TRAIT_NAME[o] ?? o}</strong>
            </button>
          ))}
          <button type="button" className="evo-choice evo-choice--decline" onClick={() => resolve(null)}>
            <strong>Decline</strong>
            <span>+{NORMAL.declineEP} EP</span>
          </button>
        </div>
      </>
    );
  } else if (d.kind === "event" || d.kind === "extinctionBriefing") {
    const shock = state.lastShockReport;
    const isExt = d.kind === "extinctionBriefing";
    body = (
      <>
        <p>{d.context}</p>
        {shock && shock.lostFraction > 0 ? (
          <p className="evo-modal__loss">This pulse cost about {Math.round(shock.lostFraction * 100)}% of population in affected regions.</p>
        ) : null}
        <div className="evo-choices">
          <button type="button" className="evo-choice" onClick={() => resolve(null)}><strong>Acknowledge</strong></button>
        </div>
        <ScienceNote>
          {isExt
            ? "Only the Late Ordovician (Hirnantian) and Late Devonian (Kellwasser + Hangenberg) events are Big Five mass extinctions; other boundaries are ordinary transitions."
            : "An ordinary environmental change — not a mass extinction."}
        </ScienceNote>
      </>
    );
  } else {
    // transition
    body = (
      <>
        <p>{d.context}</p>
        <div className="evo-choices">
          <button type="button" className="evo-choice" onClick={() => resolve(null)}><strong>Continue</strong></button>
        </div>
      </>
    );
  }

  const heading =
    d.kind === "niche" ? "Choose a niche" :
    d.kind === "mutation" ? "A mutation appeared" :
    d.kind === "extinctionBriefing" ? "Mass extinction incoming" :
    d.kind === "event" ? "Environmental change" : "New period";

  return (
    <div className="evo-modal" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="evo-modal__card">
        <h2 className="evo-modal__title">{heading}</h2>
        {body}
        <p className="evo-modal__hint">Resolving keeps the game paused — buy adaptations or inspect regions, then press Resume.</p>
      </div>
    </div>
  );
}
