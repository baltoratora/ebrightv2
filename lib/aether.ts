export type Look = {
  skin: string;
  hair: string;
  color: string;
  trim: string;
  style: "plate" | "robe" | "ranger";
  hairstyle: "short" | "long" | "crest";
  weapon: "sword" | "staff" | "blades";
  wings: boolean;
};
export const DEFAULT_LOOK: Look = {
  skin: "#cf9874",
  hair: "#252238",
  color: "#354b70",
  trim: "#61e5e8",
  style: "plate",
  hairstyle: "long",
  weapon: "sword",
  wings: false,
};
export type HeroClass = "Vanguard" | "Arcanist" | "Duelist";
export type Save = {
  version: 1;
  name: string;
  role: HeroClass;
  xp: number;
  gold: number;
  shards: number;
  kills: number;
  bosses: number;
  tier: number;
  gear: number[];
  nodes: number[];
  medals: number[];
  soul: number;
  wing: number;
  look: Look;
};
export const fresh = (): Save => ({
  version: 1,
  name: "Wanderer",
  role: "Vanguard",
  xp: 0,
  gold: 0,
  shards: 0,
  kills: 0,
  bosses: 0,
  tier: 1,
  gear: [0, 0, 0],
  nodes: Array(9).fill(0),
  medals: [0, 0, 0],
  soul: 0,
  wing: 0,
  look: { ...DEFAULT_LOOK },
});
export const level = (s: Save) =>
  Math.min(50, 1 + Math.floor(Math.sqrt(s.xp / 80)));
export const NODES = [
  { name: "Edge", desc: "+4 attack per rank", parent: -1 },
  { name: "Precision", desc: "+3% critical chance per rank", parent: 0 },
  { name: "Rift storm", desc: "+15% Nova damage per rank", parent: 1 },
  { name: "Resolve", desc: "+25 health per rank", parent: -1 },
  { name: "Bulwark", desc: "+3 defence per rank", parent: 3 },
  { name: "Second wind", desc: "+10% potion healing per rank", parent: 4 },
  { name: "Flow", desc: "+10 mana per rank", parent: -1 },
  { name: "Channel", desc: "+1 mana regeneration per rank", parent: 6 },
  { name: "Echo", desc: "+10% Pulse damage per rank", parent: 7 },
];
export const points = (s: Save) =>
  level(s) * 2 - s.nodes.reduce((a, b) => a + b, 0);
export function stats(s: Save) {
  const l = level(s);
  return {
    attack:
      18 +
      l * 3 +
      s.gear[0] * 6 +
      s.nodes[0] * 4 +
      s.medals[0] * 3 +
      (s.soul === 1 ? 8 : 0) +
      s.wing * 2,
    hp:
      120 +
      l * 12 +
      s.gear[1] * 20 +
      s.nodes[3] * 25 +
      s.medals[1] * 15 +
      (s.role === "Vanguard" ? 40 : 0),
    mana: 70 + s.nodes[6] * 10 + (s.role === "Arcanist" ? 30 : 0),
    defence: 3 + s.gear[1] * 3 + s.nodes[4] * 3 + s.medals[2] * 2,
    crit: Math.min(
      0.6,
      0.08 +
        s.nodes[1] * 0.03 +
        s.gear[2] * 0.02 +
        (s.role === "Duelist" ? 0.1 : 0),
    ),
    regen: 5 + s.nodes[7] + (s.soul === 2 ? 3 : 0),
  };
}
export type Upgrade = "gear" | "node" | "medal" | "wing";
export function cost(s: Save, type: Upgrade, i: number) {
  const rank =
    type === "wing"
      ? s.wing
      : type === "gear"
        ? s.gear[i]
        : type === "node"
          ? s.nodes[i]
          : s.medals[i];
  return {
    gold: type === "node" ? 0 : 30 * (rank + 1) * (type === "wing" ? 3 : 1),
    shards: type === "gear" || type === "wing" ? rank + 1 : 0,
  };
}
export function upgrade(s: Save, type: Upgrade, i = 0): Save {
  if (
    !Number.isInteger(i) ||
    i < 0 ||
    i >= (type === "node" ? 9 : type === "wing" ? 1 : 3)
  )
    return s;
  const rank =
    type === "wing"
      ? s.wing
      : type === "gear"
        ? s.gear[i]
        : type === "node"
          ? s.nodes[i]
          : s.medals[i];
  if (rank >= (type === "gear" ? 10 : 5)) return s;
  const c = cost(s, type, i);
  if (s.gold < c.gold || s.shards < c.shards) return s;
  if (
    type === "node" &&
    (points(s) < 1 || (NODES[i].parent >= 0 && s.nodes[NODES[i].parent] < 2))
  )
    return s;
  if (
    type === "medal" &&
    [s.kills, s.bosses, level(s)][i] <
      [10 * (rank + 1), rank + 1, 3 * (rank + 1)][i]
  )
    return s;
  if (type === "wing" && s.bosses < 1) return s;
  const n = { ...s, gold: s.gold - c.gold, shards: s.shards - c.shards };
  if (type === "wing") n.wing++;
  else {
    const key =
      type === "node" ? "nodes" : type === "medal" ? "medals" : "gear";
    n[key] = [...s[key]];
    n[key][i]++;
  }
  return n;
}
export function reward(s: Save, boss: boolean, tier: number): Save {
  return {
    ...s,
    xp: s.xp + (boss ? 150 : 25) * tier,
    gold: s.gold + (boss ? 90 : 12) * tier,
    shards: s.shards + (boss ? 5 : 1),
    kills: s.kills + 1,
    bosses: s.bosses + (boss ? 1 : 0),
    tier: Math.max(s.tier, boss ? Math.min(20, tier + 1) : tier),
  };
}
export function parseLook(v: unknown): Look {
  const a = (v && typeof v === "object" ? v : {}) as Partial<Look>;
  const hex = (x: unknown, d: string) =>
    typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x) ? x : d;
  return {
    skin: hex(a.skin, DEFAULT_LOOK.skin),
    hair: hex(a.hair, DEFAULT_LOOK.hair),
    color: hex(a.color, DEFAULT_LOOK.color),
    trim: hex(a.trim, DEFAULT_LOOK.trim),
    style: ["plate", "robe", "ranger"].includes(a.style ?? "")
      ? a.style!
      : DEFAULT_LOOK.style,
    hairstyle: ["short", "long", "crest"].includes(a.hairstyle ?? "")
      ? a.hairstyle!
      : DEFAULT_LOOK.hairstyle,
    weapon: ["sword", "staff", "blades"].includes(a.weapon ?? "")
      ? a.weapon!
      : DEFAULT_LOOK.weapon,
    wings: a.wings === true,
  };
}
export function readSave(raw: string | null): Save {
  try {
    const v = JSON.parse(raw ?? "null");
    if (!v || v.version !== 1) return fresh();
    const s = fresh();
    for (const k of [
      "xp",
      "gold",
      "shards",
      "kills",
      "bosses",
      "tier",
      "soul",
      "wing",
    ] as const)
      if (Number.isSafeInteger(v[k]) && v[k] >= 0)
        s[k] = Math.min(
          v[k],
          k === "soul" ? 2 : k === "wing" ? 5 : k === "tier" ? 20 : 1e8,
        );
    s.tier = Math.max(1, s.tier);
    for (const k of ["gear", "nodes", "medals"] as const)
      if (Array.isArray(v[k]) && v[k].length === s[k].length)
        s[k] = v[k].map((n: unknown) =>
          Number.isInteger(n) && Number(n) >= 0
            ? Math.min(Number(n), k === "gear" ? 10 : 5)
            : 0,
        );
    if (points(s) < 0) s.nodes = Array(9).fill(0);
    for (let i = 0; i < 9; i++)
      if (NODES[i].parent >= 0 && s.nodes[NODES[i].parent] < 2) s.nodes[i] = 0;
    if (level(s) < s.soul * 3) s.soul = 0;
    s.name = typeof v.name === "string" ? v.name.slice(0, 24) : s.name;
    s.role = ["Vanguard", "Arcanist", "Duelist"].includes(v.role)
      ? v.role
      : s.role;
    s.look = parseLook(v.look);
    return s;
  } catch {
    return fresh();
  }
}
export const SAVE_KEY = "ebright.aether.v1";
