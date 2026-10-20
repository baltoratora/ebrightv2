// Lineage forms and deterministic render resolution.
//
// One fictional finned-swimmer lineage, four period forms. Forms share a base
// body/eye/tail so they read as kin; traits add or replace parts to give each a
// distinct silhouette. Rendering is deterministic: the same (form, traits) always
// yields the same ordered layer list.

import type { EraId } from "../palette";
import type { TraitId } from "../traits/traits";
import { PARTS, type PartId, type PaletteRole } from "./parts";

export type FormId = EraId;

export interface Form {
  id: FormId;
  label: string;
  /** Base parts always present before trait resolution. */
  baseParts: PartId[];
  /** Default active traits for this form. */
  defaultTraits: TraitId[];
}

/** Parts each trait contributes. */
const TRAIT_PARTS: Record<TraitId, PartId[]> = {
  armor: ["armor"],
  jaws: ["jaws"],
  "paired-fins": ["fin-pectoral", "fin-pelvic"],
  "lobed-limbs": ["limb-fore", "limb-hind"],
};

const BASE: PartId[] = ["body", "eye", "tail", "mouth-simple"];

export const FORMS: Record<FormId, Form> = {
  cambrian: { id: "cambrian", label: "Cambrian form", baseParts: BASE, defaultTraits: [] },
  ordovician: { id: "ordovician", label: "Ordovician form", baseParts: BASE, defaultTraits: ["armor"] },
  silurian: { id: "silurian", label: "Silurian form", baseParts: BASE, defaultTraits: ["jaws", "paired-fins"] },
  devonian: { id: "devonian", label: "Devonian form", baseParts: BASE, defaultTraits: ["jaws", "lobed-limbs"] },
};

export const FORM_ORDER: FormId[] = ["cambrian", "ordovician", "silurian", "devonian"];

export interface RenderLayer {
  partId: PartId;
  layer: number;
  paletteRole: PaletteRole;
}

/**
 * Resolve a form + active traits to an ordered, deduplicated layer list.
 * Exclusivity:
 *   - jaws replaces the simple mouth.
 *   - lobed limbs replace paired fins (same flank appendage slot).
 * Output is sorted by (layer, partId) so it is independent of input ordering.
 */
export function renderDescriptor(formId: FormId, activeTraits: TraitId[]): RenderLayer[] {
  const form = FORMS[formId];
  const active = new Set(activeTraits);
  const parts = new Set<PartId>(form.baseParts);

  if (active.has("jaws")) parts.delete("mouth-simple");

  for (const trait of activeTraits) {
    if (trait === "paired-fins" && active.has("lobed-limbs")) continue; // lobed limbs win
    for (const partId of TRAIT_PARTS[trait]) parts.add(partId);
  }

  return [...parts]
    .map((partId) => {
      const meta = PARTS[partId];
      return { partId, layer: meta.layer, paletteRole: meta.paletteRole };
    })
    .sort((a, b) => a.layer - b.layer || a.partId.localeCompare(b.partId));
}

/** Convenience: the default look for a form. */
export function defaultDescriptor(formId: FormId): RenderLayer[] {
  return renderDescriptor(formId, FORMS[formId].defaultTraits);
}
