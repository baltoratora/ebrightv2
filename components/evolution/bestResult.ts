// Per-mode best-result persistence (spec §9). Guarded reads/writes so an
// unavailable or failing localStorage never crashes the game; invalid stored
// data is ignored rather than trusted.

import type { Mode, Period } from "@/lib/evolution/sim/state";

const KEY = "evolve:best";
const PERIOD_IX: Record<Period, number> = { cambrian: 0, ordovician: 1, silurian: 2, devonian: 3 };

export interface BestRecord {
  status: "won" | "lost";
  cause: string;
  finalPeriod: Period;
  occupied: number;
  missedTargets: number;
  usedRecovery: boolean;
  score: number;
}
export type BestMap = Partial<Record<Mode, BestRecord>>;

function scoreOf(r: Omit<BestRecord, "score">): number {
  return (r.status === "won" ? 100_000 : 0) + (PERIOD_IX[r.finalPeriod] ?? 0) * 1000 + r.occupied * 50 - r.missedTargets * 100;
}

export function loadBest(): BestMap {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: BestMap = {};
    for (const mode of ["survival", "dominate"] as Mode[]) {
      const r = parsed[mode] as BestRecord | undefined;
      if (r && typeof r.score === "number" && Number.isFinite(r.score) && typeof r.finalPeriod === "string") out[mode] = r;
    }
    return out;
  } catch {
    return {};
  }
}

export function recordResult(mode: Mode, rec: Omit<BestRecord, "score">): { best: BestRecord; improved: boolean } {
  const record: BestRecord = { ...rec, score: scoreOf(rec) };
  const map = loadBest();
  const prev = map[mode];
  const improved = !prev || record.score > prev.score;
  if (improved) {
    map[mode] = record;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(map));
    } catch {
      /* storage unavailable / quota — safe no-op; the in-memory result still shows */
    }
  }
  return { best: improved ? record : prev!, improved };
}

export function describeBest(r: BestRecord): string {
  const period = r.finalPeriod.charAt(0).toUpperCase() + r.finalPeriod.slice(1);
  if (r.status === "won") return `Won — reached the ${period}, ${r.occupied} regions`;
  return `${period}, ${r.occupied} regions`;
}
