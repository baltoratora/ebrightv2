export const SAVE_KEY = "ebright.rune-bastion.v1";
export const STAGES = 100;
export const CHAPTER_SIZE = 10;
export const CHAPTERS = [
  "The awakening",
  "Beyond the veil",
  "The hollow crown",
  "Astral frontier",
  "The iron eclipse",
  "Stormbound depths",
  "The broken heavens",
  "Cinder dominion",
  "The ancient siege",
  "Dawn eternal",
];
export const stageTitle = (stage: number) =>
  `${CHAPTERS[Math.floor((stage - 1) / CHAPTER_SIZE)]} · Trial ${((stage - 1) % CHAPTER_SIZE) + 1}`;
export const isMastery = (index: number) => index >= 9;
export const SKILLS = [
  {
    name: "Runic force",
    desc: "+3 bolt damage per rank",
    branch: "Assault",
    parent: -1,
    max: 10,
  },
  {
    name: "Quickening",
    desc: "8% faster automatic fire per rank",
    branch: "Assault",
    parent: 0,
    max: 10,
  },
  {
    name: "Forked lightning",
    desc: "Bolts hit 1 additional enemy per 2 ranks",
    branch: "Assault",
    parent: 1,
    max: 6,
  },
  {
    name: "Crystal heart",
    desc: "+20 maximum integrity per rank",
    branch: "Sanctuary",
    parent: -1,
    max: 10,
  },
  {
    name: "Stone skin",
    desc: "Reduce incoming damage by 1 per rank",
    branch: "Sanctuary",
    parent: 3,
    max: 8,
  },
  {
    name: "Restoration",
    desc: "Unlock Mend; +5% healing per rank",
    branch: "Sanctuary",
    parent: 4,
    max: 6,
  },
  {
    name: "Nova mastery",
    desc: "+12 Nova damage and +8 radius per rank",
    branch: "Arcana",
    parent: -1,
    max: 10,
  },
  {
    name: "Deep reserves",
    desc: "Reduce spell cooldowns by 4% per rank",
    branch: "Arcana",
    parent: 6,
    max: 8,
  },
  {
    name: "Winter oath",
    desc: "Unlock Frost; +0.5 seconds duration per rank",
    branch: "Arcana",
    parent: 7,
    max: 6,
  },
  {
    name: "Astral resonance",
    desc: "+12% bolt damage per rank; +1 target every 10 ranks",
    branch: "Assault",
    parent: 2,
    max: 20,
  },
  {
    name: "Living bastion",
    desc: "+25 integrity, +1 armour and +0.5 regeneration per second per rank",
    branch: "Sanctuary",
    parent: 5,
    max: 20,
  },
  {
    name: "Eclipse nova",
    desc: "+20% Nova damage and +4 radius per rank",
    branch: "Arcana",
    parent: 8,
    max: 20,
  },
] as const;
export type Progress = {
  version: 1;
  essence: number;
  cleared: number[];
  ranks: number[];
  kills: number;
  runs: number;
};
export const freshProgress = (): Progress => ({
  version: 1,
  essence: 0,
  cleared: [],
  ranks: Array(SKILLS.length).fill(0),
  kills: 0,
  runs: 0,
});
export const skillCost = (rank: number, index = 0) =>
  isMastery(index)
    ? 80 + rank * 20 + rank * rank * 8
    : 8 + rank * rank * 3 + rank * 5;
export function buySkill(p: Progress, index: number): Progress {
  const node = SKILLS[index];
  if (
    !node ||
    (isMastery(index) && !p.cleared.includes(30)) ||
    p.ranks[index] >= node.max ||
    p.essence < skillCost(p.ranks[index], index) ||
    (node.parent >= 0 && p.ranks[node.parent] < 2)
  )
    return p;
  const ranks = [...p.ranks];
  ranks[index]++;
  return { ...p, essence: p.essence - skillCost(p.ranks[index], index), ranks };
}
export function refundSkills(p: Progress): Progress {
  let total = 0;
  for (let i = 0; i < p.ranks.length; i++)
    for (let r = 0; r < p.ranks[i]; r++) total += skillCost(r, i);
  return {
    ...p,
    essence: p.essence + total,
    ranks: Array(SKILLS.length).fill(0),
  };
}
export const unlockedStage = (p: Progress) =>
  Math.min(STAGES, (p.cleared.length ? Math.max(...p.cleared) : 0) + 1);
export const buildStats = (p: Progress) => ({
  damage: Math.round((14 + p.ranks[0] * 3) * (1 + (p.ranks[9] ?? 0) * 0.12)),
  interval: 0.72 / (1 + p.ranks[1] * 0.08),
  targets: 1 + Math.floor(p.ranks[2] / 2) + Math.floor((p.ranks[9] ?? 0) / 10),
  hp: 100 + p.ranks[3] * 20 + (p.ranks[10] ?? 0) * 25,
  armor: p.ranks[4] + (p.ranks[10] ?? 0),
  regen: (p.ranks[10] ?? 0) * 0.5,
  nova: Math.round((34 + p.ranks[6] * 12) * (1 + (p.ranks[11] ?? 0) * 0.2)),
  radius: Math.min(330, 165 + p.ranks[6] * 8 + (p.ranks[11] ?? 0) * 4),
  cooldown: 1 - p.ranks[7] * 0.04,
  mend: p.ranks[5] > 0 ? 0.25 + p.ranks[5] * 0.05 : 0,
  frost: p.ranks[8] > 0 ? 3 + p.ranks[8] * 0.5 : 0,
});
export function readProgress(raw: string | null): Progress {
  try {
    const v = JSON.parse(raw ?? "null");
    if (v?.version !== 1) return freshProgress();
    const p = freshProgress();
    for (const k of ["essence", "kills", "runs"] as const)
      if (Number.isSafeInteger(v[k]) && v[k] >= 0) p[k] = Math.min(v[k], 1e9);
    if (Array.isArray(v.ranks) && [9, SKILLS.length].includes(v.ranks.length))
      p.ranks = Array.from({ length: SKILLS.length }, (_, i: number) => {
        const n = v.ranks[i];
        return Number.isInteger(n)
          ? Math.max(0, Math.min(Number(n), SKILLS[i].max))
          : 0;
      });
    for (let i = 0; i < SKILLS.length; i++)
      if (SKILLS[i].parent >= 0 && p.ranks[SKILLS[i].parent] < 2)
        p.ranks[i] = 0;
    if (Array.isArray(v.cleared)) {
      const valid = new Set(v.cleared);
      for (let i = 1; i <= STAGES && valid.has(i); i++) p.cleared.push(i);
    }
    return p;
  } catch {
    return freshProgress();
  }
}
export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  speed: number;
  damage: number;
  boss: boolean;
  trait: "normal" | "swift" | "armored" | "siege";
};
export type Effect = {
  x: number;
  y: number;
  x2: number;
  y2: number;
  life: number;
  kind: "bolt" | "nova" | "frost" | "mend" | "hit";
};
export type Battle = {
  stage: number;
  wave: number;
  spawned: number;
  spawnTimer: number;
  breakTime: number;
  hp: number;
  time: number;
  fire: number;
  cool: number[];
  enemies: Enemy[];
  effects: Effect[];
  kills: number;
  earned: number;
  status: "playing" | "won" | "lost" | "retreated";
  seed: number;
  nextID: number;
  focus: number | null;
  slow: number;
  stats: ReturnType<typeof buildStats>;
};
export function newBattle(p: Progress, stage: number): Battle {
  if (!Number.isInteger(stage) || stage < 1 || stage > unlockedStage(p))
    throw Error("Stage is locked");
  const stats = buildStats(p);
  return {
    stage,
    wave: 1,
    spawned: 0,
    spawnTimer: 1,
    breakTime: 0,
    hp: stats.hp,
    time: 0,
    fire: 0,
    cool: [0, 0, 0],
    enemies: [],
    effects: [],
    kills: 0,
    earned: 0,
    status: "playing",
    seed: stage * 1307,
    nextID: 0,
    focus: null,
    slow: 0,
    stats,
  };
}
function random(b: Battle) {
  b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0;
  return b.seed / 4294967296;
}
export const waveCount = (b: Battle) =>
  5 + Math.min(b.stage, 30) + 2 * (b.wave - 1);
function hurt(b: Battle, e: Enemy, damage: number) {
  if (e.hp <= 0) return;
  e.hp -= damage;
  if (e.hp <= 0) {
    b.kills++;
    b.earned += e.boss ? 5 : 1;
    b.effects.push({ x: e.x, y: e.y, x2: 0, y2: 0, kind: "hit", life: 0.4 });
  }
}
export function cast(b: Battle, spell: number): boolean {
  if (
    b.status !== "playing" ||
    spell < 0 ||
    spell > 2 ||
    !Number.isInteger(spell) ||
    b.cool[spell] > 0
  )
    return false;
  if ((spell === 1 && !b.stats.frost) || (spell === 2 && !b.stats.mend))
    return false;
  if (spell === 0) {
    for (const e of b.enemies)
      if (Math.hypot(e.x, e.y) <= b.stats.radius) hurt(b, e, b.stats.nova);
    b.cool[0] = 9 * b.stats.cooldown;
    b.effects.push({
      x: 0,
      y: 0,
      x2: b.stats.radius,
      y2: 0,
      kind: "nova",
      life: 0.6,
    });
  } else if (spell === 1) {
    b.slow = b.stats.frost;
    b.cool[1] = 16 * b.stats.cooldown;
    b.effects.push({ x: 0, y: 0, x2: 400, y2: 0, kind: "frost", life: 0.8 });
  } else {
    b.hp = Math.min(b.stats.hp, b.hp + b.stats.hp * b.stats.mend);
    b.cool[2] = 22 * b.stats.cooldown;
    b.effects.push({ x: 0, y: 0, x2: 60, y2: 0, kind: "mend", life: 0.8 });
  }
  return true;
}
/** Mutable transient simulation; progression is only updated by settleBattle at the UI boundary. */
export function stepBattle(b: Battle, delta: number) {
  if (b.status !== "playing") return;
  const dt = Math.max(0, Math.min(0.1, delta));
  b.time += dt;
  b.hp = Math.min(b.stats.hp, b.hp + b.stats.regen * dt);
  b.fire -= dt;
  b.slow = Math.max(0, b.slow - dt);
  b.cool = b.cool.map((n) => Math.max(0, n - dt));
  b.effects = b.effects.filter((f) => (f.life -= dt) > 0);
  if (b.breakTime > 0) {
    b.breakTime -= dt;
    return;
  }
  const count = waveCount(b);
  b.spawnTimer -= dt;
  if (b.spawned < count && b.spawnTimer <= 0) {
    const boss = b.wave === 3 && b.spawned === count - 1;
    const a = random(b) * Math.PI * 2;
    const trait =
      b.stage <= 30
        ? "normal"
        : (["swift", "armored", "siege"] as const)[
            Math.floor((b.stage - 31) / 10) % 3
          ];
    const hp =
      (15 + b.stage * 6 + b.wave * 3) *
      (boss ? (b.stage > 30 && b.stage % 10 === 0 ? 6 : 4) : 1) *
      (trait === "armored" ? 1.25 : 1);
    b.enemies.push({
      id: b.nextID++,
      x: Math.cos(a) * 350,
      y: Math.sin(a) * 260,
      hp,
      max: hp,
      speed:
        Math.min(40, 12 + b.stage * 0.65 + b.wave) *
        (boss ? 0.65 : 1) *
        (trait === "swift" ? 1.25 : 1),
      damage:
        (9 + Math.floor(b.stage / 2)) *
        (boss ? 3 : 1) *
        (trait === "siege" ? 1.25 : 1),
      boss,
      trait,
    });
    b.spawned++;
    b.spawnTimer = Math.max(0.55, 1.7 - b.stage * 0.025);
  }
  const alive = b.enemies.filter((e) => e.hp > 0);
  if (b.fire <= 0 && alive.length) {
    const sorted = alive.sort(
      (a, c) => Math.hypot(a.x, a.y) - Math.hypot(c.x, c.y),
    );
    const focused = sorted.find((e) => e.id === b.focus);
    if (focused) {
      sorted.splice(sorted.indexOf(focused), 1);
      sorted.unshift(focused);
    }
    for (const e of sorted.slice(0, b.stats.targets)) {
      hurt(b, e, b.stats.damage);
      b.effects.push({
        x: 0,
        y: 0,
        x2: e.x,
        y2: e.y,
        life: 0.15,
        kind: "bolt",
      });
    }
    b.fire = b.stats.interval;
  }
  for (const e of b.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x, e.y);
    if (d < 24) {
      b.hp = Math.max(0, b.hp - Math.max(1, e.damage - b.stats.armor));
      e.hp = 0;
      b.effects.push({ x: 0, y: 0, x2: 0, y2: 0, life: 0.25, kind: "hit" });
    } else {
      const s = e.speed * dt * (b.slow > 0 ? 0.3 : 1);
      e.x -= (e.x / d) * s;
      e.y -= (e.y / d) * s;
    }
  }
  b.enemies = b.enemies.filter((e) => e.hp > 0);
  if (b.hp <= 0) {
    b.status = "lost";
    return;
  }
  if (b.spawned >= count && !b.enemies.length) {
    if (b.wave === 3) b.status = "won";
    else {
      b.wave++;
      b.spawned = 0;
      b.spawnTimer = 1;
      b.breakTime = 3;
    }
  }
}
export function settleBattle(
  p: Progress,
  b: Battle,
): { progress: Progress; bonus: number } {
  if (b.status === "playing") return { progress: p, bonus: 0 };
  const first = b.status === "won" && !p.cleared.includes(b.stage);
  const bonus =
    b.status === "won" ? (first ? 15 + b.stage * 10 : 5 + b.stage * 2) : 0;
  return {
    progress: {
      ...p,
      essence: p.essence + b.earned + bonus,
      kills: p.kills + b.kills,
      runs: p.runs + 1,
      cleared: first
        ? [...p.cleared, b.stage].sort((a, c) => a - c)
        : p.cleared,
    },
    bonus,
  };
}
