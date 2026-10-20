"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { GameInfo } from "@/components/GameInfo";
import { ignoreGameKey } from "@/lib/game-input";
import { accuracy, LOCATIONS, newPatrol, reloadPatrol, RP_MAGAZINE, RP_RELOAD, RP_STEP, RP_WAVES, shootPatrol, stepPatrol, type Aim, type PatrolDifficulty } from "@/lib/rail-patrol";
import { paintPatrol } from "./paint";
import styles from "./RailPatrol.module.css";

const BEST_KEY = "baltoratora:rail-patrol:best:v1";
type Best = Partial<Record<PatrolDifficulty, number>>;
const DIFFICULTIES: PatrolDifficulty[] = ["easy", "normal", "hard"];

export function RailPatrol() {
  const [game, setGame] = useState(() => newPatrol(139));
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<PatrolDifficulty>("normal");
  const [sound, setSound] = useState(false);
  const [best, setBest] = useState<Best>({});
  const canvas = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(game); gameRef.current = game;
  const aim = useRef<Aim>({ x: .5, y: .5, aspect: 1 });
  const dimensions = useRef({ w: 1, h: 1 });
  const dirty = useRef(true);
  const active = started && !paused && game.phase !== "won" && game.phase !== "lost";
  const activeRef = useRef(active); activeRef.current = active;
  const audio = useRef<AudioContext | null>(null);
  const recorded = useRef(false);
  const ended = game.phase === "won" || game.phase === "lost";
  const reloading = game.reloadUntil > game.time;
  const location = LOCATIONS[Math.floor(game.wave / 2)];

  useEffect(() => { dirty.current = true; }, [game, active]);
  useEffect(() => {
    const cv = canvas.current; const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let raf = 0; let lastPaint = 0;
    const resize = () => {
      const box = cv.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
      dimensions.current = { w: box.width, h: box.height };
      aim.current.aspect = box.width / Math.max(1, box.height);
      cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty.current = true;
    };
    const observer = new ResizeObserver(resize); observer.observe(cv); resize();
    const draw = (time: number) => {
      if (!document.hidden && time - lastPaint >= 30 && (dirty.current || activeRef.current)) {
        const { w, h } = dimensions.current;
        paintPatrol(ctx, w, h, gameRef.current, aim.current, activeRef.current);
        dirty.current = false; lastPaint = time;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { if (!document.hidden) setGame(stepPatrol); }, RP_STEP);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) setPaused(true); };
    const blur = () => setPaused(true);
    window.addEventListener("blur", blur); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BEST_KEY) ?? "null");
      const valid: Best = {};
      if (saved && typeof saved === "object") for (const d of DIFFICULTIES) if (Number.isSafeInteger(saved[d]) && saved[d] >= 0) valid[d] = saved[d];
      setBest(valid);
    } catch {}
    return () => { audio.current?.close().catch(() => {}); audio.current = null; };
  }, []);
  useEffect(() => {
    if (!started || !ended || recorded.current) return;
    recorded.current = true;
    const next = { ...best, [game.difficulty]: Math.max(best[game.difficulty] ?? 0, game.score) };
    setBest(next);
    try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch {}
  }, [started, ended, game.difficulty, game.score, best]);

  const tone = (frequency: number) => {
    if (!sound) return;
    try {
      const ctx = audio.current ?? new AudioContext(); audio.current = ctx;
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "triangle"; osc.frequency.setValueAtTime(frequency, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(frequency / 3, ctx.currentTime + .09);
      gain.gain.setValueAtTime(.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .1);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .11);
    } catch { /* Sound is optional; unsupported or blocked audio never stops play. */ }
  };
  const fire = () => {
    if (!active || gameRef.current.phase !== "combat") return;
    const s = gameRef.current;
    if (s.ammo > 0 && s.reloadUntil <= s.time && s.time - s.shotAt >= 140) tone(720);
    const shot = { ...aim.current }; setGame((prev) => shootPatrol(prev, shot));
  };
  const reload = () => { if (active) { tone(220); setGame(reloadPatrol); } };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (ignoreGameKey(e) || !started || ended) return;
      if (e.key.toLowerCase() === "p" || e.key === "Escape") { e.preventDefault(); if (!e.repeat) setPaused((p) => !p); return; }
      if (!active) return;
      const direction: Record<string, [number, number]> = { ArrowLeft: [-.035, 0], ArrowRight: [.035, 0], ArrowUp: [0, -.035], ArrowDown: [0, .035], a: [-.035, 0], d: [.035, 0], w: [0, -.035], s: [0, .035] };
      const delta = direction[e.key] ?? direction[e.key.toLowerCase()];
      if (delta) { e.preventDefault(); aim.current.x = Math.max(0, Math.min(1, aim.current.x + delta[0])); aim.current.y = Math.max(0, Math.min(1, aim.current.y + delta[1])); dirty.current = true; }
      else if (e.key === " ") { e.preventDefault(); if (!e.repeat) fire(); }
      else if (e.key.toLowerCase() === "r") { e.preventDefault(); if (!e.repeat) reload(); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }); // Use current sound/active state; remove the prior listener on each render.

  const pointer = (e: PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    aim.current = { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height, aspect: box.width / box.height }; dirty.current = true;
  };
  const start = () => {
    recorded.current = false; aim.current.x = .5; aim.current.y = .5;
    setGame(newPatrol(Math.floor(Math.random() * 4294967296), difficulty)); setStarted(true); setPaused(false);
    canvas.current?.focus();
  };
  const recent = game.effects.at(-1);
  const feedback = recent && game.time - recent.born < 450 ? recent.kind === "friendly" ? "Helper hit. −20 shield." : recent.kind === "rescue" ? "Helper safe. +8 shield." : recent.kind === "hurt" ? "Incoming hit. Watch the charge bars." : "" : "";

  return <div className="game-layout">
    <GameInfo controls={[{ key: "Mouse / tap", desc: "Aim and fire a pulse" }, { key: "R / Reload", desc: "Refill your six-cell magazine" }, { key: "Arrows / WASD", desc: "Move the keyboard reticle" }, { key: "Space", desc: "Fire at the reticle" }, { key: "P / Escape", desc: "Pause or resume" }]}
      tips={["Threat bots show a charging bar and an ! mark. Stop them before the bar fills.", "Mint helper bots carry a marked parcel. Keep them safe to regain shield.", "Armoured threats take two body hits or one precision hit to the visor.", "Reload before a magazine runs dry. Tapping on empty starts a reload too.", "The route moves automatically through six encounters. Hidden tabs pause; returning requires Resume."]} />
    <div className={styles.root}>
      <div className="rp-toolbar"><div className="rp-location"><span>RAIL PATROL / {Math.floor(game.wave / 2) + 1} OF 3</span><strong>{location.name}</strong></div>
        <select className="game-select" aria-label="Difficulty" value={difficulty} disabled={started && !ended} onChange={(e) => setDifficulty(e.target.value as PatrolDifficulty)}><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select>
        {started && <button className="btn ghost" disabled={ended} onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>}
      </div>
      <div className="rp-stage">
        <canvas ref={canvas} className="rp-canvas" tabIndex={0} role="img" aria-label="Rail Patrol: aim at threat robots and tap or press Space to fire. Mint helpers carry a marked parcel; protect them. Arrows move the reticle, R reloads." onPointerMove={pointer} onPointerDown={(e) => { if (e.button !== 0 || !active) return; e.preventDefault(); e.currentTarget.focus(); pointer(e); fire(); }} onContextMenu={(e) => e.preventDefault()} />
        <div className="rp-hud"><div><span>SCORE</span><strong>{game.score.toLocaleString("en")}</strong>{game.combo > 1 && <small>×{game.combo} streak</small>}</div><div className="rp-shield"><span>SHIELD {game.shield}%</span><progress value={game.shield} max="100" aria-label="Shield remaining" /></div></div>
        {game.phase === "travel" && started && !paused && <div className="rp-travel" role="status"><span>ROUTE ADVANCING</span><strong>Next checkpoint →</strong><p>Fresh magazine supplied.</p></div>}
        <div className="rp-route" aria-label={`Encounter ${game.wave + 1} of ${RP_WAVES}`}>{Array.from({ length: RP_WAVES }, (_, i) => <span key={i} className={i < game.wave ? "done" : i === game.wave ? "current" : ""} />)}</div>
        {(!started || paused || ended) && <div className="rp-overlay"><div className="rp-card">
          <span className="rp-kicker">{!started ? "ORIGINAL ARCADE RAIL SHOOTER" : ended ? "PATROL DEBRIEF" : "PATROL PAUSED"}</span>
          <h2>{!started ? <>Steady aim.<br />Clear the route.</> : ended ? game.phase === "won" ? "Route secured." : "Signal lost." : "Take a breath."}</h2>
          <p>{!started ? "Three locations. Six encounters. Stop rogue robots and protect the helpers. The route moves; you take the shot." : ended ? game.phase === "won" ? "The network is back online. Here’s how your patrol went." : "The shield went down. Watch the charge bars and reload between threats." : "Nothing advances while paused. Resume when you’re ready."}</p>
          {ended && <dl className="rp-results"><div><dt>Score</dt><dd>{game.score.toLocaleString("en")}</dd></div><div><dt>Accuracy</dt><dd>{accuracy(game)}%</dd></div><div><dt>Threats stopped</dt><dd>{game.stopped} / 48</dd></div><div><dt>Helpers safe</dt><dd>{game.helpers} / 12</dd></div><div><dt>Precision hits</dt><dd>{game.headshots}</dd></div><div><dt>Helper hits</dt><dd>{game.friendlyHits}</dd></div></dl>}
          {!started && <div className="rp-brief"><span>! Stop threats</span><span>✓ Protect helpers</span><span>6 cells · R to reload</span></div>}
          <button className="btn rp-start" onClick={started && paused && !ended ? () => { setPaused(false); canvas.current?.focus(); } : start}>{started && paused && !ended ? "Resume patrol" : ended ? "Play again →" : "Start patrol →"}</button>
          {started && paused && !ended && <button className="rp-new" onClick={() => { if (window.confirm("End this patrol and start again?")) start(); }}>Start a new patrol</button>}
        </div></div>}
      </div>
      <div className="rp-controls"><div className="rp-ammo" aria-label={`${game.ammo} of ${RP_MAGAZINE} cells`}><span>{Array.from({ length: RP_MAGAZINE }, (_, i) => <i key={i} className={i < game.ammo ? "filled" : ""} />)}</span><strong>{game.ammo} / {RP_MAGAZINE}</strong></div>
        <button className="rp-reload" onClick={reload} disabled={!active || game.phase !== "combat" || reloading || game.ammo === RP_MAGAZINE}>{reloading ? `Reloading ${Math.max(0, (game.reloadUntil - game.time) / 1000).toFixed(1)}s` : "Reload ↻"}{reloading && <i style={{ width: `${(1 - (game.reloadUntil - game.time) / RP_RELOAD) * 100}%` }} />}</button>
        <button className="btn ghost rp-sound" aria-pressed={sound} onClick={() => setSound((v) => !v)}>Sound {sound ? "on" : "off"}</button>
      </div>
      <div className="rp-feedback" role="status">{feedback || (reloading ? "Reloading. Keep an eye on the charge bars." : "! Threats charge before firing. ✓ Mint helpers restore shield.")}</div>
      <p className="rp-best">Best {difficulty}: {(best[difficulty] ?? 0).toLocaleString("en")} · Mouse / tap to fire · R to reload</p>
    </div>
  </div>;
}
