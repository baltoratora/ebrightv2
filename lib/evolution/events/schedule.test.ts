import { describe, it, expect } from "vitest";
import { scheduleFor } from "./schedule";
import { PERIODS } from "../sim/state";
import { NORMAL } from "../sim/difficulty";

describe("event schedule", () => {
  it("every event has a warning strictly before its effect", () => {
    for (const p of PERIODS) for (const ev of scheduleFor(p)) expect(ev.warnAt).toBeLessThan(ev.shockAt);
  });
  it("Devonian schedules Kellwasser before Hangenberg, both before the deadline", () => {
    const dev = scheduleFor("devonian");
    const k = dev.find((e) => e.id === "kellwasser")!;
    const h = dev.find((e) => e.id === "hangenberg")!;
    expect(k.shockAt).toBeLessThan(h.shockAt);
    expect(h.shockAt).toBeLessThan(NORMAL.eraBudgetSec.devonian);
  });
  it("Cambrian and Silurian carry ordinary events only (no extinction)", () => {
    for (const p of ["cambrian", "silurian"] as const) {
      const evs = scheduleFor(p);
      expect(evs.length).toBeGreaterThan(0);
      expect(evs.every((e) => e.kind === "ordinary")).toBe(true);
    }
  });
  it("Ordovician and Devonian boundaries carry extinction events", () => {
    expect(scheduleFor("ordovician").some((e) => e.kind === "extinction")).toBe(true);
    expect(scheduleFor("devonian").filter((e) => e.kind === "extinction")).toHaveLength(2);
  });
});
