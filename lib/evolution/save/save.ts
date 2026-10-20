// Versioned, fail-safe save/resume. Runtime validation beyond JSON+version:
// rejects malformed state, invalid ids, non-finite/negative values, and
// inconsistent pending decisions. Invalid saves are preserved (rawBackup),
// never silently zeroed (spec §9, correction 4).

import type { SimState } from "../sim/state";
import { ALL_REGIONS, PERIODS, SCHEMA_VERSION } from "../sim/state";

export interface LoadResult {
  state: SimState | null;
  error?: "corrupt" | "version" | "invalid";
  reason?: string;
  rawBackup?: string;
}

export function serialize(s: SimState): string {
  return JSON.stringify(s);
}

const MODES = ["survival", "dominate"];
const STATUSES = ["running", "won", "lost"];
const OCC = ["inaccessible", "colonizing", "occupied"];
const DECISION_KINDS = ["niche", "mutation", "event", "extinctionBriefing", "transition"];

function finitePos(n: unknown): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function validate(o: unknown): string | null {
  if (typeof o !== "object" || o === null) return "not an object";
  const s = o as Record<string, unknown>;
  if (!MODES.includes(s.mode as string)) return "bad mode";
  if (s.difficulty !== "normal") return "bad difficulty";
  if (!STATUSES.includes(s.status as string)) return "bad status";
  const clock = s.clock as Record<string, unknown> | undefined;
  if (!clock || !PERIODS.includes(clock.period as never)) return "bad period";
  if (!finitePos(clock.elapsedInPeriod) || !finitePos(clock.totalElapsed)) return "bad clock";
  if (!finitePos(s.ep)) return "bad ep";
  if (!finitePos(s.rngSeed) || !finitePos(s.rngCursor)) return "bad rng";
  const regions = s.regions as Record<string, unknown> | undefined;
  if (!regions) return "missing regions";
  for (const id of ALL_REGIONS) {
    const r = regions[id] as Record<string, unknown> | undefined;
    if (!r) return `missing region ${id}`;
    if (!finitePos(r.P)) return `bad P in ${id}`;
    if (!OCC.includes(r.occ as string)) return `bad occ in ${id}`;
  }
  if (!Array.isArray(s.traits) || (s.traits as unknown[]).some((t) => typeof t !== "string")) return "bad traits";
  const pd = s.pendingDecision as Record<string, unknown> | null;
  if (pd !== null) {
    if (typeof pd !== "object") return "bad pendingDecision";
    if (!DECISION_KINDS.includes(pd.kind as string)) return "bad decision kind";
    if (!Array.isArray(pd.options)) return "bad decision options";
    if (pd.kind === "mutation" && (pd.options as unknown[]).length === 0) return "mutation with no options";
    if (typeof pd.requiresResume !== "boolean") return "bad requiresResume";
    // a paused flag must accompany a pending decision
    if (s.paused !== true) return "pending decision but not paused";
  }
  return null;
}

export function deserialize(str: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(str);
  } catch {
    return { state: null, error: "corrupt", rawBackup: str };
  }
  const version = (parsed as Record<string, unknown>)?.schemaVersion;
  if (version !== SCHEMA_VERSION) {
    return { state: null, error: "version", reason: `got ${String(version)}`, rawBackup: str };
  }
  const reason = validate(parsed);
  if (reason) return { state: null, error: "invalid", reason, rawBackup: str };
  return { state: parsed as SimState };
}
