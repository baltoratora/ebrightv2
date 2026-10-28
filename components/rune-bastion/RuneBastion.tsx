"use client";
import { useEffect, useRef, useState } from "react";
import {
  Battle,
  Progress,
  SAVE_KEY,
  SKILLS,
  STAGES,
  buildStats,
  buySkill,
  cast,
  freshProgress,
  newBattle,
  readProgress,
  refundSkills,
  settleBattle,
  skillCost,
  stepBattle,
  unlockedStage,
} from "@/lib/rune-bastion";
const STAGE_NAMES = [
  "The awakening",
  "Whispering stones",
  "The outer watch",
  "Dusk approaches",
  "First eclipse",
  "Forgotten steps",
  "The hollow garden",
  "Shattered wards",
  "A gathering storm",
  "The violet gate",
  "Ember of resolve",
  "The long watch",
  "Ruin and renewal",
  "Twilight siege",
  "The second seal",
  "Echoes below",
  "The fading stars",
  "Stone and shadow",
  "Nightfall",
  "The astral breach",
  "Beyond the veil",
  "The silent choir",
  "Frostbound oath",
  "The last lantern",
  "An ancient hunger",
  "The fractured sky",
  "Enduring light",
  "The hollow crown",
  "Before the dawn",
  "The final bastion",
];
export default function RuneBastion() {
  const [progress, setProgress] = useState<Progress>(freshProgress);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState(1);
  const [tab, setTab] = useState<"stages" | "tree">("stages");
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState("");
  const [hud, setHUD] = useState({
    hp: 100,
    max: 100,
    wave: 1,
    kills: 0,
    earned: 0,
    cool: [0, 0, 0],
    status: "playing",
    breakTime: 0,
  });
  const [result, setResult] = useState<{
    won: boolean;
    earned: number;
    bonus: number;
    retreated: boolean;
  } | null>(null);
  const board = useRef<HTMLCanvasElement>(null);
  const battle = useRef<Battle | null>(null);
  const pauseRef = useRef(false);
  pauseRef.current = paused;
  const settled = useRef(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  useEffect(() => {
    try {
      const p = readProgress(localStorage.getItem(SAVE_KEY));
      setProgress(p);
      setStage(unlockedStage(p));
    } catch {
      setNotice("Storage is unavailable; progress may not persist.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      setNotice("Could not save progress. Keep this tab open.");
    }
  }, [progress, ready]);
  const spell = (i: number) => {
    if (!pauseRef.current && battle.current) cast(battle.current, i);
  };
  const start = () => {
    battle.current = newBattle(progress, stage);
    settled.current = false;
    setResult(null);
    setPaused(false);
    setActive(true);
    setHUD({
      hp: battle.current.hp,
      max: battle.current.stats.hp,
      wave: 1,
      kills: 0,
      earned: 0,
      cool: [0, 0, 0],
      status: "playing",
      breakTime: 0,
    });
  };
  const finish = (b: Battle) => {
    if (settled.current) return;
    settled.current = true;
    setProgress((p) => {
      const outcome = settleBattle(p, b);
      return outcome.progress;
    });
    const first = !progressRef.current.cleared.includes(b.stage);
    const bonus =
      b.status === "won" ? (first ? 15 + b.stage * 10 : 5 + b.stage * 2) : 0;
    setResult({
      won: b.status === "won",
      earned: b.earned,
      bonus,
      retreated: b.status === "retreated",
    });
    setActive(false);
  };
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      last = performance.now(),
      ui = 0,
      w = 900,
      h = 600,
      scale = 1;
    const resize = () => {
      const r = el.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(devicePixelRatio, 2);
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w / 900, h / 600);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const key = (e: KeyboardEvent) => {
      if (e.target !== el) return;
      if (["1", "2", "3", " "].includes(e.key)) e.preventDefault();
      if (e.repeat) return;
      if (e.key === " ") setPaused((p) => !p);
      else if (/^[1-3]$/.test(e.key)) spell(+e.key - 1);
    };
    const pointer = (e: PointerEvent) => {
      el.focus();
      const b = battle.current;
      if (!b || pauseRef.current) return;
      const r = el.getBoundingClientRect(),
        x = (e.clientX - r.left - w / 2) / scale,
        y = (e.clientY - r.top - h / 2) / scale;
      const closest = [...b.enemies].sort(
        (a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y),
      )[0];
      b.focus =
        closest && Math.hypot(closest.x - x, closest.y - y) < 50
          ? closest.id
          : null;
    };
    window.addEventListener("keydown", key);
    el.addEventListener("pointerdown", pointer);
    const draw = (b: Battle | null) => {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#080b2244";
      ctx.fillRect(-450, -300, 900, 600);
      const time = b?.time ?? 0;
      ctx.strokeStyle = "#98d9e05c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 65, 38, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 79, 46, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + time * 0.05;
        ctx.fillStyle = "#b8a3ef";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 73, Math.sin(a) * 42, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.shadowColor = "#89e5f5";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(0, -43 + Math.sin(time * 2) * 3);
      ctx.lineTo(22, -12);
      ctx.lineTo(0, 25);
      ctx.lineTo(-22, -12);
      ctx.closePath();
      ctx.fillStyle = "#a1e5eb";
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(0, 25);
      ctx.lineTo(-22, -12);
      ctx.fillStyle = "#66a5d0";
      ctx.fill();
      ctx.strokeStyle = "#ddfbff";
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(22, -12);
      ctx.lineTo(0, 25);
      ctx.stroke();
      if (b) {
        for (const e of b.enemies) {
          const r = e.boss ? 20 : 11;
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.shadowColor = e.boss ? "#f49c94" : "#c7a8ff";
          ctx.shadowBlur = 12;
          ctx.fillStyle = e.boss
            ? "#e1a09d"
            : b.slow > 0
              ? "#a7e6f3"
              : "#a995d8";
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 + time;
            const x = Math.cos(a) * r,
              y = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#211e42";
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
          if (b.focus === e.id) {
            ctx.strokeStyle = "#fff1b3";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = "#201c35";
          ctx.fillRect(-16, -r - 10, 32, 3);
          ctx.fillStyle = "#dcb5ee";
          ctx.fillRect(-16, -r - 10, 32 * Math.max(0, e.hp / e.max), 3);
          ctx.restore();
        }
        for (const fx of b.effects) {
          ctx.globalAlpha = Math.min(1, fx.life * 3);
          ctx.strokeStyle =
            fx.kind === "frost"
              ? "#a1edff"
              : fx.kind === "mend"
                ? "#b3f2ba"
                : fx.kind === "hit"
                  ? "#f2b899"
                  : "#d1bdff";
          ctx.lineWidth = fx.kind === "bolt" ? 2 : 3;
          ctx.beginPath();
          if (fx.kind === "bolt") {
            ctx.moveTo(fx.x, fx.y);
            ctx.lineTo(fx.x2, fx.y2);
          } else
            ctx.arc(
              fx.x,
              fx.y,
              Math.max(4, fx.x2 * (1 - fx.life) + (fx.kind === "hit" ? 22 : 0)),
              0,
              Math.PI * 2,
            );
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    };
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const b = battle.current;
      if (b && b.status === "playing" && !pauseRef.current && !document.hidden)
        stepBattle(b, dt);
      draw(b);
      ui += dt;
      if (b && ui > 0.1) {
        ui = 0;
        setHUD({
          hp: b.hp,
          max: b.stats.hp,
          wave: b.wave,
          kills: b.kills,
          earned: b.earned,
          cool: [...b.cool],
          status: b.status,
          breakTime: b.breakTime,
        });
        if (b.status !== "playing" && !settled.current) finish(b);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", key);
      el.removeEventListener("pointerdown", pointer);
    };
    // The battle snapshot remains fixed for an attempt. Progress only changes when that attempt settles.
  }, [ready]);
  const stats = buildStats(progress);
  if (!ready) return <p>Opening the runic archive…</p>;
  return (
    <div className="rb">
      <header className="rb-header">
        <div>
          <p className="rb-eyebrow">THE OBSERVATORY CHRONICLES</p>
          <h2>Rune Bastion</h2>
          <p>One crystal. Thirty trials. A legacy that stays with you.</p>
        </div>
        <div className="rb-wallet">
          <b>✧ {progress.essence}</b>
          <span>Essence to invest</span>
          <small>
            {progress.cleared.length}/{STAGES} stages cleared · {progress.kills}{" "}
            foes defeated
          </small>
        </div>
      </header>
      {notice && (
        <p className="rb-notice" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </p>
      )}
      <div className="rb-layout">
        <section className="rb-battle-panel">
          <div
            className="rb-arena"
            style={{ backgroundImage: "url('/rune-bastion/observatory.webp')" }}
          >
            <canvas
              ref={board}
              tabIndex={0}
              aria-label="Rune Bastion battlefield. Click an enemy to focus attacks. Keys 1 Nova, 2 Frost, 3 Mend, Space pause."
            />
            <div className="rb-arena-top">
              <span>
                STAGE {stage.toString().padStart(2, "0")}
                <b>{STAGE_NAMES[stage - 1]}</b>
              </span>
              <span>WAVE {hud.wave}/3</span>
            </div>
            <div className="rb-integrity">
              <span>
                Crystal integrity{" "}
                <b>
                  {Math.ceil(active ? hud.hp : result ? hud.hp : stats.hp)}/
                  {active ? hud.max : result ? hud.max : stats.hp}
                </b>
              </span>
              <meter
                min={0}
                max={active || result ? hud.max : stats.hp}
                value={active || result ? hud.hp : stats.hp}
              />
            </div>
            {!active && !result && (
              <div className="rb-overlay">
                <span className="rb-sigil">◇</span>
                <h3>Guard the last light</h3>
                <p>
                  Your crystal fires automatically.
                  <br />
                  Focus dangerous foes and time your spells.
                </p>
                <button className="rb-primary" onClick={start}>
                  Begin Stage {stage}
                </button>
              </div>
            )}
            {active && paused && (
              <div className="rb-overlay">
                <h3>Time stands still</h3>
                <button onClick={() => setPaused(false)}>Resume defense</button>
              </div>
            )}
            {active && hud.breakTime > 0 && !paused && (
              <div className="rb-intermission">Wave {hud.wave} approaches…</div>
            )}
            {result && (
              <div className="rb-overlay">
                <span className="rb-sigil">{result.won ? "✧" : "◇"}</span>
                <h3>
                  {result.won
                    ? "The light endures"
                    : result.retreated
                      ? "A tactical retreat"
                      : "The crystal has fallen"}
                </h3>
                <p>
                  +{result.earned + result.bonus} Essence secured
                  <br />
                  {result.bonus > 0 && `${result.bonus} bonus Essence included`}
                </p>
                <div className="rb-actions">
                  <button
                    onClick={() => {
                      setResult(null);
                      setTab("tree");
                    }}
                  >
                    Invest in your skill tree
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                      if (result.won)
                        setStage(Math.min(unlockedStage(progress), stage + 1));
                    }}
                  >
                    {" "}
                    {result.won && stage < STAGES
                      ? "Next stage"
                      : "Prepare another attempt"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="rb-spells">
            {["Nova", "Frost", "Mend"].map((name, i) => {
              const locked =
                (i === 1 && !stats.frost) || (i === 2 && !stats.mend);
              return (
                <button
                  key={name}
                  disabled={!active || paused || locked || hud.cool[i] > 0}
                  onClick={() => spell(i)}
                >
                  <kbd>{i + 1}</kbd>
                  <b>{name}</b>
                  <small>
                    {locked
                      ? "Unlock in skill tree"
                      : hud.cool[i] > 0
                        ? `${hud.cool[i].toFixed(1)}s`
                        : "Ready"}
                  </small>
                </button>
              );
            })}
            <button disabled={!active} onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              disabled={!active}
              onClick={() => {
                if (battle.current) battle.current.status = "retreated";
              }}
            >
              Retreat
            </button>
          </div>
          <p className="rb-help">
            Click a foe to prioritise it · 1–3 cast spells · Space pauses after
            clicking the arena · Earned Essence survives defeat
          </p>
        </section>
        <aside className="rb-side">
          <nav aria-label="Progression panels">
            <button
              aria-pressed={tab === "stages"}
              onClick={() => setTab("stages")}
            >
              Stage map
            </button>
            <button
              aria-pressed={tab === "tree"}
              onClick={() => setTab("tree")}
            >
              Skill tree
            </button>
          </nav>
          {tab === "stages" ? (
            <>
              <p className="rb-eyebrow">YOUR CAMPAIGN</p>
              <h3>The path to dawn</h3>
              <p>
                Clear three waves to unlock the next stage. Replay any cleared
                stage to earn more Essence.
              </p>
              <div className="rb-stages">
                {Array.from({ length: STAGES }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    disabled={active || n > unlockedStage(progress)}
                    aria-pressed={stage === n}
                    aria-label={`Stage ${n}${progress.cleared.includes(n) ? ", cleared" : n > unlockedStage(progress) ? ", locked" : ""}`}
                    onClick={() => {
                      setStage(n);
                      setResult(null);
                      battle.current = null;
                    }}
                  >
                    <b>{n.toString().padStart(2, "0")}</b>
                    <small>
                      {progress.cleared.includes(n)
                        ? "✧"
                        : n > unlockedStage(progress)
                          ? "Locked"
                          : n === unlockedStage(progress)
                            ? "Next"
                            : "Open"}
                    </small>
                  </button>
                ))}
              </div>
              <p className="rb-stage-title">{STAGE_NAMES[stage - 1]}</p>
            </>
          ) : (
            <>
              <p className="rb-eyebrow">PERMANENT PROGRESSION</p>
              <h3>Your power takes root</h3>
              <p>
                Upgrades carry between attempts. Each deeper node requires 2
                ranks in the node above it.
              </p>
              {active && (
                <p className="rb-notice">Finish or retreat to spend Essence.</p>
              )}
              <div className="rb-tree">
                {[0, 3, 6].map((startIndex) => (
                  <div key={startIndex}>
                    <h4>{SKILLS[startIndex].branch}</h4>
                    {SKILLS.slice(startIndex, startIndex + 3).map((node, j) => {
                      const i = startIndex + j,
                        rank = progress.ranks[i],
                        parentReady =
                          node.parent < 0 || progress.ranks[node.parent] >= 2;
                      return (
                        <article className="rb-node" key={node.name}>
                          {j > 0 && (
                            <span className="rb-link" aria-hidden="true">
                              │
                            </span>
                          )}
                          <span className="rb-node-icon">
                            {["⚡", "◇", "✦"][startIndex / 3]}
                          </span>
                          <h5>{node.name}</h5>
                          <span className="rb-ranks">
                            {rank}/{node.max}
                          </span>
                          <p>{node.desc}</p>
                          <button
                            disabled={
                              active ||
                              !parentReady ||
                              rank === node.max ||
                              progress.essence < skillCost(rank)
                            }
                            onClick={() => setProgress((p) => buySkill(p, i))}
                          >
                            {rank === node.max
                              ? "Mastered"
                              : !parentReady
                                ? "Requires 2 above"
                                : `✧ ${skillCost(rank)}`}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ))}
              </div>
              <button
                className="rb-refund"
                disabled={active || progress.ranks.every((n) => n === 0)}
                onClick={() => setProgress(refundSkills)}
              >
                Respec · refund all Essence
              </button>
            </>
          )}
          <div className="rb-build">
            <h4>YOUR CURRENT BUILD</h4>
            <div>
              <span>Bolt damage</span>
              <b>{stats.damage}</b>
            </div>
            <div>
              <span>Fire interval</span>
              <b>{stats.interval.toFixed(2)}s</b>
            </div>
            <div>
              <span>Integrity</span>
              <b>{stats.hp}</b>
            </div>
            <div>
              <span>Targets per shot</span>
              <b>{stats.targets}</b>
            </div>
            <div>
              <span>Nova damage</span>
              <b>{stats.nova}</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
