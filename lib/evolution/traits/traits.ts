// Trait definitions for the Evolve art system.
//
// Each trait records the honesty ledger from the spec:
//   (a) earliest evidence, (b) main diversification, (c) game unlock period.
// `simplification` is true only when (c) is earlier than (a) — none are here,
// because each trait is unlocked in (or after) the period of its earliest
// evidence. Sources are in the design spec's fact table.

import type { EraId } from "../palette";

export type TraitId = "armor" | "jaws" | "paired-fins" | "lobed-limbs";

export interface Trait {
  id: TraitId;
  label: string;
  iconId: TraitId; // trait icon shares the id
  earliestEvidence: string; // (a)
  diversification: string; // (b)
  unlockPeriod: EraId; // (c)
  simplification: boolean;
  blurb: string;
}

export const TRAITS: Record<TraitId, Trait> = {
  armor: {
    id: "armor",
    label: "Bony armour",
    iconId: "armor",
    earliestEvidence: "Ordovician ~480–470 Ma (Arandaspis, Sacabambaspis)",
    diversification: "Ordovician–Silurian ostracoderms",
    unlockPeriod: "ordovician",
    simplification: false,
    blurb: "Bony plates shield the head and body.",
  },
  jaws: {
    id: "jaws",
    label: "Jaws",
    iconId: "jaws",
    earliestEvidence: "early Silurian ~439 Ma (Qianodus)",
    diversification: "Devonian, the Age of Fishes",
    unlockPeriod: "silurian",
    simplification: false,
    blurb: "Hinged jaws open up new diets.",
  },
  "paired-fins": {
    id: "paired-fins",
    label: "Paired fins",
    iconId: "paired-fins",
    earliestEvidence: "early Silurian ~436 Ma (galeaspids, Fanjingshania)",
    diversification: "Devonian",
    unlockPeriod: "silurian",
    simplification: false,
    blurb: "Paired fins steer and stabilise.",
  },
  "lobed-limbs": {
    id: "lobed-limbs",
    label: "Lobed limbs",
    iconId: "lobed-limbs",
    earliestEvidence: "Devonian lobe-fins; tetrapodomorphs ~375 Ma",
    diversification: "Late Devonian onward",
    unlockPeriod: "devonian",
    simplification: false,
    blurb: "Muscular lobed fins prop in the shallows — one possible branch, not a tetrapod.",
  },
};

export const TRAIT_ORDER: TraitId[] = ["armor", "jaws", "paired-fins", "lobed-limbs"];
