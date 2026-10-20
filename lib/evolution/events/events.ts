// Ordinary (non-extinction) event effects: a mild, recoverable capacity nudge
// applied once per event id, idempotent on resume. Period transitions reset
// eventModifiers, so ordinary nudges are period-scoped (spec §7.1).

import type { SimState } from "../sim/state";
import type { ScheduledEvent } from "./schedule";

export function applyOrdinary(s: SimState, ev: ScheduledEvent): SimState {
  if (ev.kind !== "ordinary" || !ev.effect) return s;
  if (s.schedule.firedShocks.includes(ev.id)) return s;
  const eventModifiers = { ...s.eventModifiers };
  for (const id of ev.effect.regions) eventModifiers[id] = ev.effect.factor;
  return {
    ...s,
    eventModifiers,
    schedule: { ...s.schedule, firedShocks: [...s.schedule.firedShocks, ev.id] },
    lastShockReport: { id: ev.id, regions: ev.effect.regions, lostFraction: 0 },
  };
}
