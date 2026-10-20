import { describe, it, expect } from "vitest";
import { runHeadless, referencePolicy } from "./headless";

describe("runHeadless", () => {
  it("runs deterministically and returns an outcome", () => {
    const a = runHeadless({ mode: "survival", seed: 1, policy: referencePolicy });
    const b = runHeadless({ mode: "survival", seed: 1, policy: referencePolicy });
    expect(a.outcome).toEqual(b.outcome);
    expect(a.steps).toBe(b.steps);
    expect(["won", "lost"]).toContain(a.outcome.status);
    expect(a.trace.length).toBeGreaterThan(0);
  });
});
