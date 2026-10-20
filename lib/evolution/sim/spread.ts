// Migration: snapshot-based, per-second source budget, absolute edge conductance
// applied to ACTUAL flow (not just relative weight), destination combined cap
// across all sources, allocate-before-deduct (spec §4.5, Rev 3.1).

import type { DifficultyParams } from "./difficulty";
import type { EdgeGate } from "./regions";

export interface MigrateWorld {
  P: Record<string, number>;
  K: Record<string, number>;
  edges: { from: string; to: string; gate: EdgeGate }[];
  focus?: string | null; // optional spread focus: extra weight to this destination
  // optional per-destination attractiveness (e.g. fitness) so migrants favour
  // suitable habitat rather than dispersing evenly into unsuitable sinks.
  attract?: Record<string, number>;
}

export function migrate(w: MigrateWorld, params: DifficultyParams): Record<string, number> {
  const P0 = { ...w.P };
  const headroom = (id: string) => Math.max(0, (w.K[id] ?? 0) - (P0[id] ?? 0));
  const attract = (id: string) => (w.attract ? Math.max(0, w.attract[id] ?? 0) : 1);
  const cond = (g: EdgeGate) => params.conductance[g];

  // group edges by source
  const bySource: Record<string, { to: string; gate: EdgeGate }[]> = {};
  for (const e of w.edges) (bySource[e.from] ??= []).push({ to: e.to, gate: e.gate });

  // 1. propose per-edge flow from the snapshot
  const props: { from: string; to: string; flow: number }[] = [];
  for (const from of Object.keys(bySource)) {
    const p0 = P0[from] ?? 0;
    if (p0 <= 0) continue;
    const budget = params.migrationRate * params.SIM_DT * p0;
    const outs = bySource[from];
    // split by destination headroom (focus doubles its weight)
    let totalWeight = 0;
    const weights = outs.map((e) => {
      const w2 = headroom(e.to) * attract(e.to) * (w.focus && e.to === w.focus ? 2 : 1);
      totalWeight += w2;
      return w2;
    });
    if (totalWeight <= 0) continue;
    outs.forEach((e, i) => {
      const share = budget * (weights[i] / totalWeight);
      const flow = share * cond(e.gate); // absolute conductance → throttles actual flow
      if (flow > 0) props.push({ from, to: e.to, flow });
    });
  }

  // 2. destination combined cap: scale all inflows to d so Σ ≤ headroom(d)
  const inByDest: Record<string, number> = {};
  for (const p of props) inByDest[p.to] = (inByDest[p.to] ?? 0) + p.flow;
  const accept: Record<string, number> = {};
  for (const d of Object.keys(inByDest)) {
    const hr = headroom(d);
    accept[d] = inByDest[d] > hr && inByDest[d] > 0 ? hr / inByDest[d] : 1;
  }

  // 3. allocate accepted to destinations, deduct the same from sources
  const delta: Record<string, number> = {};
  for (const id of Object.keys(w.P)) delta[id] = 0;
  for (const p of props) {
    const acc = p.flow * accept[p.to];
    delta[p.to] += acc;
    delta[p.from] -= acc;
  }
  return delta;
}
