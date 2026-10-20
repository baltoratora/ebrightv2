import { describe, it, expect } from "vitest";
import { migrate, type MigrateWorld } from "./spread";
import { NORMAL } from "./difficulty";

describe("migrate", () => {
  it("source budget = migrationRate * SIM_DT * P0 over an open edge", () => {
    const w: MigrateWorld = { P: { a: 100, b: 0 }, K: { a: 100, b: 100 }, edges: [{ from: "a", to: "b", gate: "open" }] };
    const d = migrate(w, NORMAL);
    const budget = NORMAL.migrationRate * NORMAL.SIM_DT * 100;
    expect(d.a).toBeCloseTo(-budget);
    expect(d.b).toBeCloseTo(budget);
  });
  it("soft edge throttles ACTUAL flow (0.2x), remainder stays in source", () => {
    const w: MigrateWorld = { P: { a: 100, b: 0 }, K: { a: 100, b: 100 }, edges: [{ from: "a", to: "b", gate: "soft" }] };
    const d = migrate(w, NORMAL);
    const open = NORMAL.migrationRate * NORMAL.SIM_DT * 100;
    expect(d.b).toBeCloseTo(open * 0.2);
  });
  it("combined inflow from MANY sources is capped at destination headroom", () => {
    const w: MigrateWorld = {
      P: { a: 100, b: 100, c: 5 },
      K: { a: 100, b: 100, c: 10 },
      edges: [{ from: "a", to: "c", gate: "open" }, { from: "b", to: "c", gate: "open" }],
    };
    const d = migrate(w, NORMAL);
    expect(d.c).toBeLessThanOrEqual(10 - 5 + 1e-9);
  });
  it("is order-independent and conserves population", () => {
    const w1: MigrateWorld = {
      P: { a: 50, b: 50, c: 0 },
      K: { a: 100, b: 100, c: 100 },
      edges: [{ from: "a", to: "c", gate: "open" }, { from: "b", to: "c", gate: "open" }],
    };
    const w2: MigrateWorld = { ...w1, edges: [...w1.edges].reverse() };
    const d1 = migrate(w1, NORMAL);
    const d2 = migrate(w2, NORMAL);
    expect(d1).toEqual(d2);
    const sum = (d: Record<string, number>) => Object.values(d).reduce((x, y) => x + y, 0);
    expect(Math.abs(sum(d1))).toBeLessThan(1e-9);
  });
  it("no source goes negative", () => {
    const w: MigrateWorld = { P: { a: 1, b: 0 }, K: { a: 100, b: 100 }, edges: [{ from: "a", to: "b", gate: "open" }] };
    const d = migrate(w, NORMAL);
    expect(1 + d.a).toBeGreaterThanOrEqual(0);
  });
});
