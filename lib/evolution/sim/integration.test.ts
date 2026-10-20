import { describe, it, expect } from "vitest";
import { tick } from "./tick";
import { initialState, type SimState } from "./state";
import { makeRng } from "./rng";
import { NORMAL } from "./difficulty";
import { applyAction } from "./actions";
import { serialize, deserialize } from "../save/save";

function stepOnce(s: SimState): SimState {
  return tick(s, makeRng(s.rngSeed, s.rngCursor), NORMAL);
}

// Drive a minimal "resolve everything and resume" loop, stopping BEFORE acting
// when stopWhen(s) is true.
function drive(s: SimState, stopWhen: (s: SimState) => boolean, cap = 20000): SimState {
  let guard = 0;
  while (s.status === "running" && guard++ < cap) {
    if (stopWhen(s)) return s;
    if (s.pendingDecision) {
      const d = s.pendingDecision;
      const choice = d.kind === "niche" ? "filterFeeding" : null;
      s = applyAction(s, { type: "resolveDecision", choice }, NORMAL).state;
    } else if (s.paused) {
      s = applyAction(s, { type: "resume" }, NORMAL).state;
    } else {
      s = stepOnce(s);
    }
  }
  return s;
}

describe("integration: ordinary events, transition mutations, extinction end", () => {
  it("fires the Cambrian ordinary event as a pausing briefing, applies it once, survives save/resume", () => {
    const start = initialState({ mode: "survival", rngSeed: 1 });
    const atWarn = drive(start, (s) => s.pendingDecision?.id === "warn:cambrian-oxygenation");
    expect(atWarn.pendingDecision?.kind).toBe("event"); // ordinary → "event", not extinction
    expect(atWarn.paused).toBe(true);
    expect(atWarn.schedule.firedWarnings).toContain("cambrian-oxygenation");

    // save/resume at the pause: exact round-trip, decision + schedule preserved
    const resumed = deserialize(serialize(atWarn)).state!;
    expect(resumed).toEqual(atWarn);

    // acknowledge + resume → effect applies exactly once
    const after = drive(resumed, (s) => s.schedule.firedShocks.includes("cambrian-oxygenation"));
    expect(after.eventModifiers.reef).toBeCloseTo(1.15);
    const later = drive(after, (s) => s.clock.elapsedInPeriod > 250);
    expect(later.schedule.firedShocks.filter((x) => x === "cambrian-oxygenation")).toHaveLength(1);
  });

  it("offers a mutation at the start of a new period (transition mutation)", () => {
    const start = initialState({ mode: "survival", rngSeed: 1 });
    const atMut = drive(
      start,
      (s) => s.clock.period === "ordovician" && s.pendingDecision?.kind === "mutation",
    );
    expect(atMut.clock.period).toBe("ordovician");
    expect(atMut.pendingDecision?.kind).toBe("mutation");
    expect(atMut.pendingDecision!.options.length).toBeGreaterThan(0);
  });

  it("ends the run as extinction when total population drops below the global floor", () => {
    let s = initialState({ mode: "survival", rngSeed: 1 });
    s = applyAction(s, { type: "resolveDecision", choice: "filterFeeding" }, NORMAL).state;
    s = applyAction(s, { type: "resume" }, NORMAL).state;
    s = { ...s, regions: { ...s.regions, nursery: { ...s.regions.nursery, P: 0.4 } } };
    const next = stepOnce(s);
    expect(next.status).toBe("lost");
    expect(next.outcome?.cause).toBe("extinction");
  });
});
