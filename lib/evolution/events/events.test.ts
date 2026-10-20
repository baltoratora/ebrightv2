import { describe, it, expect } from "vitest";
import { applyOrdinary } from "./events";
import { scheduleFor } from "./schedule";
import { initialState } from "../sim/state";

describe("applyOrdinary", () => {
  it("applies a mild capacity nudge once and is idempotent per id", () => {
    const ev = scheduleFor("cambrian").find((e) => e.id === "cambrian-oxygenation")!;
    const s0 = initialState({ mode: "survival", rngSeed: 1 });
    const r1 = applyOrdinary(s0, ev);
    expect(r1.eventModifiers.reef).toBeCloseTo(1.15);
    expect(r1.schedule.firedShocks).toContain("cambrian-oxygenation");
    expect(r1.lastShockReport?.lostFraction).toBe(0);
    const r2 = applyOrdinary(r1, ev);
    expect(r2).toBe(r1); // already fired → unchanged reference
  });
});
