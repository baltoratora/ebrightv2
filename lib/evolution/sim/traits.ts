// Gameplay trait metadata (separate from the art-system traits in
// lib/evolution/traits/traits.ts, which stay untouched). Period-gated per the
// spec §3 ledger; thermal and hypoxia tolerance are deliberately separate.

import type { Period } from "./state";

export interface GameplayTrait {
  id: string;
  unlock: Period;
  tradeoff: string;
}

export const GAMEPLAY_TRAITS: Record<string, GameplayTrait> = {
  // Cambrian baseline adaptations (cheap, scientifically-grounded; spec §3.1)
  eyes: { id: "eyes", unlock: "cambrian", tradeoff: "none notable — modest cost" },
  swimming: { id: "swimming", unlock: "cambrian", tradeoff: "none notable — modest cost" },
  // Ordovician
  armor: { id: "armor", unlock: "ordovician", tradeoff: "−growth & −spread (heavier)" },
  thermal: { id: "thermal", unlock: "ordovician", tradeoff: "−growth in stable-warm regions" },
  hypoxia: { id: "hypoxia", unlock: "ordovician", tradeoff: "−efficiency in well-oxygenated shallows" },
  repR: { id: "repR", unlock: "ordovician", tradeoff: "lower capacity ceiling" },
  repK: { id: "repK", unlock: "ordovician", tradeoff: "slower growth + recovery" },
  // Silurian
  jaws: { id: "jaws", unlock: "silurian", tradeoff: "+food-scarcity vulnerability" },
  "paired-fins": { id: "paired-fins", unlock: "silurian", tradeoff: "mild anti-synergy with heavy armour" },
  osmoregulation: { id: "osmoregulation", unlock: "silurian", tradeoff: "small marine-efficiency cost" },
  // Devonian
  "lobed-limbs": { id: "lobed-limbs", unlock: "devonian", tradeoff: "−open/deep efficiency; no land" },
  airGulping: { id: "airGulping", unlock: "devonian", tradeoff: "energy upkeep when unused" },
};

// Mutually-exclusive buyable traits (reproduction strategy). The feeding niche
// (filterFeeding/benthicGrazing) is a separate single-valued state field.
export const exclusiveGroups: string[][] = [["repR", "repK"]];

const PERIOD_ORDER: Period[] = ["cambrian", "ordovician", "silurian", "devonian"];
export function isUnlocked(traitId: string, period: Period): boolean {
  const t = GAMEPLAY_TRAITS[traitId];
  if (!t) return false;
  return PERIOD_ORDER.indexOf(period) >= PERIOD_ORDER.indexOf(t.unlock);
}
