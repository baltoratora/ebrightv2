import { describe, expect, it } from "vitest";
import { accuracy, newPatrol, reloadPatrol, RP_MAGAZINE, RP_RELOAD, RP_STEP, RP_TRAVEL, shootPatrol, stepPatrol, targetAt, targetRadii, type Patrol, type Target } from "./rail-patrol";
function target(kind: Target["kind"] = "raider", extra: Partial<Target> = {}): Target { return { id: 1, kind, baseX: .5, x: .5, y: .5, radius: .075, hp: kind === "armoured" ? 2 : 1, born: 0, deadline: 3000, ...extra }; }
function arena(kind: Target["kind"] = "raider") { const s = newPatrol(123); s.targets = [target(kind)]; s.nextId = 2; return s; }
function steps(s: Patrol, n: number) { for (let i=0;i<n;i++) s = stepPatrol(s); return s; }
const aim = { x: .5, y: .5, aspect: 1.7 };

describe("Rail Patrol", () => {
  it("spawns seeded encounters and leaves previous state unchanged", () => {
    const original = newPatrol(91); const frozen = structuredClone(original);
    expect(steps(original, 100)).toEqual(steps(newPatrol(91), 100));
    expect(original).toEqual(frozen);
    expect(steps(newPatrol(92), 100)).not.toEqual(steps(original, 100));
  });
  it("uses the same proportional hit boxes at landscape and portrait aspects", () => {
    const s = arena();
    for (const aspect of [.7, 1, 1.8]) {
      const radii = targetRadii(s.targets[0], aspect);
      expect(targetAt(s, { x: .5 + radii.x * .9, y: .5, aspect })?.id).toBe(1);
      expect(targetAt(s, { x: .5 + radii.x * 1.1, y: .5, aspect })).toBeUndefined();
    }
    expect(targetAt(s, { ...aim, x: NaN })).toBeUndefined();
  });
  it("selects the visible foreground target when hit boxes overlap", () => {
    const s = arena(); s.targets.push(target("helper", { id: 2, radius: .09 }));
    expect(targetAt(s, aim)?.id).toBe(2);
  });
  it("consumes ammo on misses, not during cooldown or reload", () => {
    const s = arena(); const shot = shootPatrol(s, { ...aim, x: .1 });
    expect(shot.ammo).toBe(5); expect(shot.shots).toBe(1); expect(shot.hits).toBe(0);
    expect(shootPatrol(shot, aim)).toBe(shot);
    const loading = reloadPatrol(shot); expect(shootPatrol(loading, aim)).toBe(loading);
    expect(s.ammo).toBe(6);
  });
  it("rejects invalid coordinates without consuming a cell", () => {
    const s = arena();
    for (const bad of [{ ...aim, x: -1 }, { ...aim, y: 2 }, { ...aim, aspect: 0 }, { ...aim, x: Infinity }]) expect(shootPatrol(s, bad)).toBe(s);
  });
  it("refills once the reload finishes and never overfills", () => {
    const s = arena(); s.ammo = 0;
    const reloading = shootPatrol(s, aim); expect(reloading.reloadUntil).toBe(RP_RELOAD); expect(reloading.shots).toBe(0);
    const loaded = steps(reloading, RP_RELOAD / RP_STEP);
    expect(loaded.ammo).toBe(RP_MAGAZINE); expect(loaded.reloadUntil).toBe(0); expect(reloadPatrol(loaded)).toBe(loaded);
  });
  it("requires two armour body hits but rewards a single visor hit", () => {
    const s = arena("armoured"); const first = shootPatrol(s, aim); expect(first.targets[0].hp).toBe(1); expect(first.stopped).toBe(0);
    const later = steps(first, 3); const stopped = shootPatrol(later, { ...aim, x: later.targets[0].x }); expect(stopped.stopped).toBe(1); expect(stopped.hits).toBe(2);
    const visor = shootPatrol(s, { ...aim, y: .44 }); expect(visor.stopped).toBe(1); expect(visor.headshots).toBe(1);
  });
  it("penalizes helper hits and rescues untouched helpers", () => {
    const s = arena("helper"); s.score = 50;
    const hit = shootPatrol(s, aim); expect(hit.shield).toBe(80); expect(hit.score).toBe(0); expect(hit.friendlyHits).toBe(1); expect(hit.hits).toBe(0);
    s.shield = 96; s.targets[0].deadline = RP_STEP;
    const rescued = stepPatrol(s); expect(rescued.shield).toBe(100); expect(rescued.helpers).toBe(1); expect(rescued.score).toBe(125);
  });
  it("telegraphs attacks, then applies damage at the deadline only", () => {
    const s = arena(); s.targets[0].deadline = RP_STEP * 2;
    const before = stepPatrol(s); expect(before.shield).toBe(100);
    const after = stepPatrol(before); expect(after.shield).toBe(86); expect(after.targets).toHaveLength(0);
  });
  it("never revives a defeated player with a simultaneous helper expiry", () => {
    const s = arena(); s.shield = 10; s.targets[0].deadline = RP_STEP; s.targets.push(target("helper", { id: 2, deadline: RP_STEP }));
    const lost = stepPatrol(s); expect(lost.phase).toBe("lost"); expect(lost.shield).toBe(0); expect(stepPatrol(lost)).toBe(lost);
  });
  it("resets combos on misses and counts accuracy from actual shots", () => {
    const s = arena(); s.combo = 3;
    const hit = shootPatrol(s, aim); expect(hit.combo).toBe(4); expect(hit.bestCombo).toBe(4); expect(accuracy(hit)).toBe(100);
    const missed = shootPatrol(steps(hit, 3), { ...aim, x: .1 }); expect(missed.combo).toBe(0); expect(accuracy(missed)).toBe(50); expect(accuracy(newPatrol(2))).toBe(0);
  });
  it("travels between encounters, grants a magazine, and locks firing in transit", () => {
    const s = newPatrol(1); s.spawned = 10; s.ammo = 0;
    const travel = stepPatrol(s); expect(travel.phase).toBe("travel"); expect(shootPatrol(travel, aim)).toBe(travel);
    const next = steps(travel, RP_TRAVEL / RP_STEP); expect(next.phase).toBe("combat"); expect(next.wave).toBe(1); expect(next.ammo).toBe(6);
  });
  it("can complete all six encounters with all 48 threats and 12 helpers", () => {
    let s = newPatrol(412, "easy"); let guard = 0;
    while (s.phase !== "won" && s.phase !== "lost" && guard++ < 4000) {
      if (s.phase === "combat") {
        const threat = s.targets.find((t) => t.kind !== "helper");
        if (threat) {
          if (s.ammo === 0) s = reloadPatrol(s);
          else s = shootPatrol(s, { x: threat.x, y: threat.y - .06, aspect: 1.6 });
        }
      }
      s = stepPatrol(s);
    }
    expect(s.phase).toBe("won"); expect(s.wave).toBe(5); expect(s.stopped).toBe(48); expect(s.helpers).toBe(12); expect(s.friendlyHits).toBe(0);
    expect(stepPatrol(s)).toBe(s);
  });
});
