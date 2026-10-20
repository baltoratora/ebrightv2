// Pure UI selector: why is a region thriving / declining / inaccessible, and
// which adaptation would help — kept out of the React components (spec §10,
// "region inspector"). Also a period label with the ICS Ma span.

import type { DifficultyParams } from "./difficulty";
import type { OccState, Period, RegionId, SimState } from "./state";
import { PERIODS } from "./state";
import { regionState, REGIONS, EDGES } from "./regions";
import { fitness } from "./fitness";
import { capacityK } from "./capacity";
import { stepPopulation } from "./population";
import { getEra } from "../eras/eras";

export interface Inspection {
  status: OccState;
  thriving: boolean;
  limitingFactor: string | null;
  suggestion: string | null;
  detail: string;
}

const TRAIT_LABEL: Record<string, string> = {
  armor: "Bony armour",
  "paired-fins": "Paired fins",
  hypoxia: "Hypoxia tolerance",
  thermal: "Thermal tolerance",
  osmoregulation: "Osmoregulation",
  airGulping: "Air-gulping",
  "lobed-limbs": "Lobed limbs",
};

function firstAvailablePeriod(id: RegionId): Period | null {
  for (const p of PERIODS) if (regionState(id, p).available) return p;
  return null;
}

// The largest fitness penalty and the trait that mitigates it.
function dominantLimit(id: RegionId, s: SimState): { factor: string; trait: string | null } | null {
  const p = s.clock.period;
  const r = regionState(id, p);
  const has = (t: string) => s.traits.includes(t);
  const cands: { factor: string; amount: number; trait: string | null }[] = [];

  if (r.predation > 0 && !has("armor")) cands.push({ factor: "predation", amount: r.predation * 0.9, trait: "armor" });
  if (r.oxygen === "anoxic" && !has("hypoxia")) cands.push({ factor: "low oxygen", amount: 0.9, trait: "hypoxia" });
  if (r.oxygen === "dysoxic" && !has("hypoxia") && !has("airGulping")) cands.push({ factor: "low oxygen", amount: 0.4, trait: "hypoxia" });
  if (r.salinity === "brackish" && !has("osmoregulation")) cands.push({ factor: "salinity", amount: 0.5, trait: "osmoregulation" });
  if (r.salinity === "fresh" && !has("osmoregulation")) cands.push({ factor: "fresh water", amount: 0.9, trait: "osmoregulation" });
  if (r.pelagic && !has("paired-fins")) cands.push({ factor: "open-water mobility", amount: 0.5, trait: "paired-fins" });
  if (r.exposure > 0 && !has("airGulping")) cands.push({ factor: "air exposure", amount: r.exposure * 0.9, trait: "airGulping" });
  for (const pen of s.activePenalties) {
    if (pen.regions.includes(id) && !has(pen.mitigatedBy)) {
      const factor = pen.mitigatedBy === "thermal" ? "cold" : "anoxic pulse";
      cands.push({ factor, amount: pen.amount, trait: pen.mitigatedBy });
    }
  }

  if (cands.length === 0) return null;
  cands.sort((a, b) => b.amount - a.amount);
  return { factor: cands[0].factor, trait: cands[0].trait };
}

export function inspectRegion(s: SimState, id: RegionId, params: DifficultyParams): Inspection {
  const p = s.clock.period;
  const r = regionState(id, p);

  if (REGIONS[id].lockedV1) {
    return {
      status: "inaccessible",
      thriving: false,
      limitingFactor: "beyond this lineage",
      suggestion: null,
      detail: "Life on land is beyond this branch — lobed fins move you through the shallows, not onto land. A future chapter (the Carboniferous).",
    };
  }

  if (!r.available) {
    const opens = firstAvailablePeriod(id);
    const openName = opens ? getEra(opens).name : "a later period";
    return {
      status: "inaccessible",
      thriving: false,
      limitingFactor: "not yet available",
      suggestion: null,
      detail: `This habitat opens in the ${openName}.`,
    };
  }

  const limit = dominantLimit(id, s);
  const f = fitness(id, { period: p, traits: s.traits, niche: s.niche, penalties: s.activePenalties });
  const k = capacityK(id, p, s.eventModifiers[id], params);
  const dP = stepPopulation({ P: Math.max(s.regions[id].P, 1), f, K: Math.max(k, 1), dt: params.SIM_DT, params }).dP;
  const status = s.regions[id].occ;

  let detail: string;
  if (status === "occupied") detail = dP >= 0 ? "Established and thriving here." : "Established but under pressure.";
  else if (status === "colonizing") detail = dP >= 0 ? "Colonising — population is building." : "Struggling to establish here.";
  else detail = "Reachable, but nothing has settled here yet.";

  const suggestion = limit?.trait ? `${TRAIT_LABEL[limit.trait] ?? limit.trait} would help` : null;
  return { status, thriving: dP >= 0, limitingFactor: limit?.factor ?? null, suggestion, detail };
}

export function periodLabel(period: Period): string {
  const e = getEra(period);
  return `${e.name} · ${e.baseMa}–${e.topMa} Ma`;
}

export function edgeTraitFor(id: RegionId, period: Period): string[] {
  for (const e of EDGES[period]) if (e.b === id || e.a === id) return e.requires ?? [];
  return [];
}
