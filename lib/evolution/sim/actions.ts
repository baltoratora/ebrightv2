// Shared pure action reducers. Both the headless policies and the future UI
// apply actions ONLY through here, so validation and effects are identical
// (spec correction 1). No action injects population/EP/traits illegitimately.

import type { DifficultyParams } from "./difficulty";
import type { NicheId, RegionId, SimState } from "./state";
import { PLAYABLE_REGIONS } from "./state";
import { GAMEPLAY_TRAITS, exclusiveGroups, isUnlocked } from "./traits";
import { applyTransition } from "./modes";

export type Action =
  | { type: "resolveDecision"; choice: string | null }
  | { type: "buyTrait"; trait: string }
  | { type: "setFocus"; region: RegionId }
  | { type: "resume" }
  | { type: "pause" };

export interface ActionResult { state: SimState; error?: string; }

function conflictsExclusive(owned: string[], trait: string): boolean {
  for (const group of exclusiveGroups) {
    if (group.includes(trait) && group.some((g) => g !== trait && owned.includes(g))) return true;
  }
  return false;
}

function addTrait(s: SimState, trait: string): SimState {
  if (s.traits.includes(trait)) return s;
  return { ...s, traits: [...s.traits, trait] };
}

export function applyAction(s: SimState, action: Action, params: DifficultyParams): ActionResult {
  if (s.status !== "running") return { state: s, error: "run is over" };

  switch (action.type) {
    case "buyTrait": {
      const t = GAMEPLAY_TRAITS[action.trait];
      if (!t) return { state: s, error: `unknown trait ${action.trait}` };
      if (!isUnlocked(action.trait, s.clock.period)) return { state: s, error: `trait locked this period` };
      if (s.traits.includes(action.trait)) return { state: s, error: `already owned` };
      if (conflictsExclusive(s.traits, action.trait)) return { state: s, error: `exclusive conflict` };
      const cost = params.traitCost[action.trait] ?? Infinity;
      if (s.ep < cost) return { state: s, error: `insufficient EP` };
      return { state: { ...addTrait(s, action.trait), ep: s.ep - cost } };
    }

    case "setFocus": {
      if (!PLAYABLE_REGIONS.includes(action.region)) return { state: s, error: `invalid focus region` };
      return { state: { ...s, spreadFocus: action.region } };
    }

    case "resolveDecision": {
      const d = s.pendingDecision;
      if (!d) return { state: s, error: `no pending decision` };
      let next = s;
      switch (d.kind) {
        case "niche": {
          if (!action.choice || !d.options.includes(action.choice)) return { state: s, error: `invalid niche` };
          next = { ...s, niche: action.choice as NicheId };
          break;
        }
        case "mutation": {
          if (action.choice === null) {
            next = { ...s, ep: s.ep + params.declineEP };
          } else {
            if (!d.options.includes(action.choice)) return { state: s, error: `option not offered` };
            if (conflictsExclusive(s.traits, action.choice)) return { state: s, error: `exclusive conflict` };
            next = addTrait(s, action.choice); // free (spontaneous mutation)
          }
          break;
        }
        case "event":
        case "extinctionBriefing": {
          next = s; // acknowledge-only
          break;
        }
        case "transition": {
          next = applyTransition(s);
          break;
        }
      }
      // decision resolved; stays paused until an explicit resume (requiresResume)
      return { state: { ...next, pendingDecision: null, paused: true } };
    }

    case "resume": {
      if (s.pendingDecision) return { state: s, error: `resolve the pending decision first` };
      return { state: { ...s, paused: false } };
    }

    case "pause": {
      return { state: { ...s, paused: true } };
    }
  }
}
