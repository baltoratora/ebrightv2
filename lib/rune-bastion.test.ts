import { describe, it, expect } from "vitest";
import {
  Battle,
  SKILLS,
  buildStats,
  buySkill,
  cast,
  freshProgress,
  newBattle,
  readProgress,
  refundSkills,
  settleBattle,
  stepBattle,
  unlockedStage,
} from "./rune-bastion";
function play(b: Battle) {
  for (let i = 0; i < 12000 && b.status === "playing"; i++) {
    if (b.enemies.some((e) => Math.hypot(e.x, e.y) < b.stats.radius))
      cast(b, 0);
    stepBattle(b, 0.1);
  }
  return b;
}
describe("Rune Bastion", () => {
  it("starts at stage 1 and locks unearned stages", () => {
    expect(unlockedStage(freshProgress())).toBe(1);
    expect(() => newBattle(freshProgress(), 2)).toThrow();
    expect(() => newBattle(freshProgress(), NaN)).toThrow();
  });
  it("charges exact prices, enforces prerequisites and preserves the source", () => {
    let p = { ...freshProgress(), essence: 1000 };
    expect(buySkill(p, 1)).toBe(p);
    const old = p;
    p = buySkill(buySkill(p, 0), 0);
    expect(old.ranks[0]).toBe(0);
    expect(p.essence).toBe(976);
    expect(buySkill(p, 1).ranks[1]).toBe(1);
    expect(buySkill(p, 99)).toBe(p);
  });
  it("refunds all invested Essence without changing stage progression", () => {
    const p = { ...freshProgress(), essence: 1000, cleared: [1] };
    const upgraded = buySkill(buySkill(p, 0), 3);
    expect(refundSkills(upgraded)).toEqual(p);
  });
  it("makes a fresh stage 1 winnable with Nova timing", () => {
    const b = play(newBattle(freshProgress(), 1));
    expect(b.status).toBe("won");
    expect(b.wave).toBe(3);
    expect(b.kills).toBeGreaterThan(0);
    expect(b.hp).toBeGreaterThan(0);
  });
  it("awards first clears once and replay rewards thereafter", () => {
    const b = play(newBattle(freshProgress(), 1));
    const first = settleBattle(freshProgress(), b);
    expect(first.bonus).toBe(25);
    expect(unlockedStage(first.progress)).toBe(2);
    const replay = settleBattle(first.progress, b);
    expect(replay.bonus).toBe(7);
    expect(replay.progress.cleared).toEqual([1]);
  });
  it("retains earned Essence on failure or retreat without unlocking stages", () => {
    for (const status of ["lost", "retreated"] as const) {
      const b = {
        ...newBattle(freshProgress(), 1),
        status,
        earned: 4,
        kills: 4,
      };
      const result = settleBattle(freshProgress(), b);
      expect(result.progress.essence).toBe(4);
      expect(result.progress.cleared).toEqual([]);
      expect(result.bonus).toBe(0);
    }
  });
  it("does not settle a playing battle", () => {
    const p = freshProgress();
    expect(settleBattle(p, newBattle(p, 1)).progress).toBe(p);
  });
  it("unlocks spells through their tree nodes and enforces cooldowns", () => {
    const b = newBattle(freshProgress(), 1);
    expect(cast(b, 1)).toBe(false);
    expect(cast(b, 2)).toBe(false);
    expect(cast(b, 0)).toBe(true);
    expect(cast(b, 0)).toBe(false);
    expect(cast(b, -1)).toBe(false);
    const p = { ...freshProgress(), ranks: SKILLS.map((s) => s.max) };
    const strong = newBattle(p, 1);
    strong.hp = 20;
    expect(cast(strong, 2)).toBe(true);
    expect(strong.hp).toBeGreaterThan(20);
    expect(cast(strong, 1)).toBe(true);
    expect(strong.slow).toBeGreaterThan(0);
  });
  it("keeps simulation deterministic and caps oversized frame deltas", () => {
    const a = newBattle(freshProgress(), 1),
      b = newBattle(freshProgress(), 1);
    for (let i = 0; i < 100; i++) {
      stepBattle(a, 0.1);
      stepBattle(b, 0.1);
    }
    expect(a).toEqual(b);
    const c = newBattle(freshProgress(), 1);
    stepBattle(c, 100);
    expect(c.time).toBe(0.1);
  });
  it("validates saves and migrates invalid or non-contiguous stages", () => {
    expect(readProgress("{")).toEqual(freshProgress());
    const p = readProgress(
      JSON.stringify({
        version: 1,
        essence: -1,
        cleared: [1, 3, 30],
        ranks: [0, 10, 6, 0, 8, 6, 0, 8, 6],
      }),
    );
    expect(p.cleared).toEqual([1]);
    expect(p.ranks).toEqual(Array(9).fill(0));
    expect(p.essence).toBe(0);
  });
  it("round trips upgrades and caps node ranks", () => {
    const p = {
      ...freshProgress(),
      essence: 1000,
      ranks: SKILLS.map((s) => s.max),
      cleared: [1, 2],
    };
    expect(readProgress(JSON.stringify(p))).toEqual(p);
    expect(buySkill(p, 0)).toBe(p);
    expect(buildStats(p).targets).toBe(4);
  });
  it("stops changing the battle after a terminal state", () => {
    const b = newBattle(freshProgress(), 1);
    b.status = "lost";
    const snapshot = structuredClone(b);
    stepBattle(b, 0.1);
    expect(b).toEqual(snapshot);
    expect(cast(b, 0)).toBe(false);
  });
});
