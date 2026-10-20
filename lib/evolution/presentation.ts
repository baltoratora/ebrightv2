// Read-only presentation selectors. No clocks, RNG calls, or state mutations.
// Scenes are artistic habitat studies, not paleogeographic reconstructions.
import type { RegionId, SimState } from "./sim/state";
import { availableRegions, edgesFor, effectiveGate } from "./sim/regions";
import { capacityK } from "./sim/capacity";
import { fitness } from "./sim/fitness";
import { NORMAL } from "./sim/difficulty";

export const HABITAT_NAMES: Record<RegionId, string> = {
  nursery: "Nursery shallows", reef: "Reef shelf", openOcean: "Open water",
  deepAnoxic: "Deep water", estuary: "Estuary", river: "River lowlands",
  tidalFlats: "Tidal flats", land: "Terrestrial lowlands",
};

export const HABITAT_COPY: Record<RegionId, string> = {
  nursery: "A sheltered beginning. Follow your lineage as it finds a foothold in the shallows.",
  reef: "A mosaic of shelter and feeding grounds. A rich home, with competition close by.",
  openOcean: "Beyond the shelf, currents carry opportunity. Movement and adaptation matter here.",
  deepAnoxic: "The light falls away. Low oxygen makes this a demanding habitat for your lineage.",
  estuary: "Two waters meet. Changing salinity rewards a lineage that can adapt.",
  river: "A freshwater refuge. Your lineage has found a different path through a changing world.",
  tidalFlats: "At the water’s edge. These intermittently exposed shallows are still an aquatic home.",
  land: "Another world awaits. Sustained land occupation is outside this chapter.",
};

export const TRAIT_NAMES: Record<string, string> = {
  eyes: "Sharper vision", swimming: "Efficient swimming", armor: "Bony armour",
  jaws: "Jaws", "paired-fins": "Paired fins", "lobed-limbs": "Lobed fins",
  thermal: "Thermal tolerance", hypoxia: "Hypoxia tolerance", osmoregulation: "Salt regulation",
  airGulping: "Air-gulping", repR: "Fast reproduction", repK: "Resilient reproduction",
};

export function visibleHabitat(s: SimState, requested: RegionId | null): RegionId {
  const available = availableRegions(s.clock.period);
  return requested && available.includes(requested) ? requested : "nursery";
}

export function habitatView(s: SimState, id: RegionId) {
  const capacity = capacityK(id, s.clock.period, s.eventModifiers[id], NORMAL);
  const fit = fitness(id, { period: s.clock.period, traits: s.traits, niche: s.niche, penalties: s.activePenalties });
  return { capacity, fit, population: s.regions[id].P, occupied: s.regions[id].occ === "occupied",
    // Density is illustrative. Never imply that individual sprites are a census.
    density: capacity > 0 ? Math.min(1, s.regions[id].P / capacity) : 0,
    stressed: capacity === 0 || fit < 0.45 };
}

// Eligible dispersal corridors, not claimed per-edge measurements of migrants.
// A closed edge, empty source, destroyed destination, or zero-fit destination
// must never be depicted as an active corridor.
export function dispersalCorridors(s: SimState) {
  return edgesFor(s.clock.period).filter((edge) => effectiveGate(edge, s.traits) !== "hard")
    .flatMap((edge) => [ { from: edge.a, to: edge.b }, { from: edge.b, to: edge.a } ])
    .filter(({ from, to }) => s.regions[from].P > 0 && habitatView(s, to).capacity > s.regions[to].P && habitatView(s, to).fit > 0);
}
