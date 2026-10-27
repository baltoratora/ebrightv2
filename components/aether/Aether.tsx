"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  DEFAULT_LOOK,
  Look,
  Save,
  fresh,
  readSave,
  SAVE_KEY,
  stats,
  level,
  points,
  NODES,
  upgrade,
  cost,
  reward,
  parseLook,
  HeroClass,
} from "@/lib/aether";
import type { WorldHUD } from "./World";
const World = dynamic(() => import("./World"), {
  ssr: false,
  loading: () => (
    <div className="ae-world ae-loading">Summoning your world…</div>
  ),
});
const EMPTY: WorldHUD = {
  hp: 0,
  mana: 0,
  enemy: "",
  enemyHP: 0,
  enemyMax: 1,
  combo: 0,
  cool: [],
  message: "",
};
const TABS = [
  "Character",
  "Equipment",
  "Skill tree",
  "Honor medals",
  "Soul abilities",
  "Wings",
];
function LookControls({
  look,
  setLook,
}: {
  look: Look;
  setLook: (l: Look) => void;
}) {
  return (
    <div className="ae-controls">
      <label>
        Gender
        <select
          value={look.gender}
          onChange={(e) =>
            setLook({ ...look, gender: e.target.value as Look["gender"] })
          }
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </label>
      {(["style", "hairstyle", "weapon"] as const).map((k) => (
        <label key={k}>
          {k === "style"
            ? "Outfit"
            : k === "hairstyle"
              ? "Hair style"
              : "Weapon"}
          <select
            value={look[k]}
            onChange={(e) => setLook({ ...look, [k]: e.target.value })}
          >
            {(k === "style"
              ? ["plate", "robe", "ranger"]
              : k === "hairstyle"
                ? ["short", "long", "crest"]
                : ["sword", "staff", "blades"]
            ).map((v) => (
              <option key={v} value={v}>
                {v === "crest"
                  ? "Swept + headband"
                  : v === "short"
                    ? "Soft bob"
                    : v === "long"
                      ? "Long layers"
                      : v}
              </option>
            ))}
          </select>
        </label>
      ))}
      {(["skin", "hair", "color", "trim"] as const).map((k) => (
        <label key={k}>
          {
            {
              skin: "Skin tone",
              hair: "Hair colour",
              color: "Outfit colour",
              trim: "Glow colour",
            }[k]
          }
          <input
            type="color"
            value={look[k]}
            onChange={(e) => setLook({ ...look, [k]: e.target.value })}
          />
        </label>
      ))}
      <label className="ae-check">
        <input
          type="checkbox"
          checked={look.wings}
          onChange={(e) => setLook({ ...look, wings: e.target.checked })}
        />{" "}
        Show crystal wings
      </label>
    </div>
  );
}
export default function Aether({ studio = false }: { studio?: boolean }) {
  const [save, setSave] = useState<Save>(fresh);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("");
  const [hud, setHUD] = useState(EMPTY);
  const [run, setRun] = useState(0);
  const [tier, setTier] = useState(1);
  const [activeTier, setActiveTier] = useState(1);
  const [training, setTraining] = useState(false);
  const [paused, setPaused] = useState(false);
  const [command, setCommand] = useState({ id: 0, action: 0 });
  const [look, setLook] = useState<Look>({ ...DEFAULT_LOOK });
  const [rotation, setRotation] = useState(0.3);
  const [presets, setPresets] = useState<Look[]>([]);
  const [challenge, setChallenge] = useState(0);
  useEffect(() => {
    try {
      const s = readSave(localStorage.getItem(SAVE_KEY));
      setSave(s);
      setTier(s.tier);
      setActiveTier(s.tier);
      const draft = localStorage.getItem("ebright.atelier.look");
      setLook(studio && draft ? parseLook(JSON.parse(draft)) : s.look);
      const p = JSON.parse(
        localStorage.getItem("ebright.atelier.presets") ?? "[]",
      );
      if (Array.isArray(p)) setPresets(p.slice(0, 6).map(parseLook));
    } catch {
      setNotice(
        "Storage is unavailable. You can play, but progress may not persist.",
      );
    }
    setReady(true);
  }, [studio]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      setNotice("Could not save progression. Keep this tab open.");
    }
  }, [save, ready]);
  useEffect(() => {
    if (!ready || !studio) return;
    try {
      localStorage.setItem("ebright.atelier.look", JSON.stringify(look));
      localStorage.setItem("ebright.atelier.presets", JSON.stringify(presets));
    } catch {
      setNotice("Could not save your wardrobe.");
    }
  }, [look, presets, ready, studio]);
  const st = stats(save);
  const update = (type: Parameters<typeof upgrade>[1], i = 0) => {
    setSave((s) => {
      const next = upgrade(s, type, i);
      return next;
    });
  };
  const start = (isTraining: boolean) => {
    setActiveTier(tier);
    setTraining(isTraining);
    setPaused(false);
    setTab("");
    setRun((r) => r + 1);
    setHUD({ ...EMPTY, hp: st.hp, mana: st.mana });
  };
  const exportImage = () => {
    const canvas =
      document.querySelector<HTMLCanvasElement>(".ae-world canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "aether-outfit.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  if (!ready) return <div className="ae-loading">Opening your journal…</div>;
  const upgradeCard = (
    type: "gear" | "node" | "medal" | "wing",
    i: number,
    name: string,
    desc: string,
    rank: number,
  ) => {
    const c = cost(save, type, i);
    const available = upgrade(save, type, i) !== save;
    return (
      <article className="ae-card" key={name}>
        <div className="ae-rune">
          {type === "node"
            ? "✧"
            : type === "medal"
              ? "✹"
              : type === "wing"
                ? "⋈"
                : "◇"}
        </div>
        <h3>
          {name}{" "}
          <span>
            {rank}/{type === "gear" ? 10 : 5}
          </span>
        </h3>
        <p>{desc}</p>
        <small>
          {type === "node"
            ? "1 skill point"
            : `${c.gold} gold${c.shards ? " · " + c.shards + " shards" : ""}`}
        </small>
        <button disabled={!available} onClick={() => update(type, i)}>
          {rank >= (type === "gear" ? 10 : 5) ? "Mastered" : "Upgrade"}
        </button>
      </article>
    );
  };
  return (
    <div className={`ae ${studio ? "ae-studio" : ""}`}>
      <div className="ae-back">
        <Link href="/thinking">← All games</Link>
      </div>
      <header className="ae-header">
        <div>
          <p className="ae-eyebrow">
            {studio ? "THE CHARACTER COLLECTION" : "A SOLO EXPEDITION"}
          </p>
          <h1>{studio ? "Aether Atelier" : "Aether Rift"}</h1>
          <p>
            {studio
              ? "Dress your alter ego. Make every detail yours."
              : "Beyond the ruins, become something greater."}
          </p>
        </div>
        <Link href={studio ? "/aether-rift" : "/aether-atelier"}>
          {studio ? "Enter the Rift ↗" : "Visit the Atelier ↗"}
        </Link>
      </header>
      {notice && (
        <p role="status" className="ae-notice">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </p>
      )}
      {studio ? (
        <div className="ae-studio-layout">
          <section className="ae-portrait">
            <World studio look={look} save={save} rotation={rotation} />
            <div className="ae-caption">
              <span>01 / YOUR MUSE</span>
              <h2>
                {look.style === "plate"
                  ? "The Crystal Sentinel"
                  : look.style === "robe"
                    ? "The Astral Weaver"
                    : "The Wild Wanderer"}
              </h2>
            </div>
            <label className="ae-rotation">
              Rotate character
              <input
                type="range"
                min="-3.14"
                max="3.14"
                step=".01"
                value={rotation}
                onChange={(e) => setRotation(+e.target.value)}
              />
            </label>
          </section>
          <aside className="ae-panel">
            <p className="ae-eyebrow">WARDROBE</p>
            <h2>Make it yours</h2>
            <div className="ae-style-picks" aria-label="Fantasy outfit presets">
              {[
                {
                  name: "Moonlit mage",
                  style: "robe",
                  hairstyle: "long",
                  weapon: "staff",
                  color: "#46557f",
                  hair: "#9daed4",
                  trim: "#b4e5ef",
                },
                {
                  name: "Rose knight",
                  style: "plate",
                  hairstyle: "crest",
                  weapon: "sword",
                  color: "#845264",
                  hair: "#e4c3aa",
                  trim: "#eed6a0",
                },
                {
                  name: "Forest traveller",
                  style: "ranger",
                  hairstyle: "short",
                  weapon: "blades",
                  color: "#547268",
                  hair: "#bca894",
                  trim: "#bdd8b3",
                },
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() =>
                    setLook({
                      ...look,
                      ...p,
                      skin: "#f2d1bc",
                      wings: false,
                    } as Look)
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
            <LookControls look={look} setLook={setLook} />
            <div className="ae-actions">
              <button
                onClick={() => {
                  setPresets((p) => [...p, look].slice(-6));
                  setNotice("Look saved in your collection.");
                }}
              >
                Save look
              </button>
              <button
                onClick={() => {
                  setSave((s) => ({ ...s, look }));
                  setNotice(
                    "Outfit equipped for your next RPG visit. Cosmetic only; combat stats are unchanged.",
                  );
                }}
              >
                Wear in RPG
              </button>
              <button onClick={exportImage}>Download portrait</button>
              <button onClick={() => setLook({ ...DEFAULT_LOOK })}>
                Reset look
              </button>
            </div>
            <h3>Your collection · {presets.length}/6</h3>
            <div className="ae-presets">
              {presets.map((p, i) => (
                <div key={i}>
                  <button
                    style={{ borderColor: p.trim }}
                    onClick={() => setLook(p)}
                  >
                    Look {i + 1} · {p.style}
                  </button>
                  <button
                    aria-label={`Delete look ${i + 1}`}
                    onClick={() =>
                      setPresets((ps) => ps.filter((_, j) => i !== j))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <article className="ae-challenge">
              <small>STYLE CHALLENGE {(challenge % 3) + 1}/3</small>
              <h3>
                {
                  ["Crystal knight", "Forest scout", "Celestial mage"][
                    challenge % 3
                  ]
                }
              </h3>
              <p>
                {
                  [
                    "Plate armour, sword, and wings.",
                    "Ranger outfit, short hair, and dual blades.",
                    "A robe, staff, and long hair.",
                  ][challenge % 3]
                }
              </p>
              <button
                onClick={() => {
                  const success =
                    challenge % 3 === 0
                      ? look.style === "plate" &&
                        look.weapon === "sword" &&
                        look.wings
                      : challenge % 3 === 1
                        ? look.style === "ranger" &&
                          look.hairstyle === "short" &&
                          look.weapon === "blades"
                        : look.style === "robe" &&
                          look.weapon === "staff" &&
                          look.hairstyle === "long";
                  setNotice(
                    success
                      ? "Brief complete! Try the next look."
                      : "Almost there — match all three details in the brief.",
                  );
                  if (success) setChallenge((c) => c + 1);
                }}
              >
                Submit look
              </button>
            </article>
          </aside>
        </div>
      ) : (
        <>
          <div className="ae-toolbar">
            <span>
              <b>{save.name}</b> · {save.role} · Lv. {level(save)}
            </span>
            <span>
              ◈ {save.gold} gold · ✧ {save.shards} shards · {points(save)} skill
              points
            </span>
            <label>
              Rift tier{" "}
              <select value={tier} onChange={(e) => setTier(+e.target.value)}>
                {Array.from({ length: save.tier }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => start(false)}>Enter / restart rift</button>
            <button onClick={() => start(true)}>Training</button>
          </div>
          <div className="ae-arena">
            <World
              look={{ ...save.look, wings: save.look.wings || save.wing > 0 }}
              save={save}
              tier={activeTier}
              run={run}
              training={training}
              paused={paused || !!tab}
              command={command}
              onHUD={setHUD}
              onReward={(boss) => setSave((s) => reward(s, boss, activeTier))}
            />
            <div className="ae-vitals">
              <b>{save.name}</b>
              <label>
                HP{" "}
                {Math.ceil(
                  hud.hp || (run === 0 && hud.message === "" ? st.hp : 0),
                )}
                /{st.hp}
                <meter
                  min={0}
                  max={st.hp}
                  value={hud.message === "" ? st.hp : hud.hp}
                />
              </label>
              <label>
                MP {Math.ceil(hud.mana)}/{st.mana}
                <meter min={0} max={st.mana} value={hud.mana} />
              </label>
            </div>
            <div className="ae-enemy">
              {hud.enemy}
              <meter min={0} max={hud.enemyMax} value={hud.enemyHP} />
            </div>
            <button className="ae-pause" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume" : "Pause"}
            </button>
            <div className="ae-zone">
              {training ? "SANCTUARY / TRAINING" : "THE SUNKEN COURT"}
              <small>Rift tier {activeTier}</small>
            </div>
            {paused && !tab && <div className="ae-paused">Paused</div>}
            <div className="ae-combat-log" role="status">
              {hud.message}
            </div>
            <div className="ae-hotbar">
              {["⚔ Strike", "✦ Pulse", "◉ Nova", "✚ Heal", "➶ Dodge"].map(
                (n, i) => (
                  <button
                    key={n}
                    disabled={
                      !!tab ||
                      paused ||
                      hud.cool[i] > 0 ||
                      (hud.hp <= 0 && hud.message !== "")
                    }
                    onClick={() =>
                      setCommand((c) => ({ id: c.id + 1, action: i }))
                    }
                  >
                    <kbd>{i === 4 ? "SPACE" : i + 1}</kbd>
                    <b>{n}</b>
                    <small>
                      {hud.cool[i] > 0
                        ? `${hud.cool[i].toFixed(1)}s`
                        : [
                            "Free",
                            "18 mana",
                            "32 mana",
                            "12s recharge",
                            "2.5s recharge",
                          ][i]}
                    </small>
                  </button>
                ),
              )}
            </div>
          </div>
          <p className="ae-help">
            Click the ground to move · WASD / arrows after clicking the arena ·
            1–4 skills · Space dodge · Red rings warn of incoming attacks ·
            Menus pause combat
          </p>
          <nav className="ae-tabs" aria-label="Progression">
            {TABS.map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(tab === t ? "" : t)}
              >
                {t}
                {t === "Skill tree" && points(save) > 0
                  ? ` (${points(save)})`
                  : ""}
              </button>
            ))}
          </nav>
          {tab && (
            <section className="ae-progress">
              <div className="ae-section-title">
                <div>
                  <p className="ae-eyebrow">YOUR PROGRESSION / COMBAT PAUSED</p>
                  <h2>{tab}</h2>
                </div>
                <button onClick={() => setTab("")}>Return to combat ×</button>
              </div>
              {tab === "Character" && (
                <div className="ae-character">
                  <div>
                    <label>
                      Character name
                      <input
                        maxLength={24}
                        value={save.name}
                        onChange={(e) =>
                          setSave((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Gender
                      <select
                        value={save.look.gender}
                        onChange={(e) =>
                          setSave((s) => ({
                            ...s,
                            look: {
                              ...s.look,
                              gender: e.target.value as Look["gender"],
                            },
                          }))
                        }
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </label>
                    <label>
                      Class
                      <select
                        value={save.role}
                        onChange={(e) => {
                          setSave((s) => ({
                            ...s,
                            role: e.target.value as HeroClass,
                          }));
                        }}
                      >
                        {["Vanguard", "Arcanist", "Duelist"].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Vanguard: +40 HP · Arcanist: +30 mana · Duelist: +10%
                      critical chance.
                    </p>
                    <p>
                      XP {save.xp} · Next level{" "}
                      {level(save) < 50 ? 80 * level(save) ** 2 : "MAX"}
                    </p>
                    <p>
                      {save.kills} enemies defeated · {save.bosses} guardians
                      defeated
                    </p>
                  </div>
                  <dl>
                    {Object.entries(st).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{k === "crit" ? Math.round(v * 100) + "%" : v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {tab === "Equipment" && (
                <>
                  <p>
                    Guaranteed enhancements. Each rank improves combat stats; no
                    failed upgrades.
                  </p>
                  <div className="ae-cards">
                    {["Rift weapon", "Sentinel armour", "Astral charm"].map(
                      (n, i) =>
                        upgradeCard(
                          "gear",
                          i,
                          n,
                          [
                            "+6 attack per rank",
                            "+20 HP and +3 defence per rank",
                            "+2% critical chance per rank",
                          ][i],
                          save.gear[i],
                        ),
                    )}
                  </div>
                </>
              )}
              {tab === "Skill tree" && (
                <>
                  <p>
                    {points(save)} points available. Each deeper node requires
                    rank 2 in the node before it. Earn 2 points per character
                    level.
                  </p>
                  <div className="ae-tree">
                    {[0, 3, 6].map((start, i) => (
                      <div key={start}>
                        <h3>{["ASSAULT", "SURVIVAL", "ARCANA"][i]}</h3>
                        {NODES.slice(start, start + 3).map((n, j) => (
                          <div key={n.name}>
                            {j > 0 && (
                              <div className="ae-connector">
                                ↓ Requires {NODES[start + j - 1].name} 2
                              </div>
                            )}
                            {upgradeCard(
                              "node",
                              start + j,
                              n.name,
                              n.desc,
                              save.nodes[start + j],
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setSave((s) => ({ ...s, nodes: Array(9).fill(0) }))
                    }
                  >
                    Refund all skill points · free
                  </button>
                </>
              )}
              {tab === "Honor medals" && (
                <>
                  <p>
                    Permanent bonuses earned through solo play. Meet the
                    milestone, then invest gold to promote.
                  </p>
                  <div className="ae-cards">
                    {["Hunter", "Guardian slayer", "Pathfinder"].map((n, i) =>
                      upgradeCard(
                        "medal",
                        i,
                        n,
                        [
                          `+3 attack · Requires ${10 * (save.medals[i] + 1)} total kills (${save.kills})`,
                          `+15 HP · Requires ${save.medals[i] + 1} guardian kills (${save.bosses})`,
                          `+2 defence · Requires level ${3 * (save.medals[i] + 1)} (${level(save)})`,
                        ][i],
                        save.medals[i],
                      ),
                    )}
                  </div>
                </>
              )}
              {tab === "Soul abilities" && (
                <>
                  <p>One active soul slot. Switch freely to suit your build.</p>
                  <div className="ae-cards">
                    {[
                      "Unbound",
                      "Fury · +8 attack",
                      "Clarity · +3 mana regeneration",
                    ].map((n, i) => (
                      <article className="ae-card" key={n}>
                        <h3>{n}</h3>
                        <p>
                          {i === 0
                            ? "No passive equipped"
                            : `Unlocks at character level ${i * 3}`}
                        </p>
                        <button
                          disabled={level(save) < i * 3}
                          aria-pressed={save.soul === i}
                          onClick={() => setSave((s) => ({ ...s, soul: i }))}
                        >
                          {save.soul === i ? "Equipped" : "Equip"}
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {tab === "Wings" && (
                <>
                  <p>
                    Defeat your first guardian to awaken crystal wings. Each
                    rank adds +2 attack and appears on your character.
                  </p>
                  <div className="ae-cards">
                    {upgradeCard(
                      "wing",
                      0,
                      "Crystal ascension",
                      "Requires one guardian victory.",
                      save.wing,
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
      <footer className="ae-footer">
        {studio
          ? "A personal wardrobe. Every piece is available to experiment with."
          : "Single-player · Progress saves in this browser · Original fantasy prototype"}
      </footer>
    </div>
  );
}
