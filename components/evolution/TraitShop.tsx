"use client";

import type { SimState } from "@/lib/evolution/sim/state";
import type { Action } from "@/lib/evolution/sim/actions";
import { NORMAL } from "@/lib/evolution/sim/difficulty";
import { GAMEPLAY_TRAITS, exclusiveGroups, isUnlocked } from "@/lib/evolution/sim/traits";
import { ScienceNote } from "./ScienceNote";

const NAME: Record<string, string> = {
  eyes: "Early eyes", swimming: "Streamlined swimming", armor: "Bony armour", thermal: "Thermal tolerance",
  hypoxia: "Hypoxia tolerance", repR: "Fast breeders (r)", repK: "Resilient broods (K)", jaws: "Jaws",
  "paired-fins": "Paired fins", osmoregulation: "Osmoregulation", "lobed-limbs": "Lobed limbs", airGulping: "Air-gulping",
};
const SCIENCE: Record<string, string> = {
  armor: "Bony armour appears in Ordovician jawless fish (Arandaspis ~480–470 Ma).",
  jaws: "Earliest jawed vertebrates are early Silurian (~439 Ma, Qianodus).",
  "paired-fins": "Earliest paired fins ~436 Ma (galeaspids, Fanjingshania).",
  "lobed-limbs": "Lobed fins prop in the shallows — one possible branch, not a tetrapod.",
  thermal: "Mitigates the Late Ordovician Hirnantian cooling.",
  hypoxia: "Mitigates deep-water and Late-Devonian anoxia (Kellwasser, Hangenberg).",
  osmoregulation: "Opens brackish/freshwater habitats (estuary, river).",
  airGulping: "Buccal air-gulping helps in low-oxygen shallows and brief exposure.",
};
const ORDER = ["eyes", "swimming", "thermal", "hypoxia", "armor", "repR", "repK", "jaws", "paired-fins", "osmoregulation", "lobed-limbs", "airGulping"];

function conflict(owned: string[], t: string): boolean {
  return exclusiveGroups.some((g) => g.includes(t) && g.some((x) => x !== t && owned.includes(x)));
}

export function TraitShop({ state, dispatch }: { state: SimState; dispatch: (a: Action) => void }) {
  const period = state.clock.period;
  const rows = ORDER.filter((t) => GAMEPLAY_TRAITS[t] && isUnlocked(t, period));
  if (rows.length === 0) return <p className="evo-shop__empty">No adaptations unlocked yet — spread and gather Evolution Points.</p>;

  return (
    <ul className="evo-shop">
      {rows.map((t) => {
        const owned = state.traits.includes(t);
        const cost = NORMAL.traitCost[t] ?? Infinity;
        const blocked = conflict(state.traits, t);
        const afford = state.ep >= cost;
        return (
          <li key={t} className={`evo-shop__row${owned ? " is-owned" : ""}`}>
            <div className="evo-shop__head">
              <span className="evo-shop__name">{NAME[t] ?? t}</span>
              <span className="evo-shop__cost">{owned ? "owned" : `${cost} EP`}</span>
            </div>
            <p className="evo-shop__trade">{GAMEPLAY_TRAITS[t].tradeoff}</p>
            {!owned ? (
              <button
                type="button"
                className="evo-btn evo-btn--sm evo-btn--primary"
                disabled={!afford || blocked}
                onClick={() => dispatch({ type: "buyTrait", trait: t })}
              >
                {blocked ? "Excluded by your choice" : afford ? "Adopt" : "Not enough EP"}
              </button>
            ) : null}
            {SCIENCE[t] ? <ScienceNote>{SCIENCE[t]}</ScienceNote> : null}
          </li>
        );
      })}
    </ul>
  );
}
