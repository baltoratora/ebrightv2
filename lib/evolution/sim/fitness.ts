// Fitness: how well the current adaptations suit a region this period → f∈[0,1].
// Continuous (a missing trait means poor fit, not zero). Separate temperature
// and oxygen axes (spec §1.1). Active shock penalties are passed in and are
// mitigated by the owning trait.

import type { NicheId, RegionId } from "./state";
import { regionState } from "./regions";
import type { Period } from "./state";

export interface FitnessCtx {
  period: Period;
  traits: string[];
  niche: NicheId | null;
  // ongoing shock penalties (from state.activePenalties)
  penalties?: { regions: RegionId[]; amount: number; mitigatedBy: string }[];
}

const BASE = 0.8;

function has(ctx: FitnessCtx, t: string): boolean {
  return ctx.traits.includes(t);
}

export function fitness(id: RegionId, ctx: FitnessCtx): number {
  const r = regionState(id, ctx.period);
  if (!r.available) return 0;
  let f = BASE;

  // predation — mitigated strongly by armour
  f -= r.predation * (has(ctx, "armor") ? 0.1 : 0.9);

  // oxygen — anoxic/dysoxic mitigated by hypoxia tolerance; air-gulping helps
  // low-oxygen shallows too
  if (r.oxygen === "anoxic") f -= has(ctx, "hypoxia") ? 0.1 : 0.9;
  else if (r.oxygen === "dysoxic") f -= has(ctx, "hypoxia") || has(ctx, "airGulping") ? 0.05 : 0.4;

  // salinity — brackish/fresh mitigated by osmoregulation
  if (r.salinity === "brackish") f -= has(ctx, "osmoregulation") ? 0.05 : 0.5;
  else if (r.salinity === "fresh") f -= has(ctx, "osmoregulation") ? 0.1 : 0.9;

  // pelagic open water — rewards paired fins
  if (r.pelagic && !has(ctx, "paired-fins")) f -= 0.5;

  // air exposure (tidal flats) — mitigated by air-gulping; needs lobed limbs for access
  if (r.exposure > 0) f -= r.exposure * (has(ctx, "airGulping") ? 0.1 : 0.9);

  // feeding efficiency — jaws boost; eyes a small boost
  if (has(ctx, "jaws")) f += 0.08;
  if (has(ctx, "eyes")) f += 0.03;

  // niche preference — small, non-threshold-breaking
  if (ctx.niche === "filterFeeding" && (r.pelagic || id === "nursery" || id === "reef")) f += 0.04;
  if (ctx.niche === "benthicGrazing" && (id === "deepAnoxic" || id === "estuary" || id === "river")) f += 0.04;

  // ongoing shock penalties (cold / anoxic pulses), mitigated by the named trait
  for (const pen of ctx.penalties ?? []) {
    if (pen.regions.includes(id)) f -= has(ctx, pen.mitigatedBy) ? pen.amount * 0.1 : pen.amount;
  }

  // metabolic trade-offs for tolerances in benign regions
  if (has(ctx, "thermal") && r.temp === "warm") f -= 0.03;
  if (has(ctx, "hypoxia") && r.oxygen === "oxic") f -= 0.03;

  return Math.max(0, Math.min(1, f));
}
