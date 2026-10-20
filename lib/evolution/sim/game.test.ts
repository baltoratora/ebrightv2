import { describe, it, expect } from "vitest";
import { createGame } from "./game";

function started(mode: "survival" | "dominate" = "survival", seed = 1) {
  const g = createGame({ mode, seed });
  g.dispatch({ type: "resolveDecision", choice: "filterFeeding" });
  g.dispatch({ type: "resume" });
  return g;
}

describe("createGame", () => {
  it("does not advance while a decision is pending", () => {
    const g = createGame({ mode: "survival", seed: 1 });
    const before = g.state.clock.totalElapsed;
    g.advance(1000);
    expect(g.state.clock.totalElapsed).toBe(before);
  });
  it("advances in whole SIM_DT steps once resolved + resumed", () => {
    const g = started();
    g.advance(1000); // 1s at 1x → 4 steps of 0.25
    expect(g.state.clock.totalElapsed).toBeCloseTo(1.0);
  });
  it("speed multiplies steps per real second, not step size", () => {
    const g = started();
    g.setSpeed(2);
    g.advance(1000);
    expect(g.state.clock.totalElapsed).toBeCloseTo(2.0);
  });
  it("drops accumulated time on pause so resuming never jumps", () => {
    const g = started();
    g.pause();
    g.advance(100000); // a long hidden interval while paused
    const after = g.state;
    g.dispatch({ type: "resume" });
    g.advance(250); // one step worth
    expect(after.clock.totalElapsed).toBe(0); // nothing banked while paused
    expect(g.state.clock.totalElapsed).toBeCloseTo(0.25);
  });
  it("autosaves and resumes bit-exactly", () => {
    const g = started("dominate", 3);
    g.advance(500);
    const saved = g.serialize();
    const g2 = createGame({ resume: saved });
    expect(g2.state).toEqual(g.state);
  });
});
