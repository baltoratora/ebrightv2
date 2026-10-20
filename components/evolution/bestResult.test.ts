import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadBest, recordResult } from "./bestResult";

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("bestResult", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memStore()));

  it("keeps the better per-mode result", () => {
    recordResult("survival", { status: "lost", cause: "extinction", finalPeriod: "ordovician", occupied: 1, missedTargets: 0, usedRecovery: false });
    const won = recordResult("survival", { status: "won", cause: "survived", finalPeriod: "devonian", occupied: 4, missedTargets: 0, usedRecovery: false });
    expect(won.improved).toBe(true);
    expect(loadBest().survival?.status).toBe("won");

    const worse = recordResult("survival", { status: "lost", cause: "extinction", finalPeriod: "cambrian", occupied: 1, missedTargets: 0, usedRecovery: false });
    expect(worse.improved).toBe(false);
    expect(loadBest().survival?.status).toBe("won");
  });

  it("tracks modes independently", () => {
    recordResult("dominate", { status: "won", cause: "dominated", finalPeriod: "devonian", occupied: 4, missedTargets: 0, usedRecovery: false });
    const b = loadBest();
    expect(b.dominate?.status).toBe("won");
    expect(b.survival).toBeUndefined();
  });

  it("is safe when storage throws (read + write)", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => {},
    });
    expect(loadBest()).toEqual({});
    expect(() => recordResult("dominate", { status: "won", cause: "dominated", finalPeriod: "devonian", occupied: 4, missedTargets: 0, usedRecovery: false })).not.toThrow();
  });
});
