"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { GameInfo } from "@/components/GameInfo";
import { ignoreGameKey } from "@/lib/game-input";
import { COLS, ROWS, STEP_MS, FUSE_MS, ROUND_MS, key, newArena, stepArena, type Arena, type Direction, type Difficulty } from "@/lib/blast-arena";

const COLOURS = ["#7de2ca", "#fa8ca7", "#bca0f5", "#f3cd7b"];
const NAMES = ["You", "Rose", "Violet", "Gold"];
const ICONS = { range: "✦", capacity: "+", speed: "»" };
const ARROWS: Record<Direction, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const KEYS: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
const STAT_KEY = "baltoratora:blast-arena:stats:v1";
type Stats = { rounds: number; wins: number };

function Robot({ id }: { id: number }) {
  return <svg viewBox="0 0 40 44" fill="none" aria-hidden="true">
    <ellipse cx="20" cy="40" rx="12" ry="3" fill="#000" opacity=".3" />
    <path d="M12 32v6h6v-5m5-1v6h6v-6" stroke="#253243" strokeWidth="4" strokeLinecap="round" />
    <path d="M8 22l-3 8m27-8 3 8" stroke={COLOURS[id]} strokeWidth="5" strokeLinecap="round" />
    <rect x="10" y="22" width="20" height="13" rx="6" fill={COLOURS[id]} />
    <rect x="6" y="5" width="28" height="23" rx="10" fill={COLOURS[id]} stroke="#e5fff2" strokeOpacity=".25" />
    <rect x="10" y="11" width="20" height="11" rx="5" fill="#172536" />
    <path d="M15 15v3m10-3v3" stroke="#effff9" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M20 5V2" stroke={COLOURS[id]} strokeWidth="3" strokeLinecap="round" />
    <path d="M12 9q6-3 12-1" stroke="#fff" strokeOpacity=".35" strokeLinecap="round" />
  </svg>;
}
function place(x: number, y: number): CSSProperties { return { left: `${x / COLS * 100}%`, top: `${y / ROWS * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }; }

export function BlastArena() {
  // A fixed preview seed keeps the server-rendered arena identical on hydration.
  const [arena, setArena] = useState<Arena>(() => newArena(2047));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [stats, setStats] = useState<Stats>({ rounds: 0, wins: 0 });
  const held = useRef<Direction | undefined>(undefined);
  const tapped = useRef<Direction | undefined>(undefined);
  const queued = useRef(false);
  const recorded = useRef(false);
  const over = arena.status !== "playing";
  const active = started && !paused && !over;
  const player = arena.actors[0];
  const bombsAvailable = Math.max(0, player.capacity - arena.bombs.filter((b) => b.owner === 0).length);
  const remaining = Math.max(0, Math.ceil((ROUND_MS - arena.time) / 1000));
  const clearInput = () => { held.current = undefined; tapped.current = undefined; queued.current = false; };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STAT_KEY) ?? "null");
      if (saved && Number.isInteger(saved.rounds) && saved.rounds >= 0 && Number.isInteger(saved.wins) && saved.wins >= 0 && saved.wins <= saved.rounds) setStats(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (!started || !over || recorded.current) return;
    recorded.current = true;
    const next = { rounds: stats.rounds + 1, wins: stats.wins + (arena.status === "won" ? 1 : 0) };
    setStats(next);
    try { localStorage.setItem(STAT_KEY, JSON.stringify(next)); } catch {}
  }, [started, over, arena.status, stats]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      const input = { direction: tapped.current ?? held.current, bomb: queued.current };
      tapped.current = undefined; queued.current = false;
      setArena((s) => stepArena(s, input));
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const pauseHidden = () => { if (document.hidden) { clearInput(); setPaused(true); } };
    const blur = () => { clearInput(); setPaused(true); };
    document.addEventListener("visibilitychange", pauseHidden);
    window.addEventListener("blur", blur);
    return () => { document.removeEventListener("visibilitychange", pauseHidden); window.removeEventListener("blur", blur); };
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (ignoreGameKey(e) || !started || over) return;
      if (e.key.toLowerCase() === "p" || e.key === "Escape") { e.preventDefault(); clearInput(); setPaused((p) => !p); return; }
      if (!active) return;
      const direction = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (direction) { e.preventDefault(); held.current = direction; }
      if (e.key === " ") { e.preventDefault(); if (!e.repeat) queued.current = true; }
    };
    const up = (e: KeyboardEvent) => { const direction = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]; if (direction && held.current === direction) held.current = undefined; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [active, started, over]);

  const start = () => {
    clearInput(); recorded.current = false;
    setArena(newArena(Math.floor(Math.random() * 4294967296), difficulty));
    setStarted(true); setPaused(false);
  };
  const hold = (e: PointerEvent<HTMLButtonElement>, direction: Direction) => {
    if (!active) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); held.current = direction;
  };

  return <div className="game-layout">
    <GameInfo controls={[{ key: "Arrows / WASD", desc: "Move your mint robot" }, { key: "Space", desc: "Place one bomb" }, { key: "P / Escape", desc: "Pause or resume" }, { key: "Touch", desc: "Hold a direction and tap Bomb" }]}
      tips={["Bombs explode in a cross after 2.4 seconds. Steel stops fire; crates stop it too, but break.", "Other bombs trigger instantly when hit. Your own explosions can tag you.", "✦ increases range, + increases bomb capacity, » increases movement speed.", "Find a corner to hide around before you drop a bomb. Last robot standing wins.", "Three bots, a 2½-minute round limit. A tied timer ends in a draw; leaving the tab pauses play."]} />
    <div className="ba">
      <div className="ba-toolbar">
        <label className="game-select-label"><span>Bot level</span><select className="game-select" value={difficulty} disabled={started && !over} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          <option value="easy">Easy bots</option><option value="normal">Normal bots</option><option value="hard">Hard bots</option>
        </select></label>
        <span className="ba-clock" aria-label={`${remaining} seconds left`}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>
        {started && <button className="btn ghost" disabled={over} onClick={() => { clearInput(); setPaused((p) => !p); }}>{paused ? "Resume" : "Pause"}</button>}
      </div>
      <div className="ba-roster" aria-label="Robots remaining">
        {arena.actors.map((actor) => <span key={actor.id} className={actor.alive ? "" : "out"} style={{ "--robot": COLOURS[actor.id] } as CSSProperties}><i aria-hidden="true" />{NAMES[actor.id]}{!actor.alive ? " · out" : ""}</span>)}
      </div>
      <div className="ba-board" role="region" tabIndex={0} aria-label={`Blast Arena. You are at column ${player.x + 1}, row ${player.y + 1}. Use arrows to move, Space for a bomb.`}>
        <div className="ba-floor" aria-hidden="true">{arena.tiles.flatMap((row, y) => row.map((tile, x) => <div key={key(x, y)} className={`ba-tile ${tile}`} />))}</div>
        {Object.entries(arena.items).map(([k, item]) => { const [x, y] = k.split(",").map(Number); return <div className="ba-item" key={k} style={place(x, y)} aria-hidden="true"><span>{ICONS[item]}</span></div>; })}
        {arena.bombs.map((bomb) => <div className="ba-bomb" key={bomb.id} style={place(bomb.x, bomb.y)} aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15.9" fill="none" stroke="#fbbe79" strokeWidth="2.5" strokeDasharray="100" strokeDashoffset={100 - Math.max(0, (bomb.at - arena.time) / FUSE_MS) * 100} /><circle cx="20" cy="21" r="11" fill="#182035" stroke="#8f9ab2" /><path d="M22 10q0-7 7-5" stroke="#ffda94" strokeWidth="2" fill="none" /><text x="20" y="25" textAnchor="middle" fill="#fff0c8" fontSize="13" fontWeight="700">{Math.ceil(Math.max(0, bomb.at - arena.time) / 1000)}</text></svg></div>)}
        {arena.flames.map((f, i) => <div className="ba-fire" key={`${key(f.x, f.y)}-${i}`} style={place(f.x, f.y)} aria-hidden="true"><span /></div>)}
        {arena.actors.filter((p) => p.alive).map((p) => <div className={`ba-robot robot-${p.id}`} key={p.id} style={place(p.x, p.y)} aria-hidden="true"><Robot id={p.id} />{p.id === 0 && <b>YOU</b>}</div>)}
        {(!started || paused || over) && <div className="ba-overlay"><div className="ba-overlay-card">
          <span className="ba-eyebrow">{over ? "ROUND COMPLETE" : started ? "TAKE A BREATH" : "ONE ARENA. FOUR ROBOTS."}</span>
          <h2>{over ? arena.status === "won" ? "Last bot standing." : arena.status === "draw" ? "A close call." : "Outsmarted this time." : started ? "On pause." : "A little chaos.\nA clever escape."}</h2>
          <p>{over ? arena.status === "won" ? "That was your arena. Ready for another?" : arena.status === "draw" ? "No winner this round. Change your route and try again." : "Watch the cross-shaped blasts. Leave a turn between you and your bomb." : started ? "The arena waits for you. Nothing moves while paused." : "Break crates, collect upgrades, and outlast three bots. Every bomb needs a way out."}</p>
          <button className="btn ba-start" onClick={paused && started && !over ? () => setPaused(false) : start}>{paused && started && !over ? "Resume round" : over ? "Play again →" : "Enter the arena →"}</button>
          {started && paused && !over && <button className="ba-restart" onClick={() => { if (window.confirm("End this round and start a new arena?")) start(); }}>Start a new arena</button>}
        </div></div>}
      </div>
      <div className="ba-kit" aria-live="polite"><span>Bombs <strong>{bombsAvailable}/{player.capacity}</strong></span><span>Range <strong>{player.range}</strong></span><span>Speed <strong>{player.speed + 1}</strong></span><span>Bots left <strong>{arena.actors.slice(1).filter((p) => p.alive).length}</strong></span></div>
      <div className="ba-touch" aria-label="Touch controls">
        <div className="ba-dpad">{(["up", "left", "down", "right"] as Direction[]).map((direction) => <button key={direction} style={{ gridArea: direction }} aria-label={`Move ${direction}`} disabled={!active}
          onPointerDown={(e) => hold(e, direction)} onPointerUp={() => { held.current = undefined; }} onPointerCancel={() => { held.current = undefined; }} onLostPointerCapture={() => { held.current = undefined; }}
          onClick={(e) => { if (e.detail === 0 && active) tapped.current = direction; }}>{ARROWS[direction]}</button>)}</div>
        <button className="ba-drop" onClick={() => { queued.current = true; }} disabled={!active || !bombsAvailable} aria-label="Place bomb"><span aria-hidden="true">✹</span>Bomb<span className="ba-drop-small">Space</span></button>
      </div>
      <p className="ba-record" role="status">{stats.wins} wins · {stats.rounds} completed rounds on this device · <span>Your explosions count too.</span></p>
    </div>
  </div>;
}
