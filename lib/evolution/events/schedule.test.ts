import { describe, it, expect } from "vitest";
import { scheduleFor } from "./schedule";
import { PERIODS } from "../sim/state";
import { NORMAL } from "../sim/difficulty";

describe("event schedule", () => {
  it("each shock has a warning strictly before it", () => {
    for (const p of PERIODS)
      for (const ev of scheduleFor(p))
        if (ev.shockAt !== undefined) expect(ev.warnAt).toBeLessThan(ev.shockAt);
  });
  it("Devonian schedules Kellwasser before Hangenberg, both before the deadline", () => {
    const dev = scheduleFor("devonian");
    const k = dev.find((e) => e.id === "kellwasser")!;
    const h = dev.find((e) => e.id === "hangenberg")!;
    expect(k.shockAt!).toBeLessThan(h.shockAt!);
    expect(h.shockAt!).toBeLessThan(NORMAL.eraBudgetSec.devonian);
  });
  it("ordinary boundaries (Cambrian, Silurian) carry no shocks", () => {
    expect(scheduleFor("cambrian")).toHaveLength(0);
    expect(scheduleFor("silurian")).toHaveLength(0);
  });
});
