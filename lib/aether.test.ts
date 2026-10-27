import { describe, it, expect } from "vitest";
import {
  fresh,
  upgrade,
  stats,
  points,
  reward,
  readSave,
  parseLook,
  DEFAULT_LOOK,
  level,
} from "./aether";
describe("Aether progression", () => {
  it("starts with usable skills but no free equipment", () => {
    const s = fresh();
    expect(points(s)).toBe(2);
    expect(upgrade(s, "gear", 0)).toBe(s);
    expect(stats(s).hp).toBeGreaterThan(100);
  });
  it("deducts exact enhancement costs and changes combat stats", () => {
    const s = { ...fresh(), gold: 100, shards: 5 };
    const n = upgrade(s, "gear", 0);
    expect(n.gold).toBe(70);
    expect(n.shards).toBe(4);
    expect(stats(n).attack - stats(s).attack).toBe(6);
    expect(s.gear[0]).toBe(0);
  });
  it("enforces tree dependencies and available points", () => {
    let s = fresh();
    expect(upgrade(s, "node", 1)).toBe(s);
    s = upgrade(upgrade(s, "node", 0), "node", 0);
    expect(points(s)).toBe(0);
    expect(upgrade(s, "node", 1)).toBe(s);
    s = { ...s, xp: 80 };
    expect(upgrade(s, "node", 1).nodes[1]).toBe(1);
  });
  it("requires solo milestones for medals and wings", () => {
    let s = { ...fresh(), gold: 1000, shards: 100 };
    expect(upgrade(s, "medal", 0)).toBe(s);
    expect(upgrade(s, "wing")).toBe(s);
    s = { ...s, kills: 10, bosses: 1 };
    expect(upgrade(s, "medal", 0).medals[0]).toBe(1);
    expect(upgrade(s, "wing").wing).toBe(1);
  });
  it("awards kills once per reward and unlocks the next tier only on bosses", () => {
    const s = reward(fresh(), false, 1);
    expect(s.tier).toBe(1);
    expect(s.kills).toBe(1);
    expect(s.shards).toBe(1);
    const b = reward(s, true, 1);
    expect(b.tier).toBe(2);
    expect(b.bosses).toBe(1);
    expect(b.xp).toBe(175);
  });
  it("caps enhancements and rejects invalid indices", () => {
    const s = { ...fresh(), gold: 10000, shards: 1000, gear: [10, 0, 0] };
    expect(upgrade(s, "gear", 0)).toBe(s);
    expect(upgrade(s, "node", 99)).toBe(s);
    expect(upgrade(s, "wing", -1)).toBe(s);
  });
  it("round trips progress and validates malformed saves", () => {
    const s = reward(fresh(), true, 1);
    expect(readSave(JSON.stringify(s))).toEqual(s);
    expect(readSave("{")).toEqual(fresh());
    const bad = readSave(
      JSON.stringify({
        ...fresh(),
        gold: -2,
        nodes: Array(9).fill(5),
        soul: 2,
        tier: 0,
      }),
    );
    expect(bad.gold).toBe(0);
    expect(bad.nodes).toEqual(Array(9).fill(0));
    expect(bad.soul).toBe(0);
    expect(bad.tier).toBe(1);
  });
  it("sanitizes wardrobe inputs", () => {
    expect(parseLook({ color: "url(evil)", style: "invalid" })).toEqual(
      DEFAULT_LOOK,
    );
    expect(parseLook({ ...DEFAULT_LOOK, wings: true }).wings).toBe(true);
  });
  it("keeps cosmetics independent from stats and level caps", () => {
    const s = fresh();
    expect(
      stats({ ...s, look: { ...s.look, wings: true, color: "#ffffff" } }),
    ).toEqual(stats(s));
    expect(level({ ...s, xp: 1e8 })).toBe(50);
  });
});
