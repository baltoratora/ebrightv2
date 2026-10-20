// Original arcade rail-shooter rules. Pure, seeded and fixed-step; no DOM/time APIs.
export const RP_STEP = 50;
export const RP_MAGAZINE = 6;
export const RP_RELOAD = 1000;
export const RP_TRAVEL = 2200;
export const RP_WAVES = 6;
export type PatrolDifficulty = "easy" | "normal" | "hard";
export type TargetKind = "raider" | "armoured" | "helper";
export type Aim = { x: number; y: number; aspect: number };
export type Target = { id: number; kind: TargetKind; baseX: number; x: number; y: number; radius: number; hp: number; born: number; deadline: number };
export type Effect = { id: number; x: number; y: number; kind: "hit" | "stop" | "miss" | "hurt" | "rescue" | "friendly"; born: number; until: number };
export type Patrol = {
  seed: number; difficulty: PatrolDifficulty; phase: "combat" | "travel" | "won" | "lost";
  time: number; phaseAt: number; wave: number; spawned: number; nextSpawn: number; nextId: number;
  targets: Target[]; effects: Effect[]; ammo: number; reloadUntil: number; shotAt: number;
  shield: number; score: number; shots: number; hits: number; stopped: number; headshots: number;
  helpers: number; friendlyHits: number; combo: number; bestCombo: number;
};
export const LOCATIONS = [
  { name: "Midnight docks", short: "DOCK 07", line: "Restore the route through the cargo yard.", colour: "#7de1dc" },
  { name: "Transit terminal", short: "CONCOURSE", line: "Protect the service bots crossing the terminal.", colour: "#f7c889" },
  { name: "Reactor approach", short: "NEXUS", line: "Clear the last approach. Bring the network back online.", colour: "#a8b8ff" },
] as const;
const LANES = [{ x: .18, y: .49 }, { x: .5, y: .37 }, { x: .82, y: .49 }, { x: .3, y: .73 }, { x: .7, y: .73 }, { x: .5, y: .58 }];
const ENCOUNTER_TARGETS = 10; // eight threats + two clearly marked helpers
function random(s: Patrol) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
function clone(s: Patrol): Patrol { return { ...s, targets: s.targets.map((t) => ({ ...t })), effects: s.effects.map((e) => ({ ...e })) }; }
export function newPatrol(seed: number, difficulty: PatrolDifficulty = "normal"): Patrol {
  return { seed: seed >>> 0, difficulty, phase: "combat", time: 0, phaseAt: 0, wave: 0, spawned: 0, nextSpawn: 750, nextId: 0,
    targets: [], effects: [], ammo: RP_MAGAZINE, reloadUntil: 0, shotAt: -1000, shield: 100, score: 0, shots: 0, hits: 0, stopped: 0, headshots: 0, helpers: 0, friendlyHits: 0, combo: 0, bestCombo: 0 };
}
function effect(s: Patrol, x: number, y: number, kind: Effect["kind"]) {
  s.effects.push({ id: s.nextId++, x, y, kind, born: s.time, until: s.time + (kind === "hurt" ? 450 : 360) });
}
/** Hit box scales with the smaller viewport dimension, matching the painter. */
export function targetRadii(t: Pick<Target, "radius">, aspect: number): { x: number; y: number } {
  const ratio = Math.max(.3, Math.min(4, aspect));
  const size = Math.min(ratio, 1) * t.radius;
  return { x: size / ratio, y: size * 1.5 };
}
export function targetAt(s: Patrol, aim: Aim): Target | undefined {
  if (![aim.x, aim.y, aim.aspect].every(Number.isFinite) || aim.x < 0 || aim.x > 1 || aim.y < 0 || aim.y > 1 || aim.aspect <= 0) return;
  // The largest target is the nearest; painter draws it last too.
  return [...s.targets].sort((a, b) => b.radius - a.radius || b.id - a.id).find((t) => {
    const radius = targetRadii(t, aim.aspect);
    return Math.abs(t.x - aim.x) <= radius.x && Math.abs(t.y - aim.y) <= radius.y;
  });
}
export function reloadPatrol(state: Patrol): Patrol {
  if (state.phase !== "combat" || state.reloadUntil > state.time || state.ammo === RP_MAGAZINE) return state;
  return { ...state, reloadUntil: state.time + RP_RELOAD };
}
export function shootPatrol(state: Patrol, aim: Aim): Patrol {
  if (state.phase !== "combat" || state.reloadUntil > state.time || state.time - state.shotAt < 140 ||
    ![aim.x, aim.y, aim.aspect].every(Number.isFinite) || aim.x < 0 || aim.x > 1 || aim.y < 0 || aim.y > 1 || aim.aspect <= 0) return state;
  if (state.ammo === 0) return reloadPatrol(state);
  const s = clone(state); s.ammo--; s.shots++; s.shotAt = s.time;
  const target = targetAt(s, aim);
  if (!target) { s.combo = 0; effect(s, aim.x, aim.y, "miss"); return s; }
  if (target.kind === "helper") {
    s.friendlyHits++; s.combo = 0; s.shield = Math.max(0, s.shield - 20); s.score = Math.max(0, s.score - 100);
    s.targets = s.targets.filter((t) => t.id !== target.id); effect(s, target.x, target.y, "friendly");
    if (s.shield === 0) s.phase = "lost";
    return s;
  }
  const radii = targetRadii(target, aim.aspect);
  const headshot = aim.y < target.y - radii.y * .23;
  s.hits++; target.hp -= headshot ? 2 : 1;
  if (headshot) s.headshots++;
  if (target.hp <= 0) {
    s.stopped++; s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.score += 100 + Math.min(5, s.combo - 1) * 20 + (headshot ? 50 : 0);
    s.targets = s.targets.filter((t) => t.id !== target.id); effect(s, target.x, target.y, "stop");
  } else { s.score += 20; effect(s, target.x, target.y, "hit"); }
  return s;
}
function spawn(s: Patrol) {
  const lanes = LANES.filter((p) => !s.targets.some((t) => Math.abs(t.baseX - p.x) < .12 && Math.abs(t.y - p.y) < .18));
  if (!lanes.length) { s.nextSpawn = s.time + 200; return; }
  const lane = lanes[Math.floor(random(s) * lanes.length)];
  const kind: TargetKind = s.spawned === 3 || s.spawned === 7 ? "helper" : s.wave >= 1 && s.spawned % 3 === 1 ? "armoured" : "raider";
  const delay = s.difficulty === "easy" ? 3600 : s.difficulty === "hard" ? 2000 : 2800;
  s.targets.push({ id: s.nextId++, kind, baseX: lane.x, x: lane.x, y: lane.y, radius: lane.y > .6 ? .085 : .072,
    hp: kind === "armoured" ? 2 : 1, born: s.time, deadline: s.time + (kind === "helper" ? 3000 : delay + Math.floor(random(s) * 600)) });
  s.spawned++; s.nextSpawn = s.time + 950;
}
export function stepPatrol(state: Patrol): Patrol {
  if (state.phase === "won" || state.phase === "lost") return state;
  const s = clone(state); s.time += RP_STEP;
  s.effects = s.effects.filter((e) => e.until > s.time);
  if (s.reloadUntil && s.time >= s.reloadUntil) { s.ammo = RP_MAGAZINE; s.reloadUntil = 0; }
  if (s.phase === "travel") {
    if (s.time - s.phaseAt >= RP_TRAVEL) {
      s.wave++; s.phase = "combat"; s.phaseAt = s.time; s.spawned = 0; s.nextSpawn = s.time + 650;
      s.ammo = RP_MAGAZINE; s.reloadUntil = 0; // travel supplies a fresh magazine
    }
    return s;
  }
  for (const t of s.targets) t.x = t.baseX + Math.sin((s.time - t.born) / 650 + t.id) * .012;
  for (const target of s.targets.filter((t) => t.deadline <= s.time)) {
    if (target.kind === "helper") { s.helpers++; s.score += 75; s.shield = Math.min(100, s.shield + 8); effect(s, target.x, target.y, "rescue"); }
    else { s.shield = Math.max(0, s.shield - (s.difficulty === "easy" ? 10 : 14)); s.combo = 0; effect(s, target.x, target.y, "hurt"); }
    // Apply deadline outcomes in order; a helper cannot revive a defeated player.
    if (s.shield === 0) { s.phase = "lost"; return s; }
  }
  s.targets = s.targets.filter((t) => t.deadline > s.time);
  if (s.spawned < ENCOUNTER_TARGETS && s.time >= s.nextSpawn) spawn(s);
  if (s.spawned === ENCOUNTER_TARGETS && s.targets.length === 0) {
    if (s.wave === RP_WAVES - 1) { s.phase = "won"; s.score += s.shield * 10; }
    else { s.phase = "travel"; s.phaseAt = s.time; }
  }
  return s;
}
export function accuracy(s: Pick<Patrol, "hits" | "shots">): number { return s.shots ? Math.round(s.hits / s.shots * 100) : 0; }
