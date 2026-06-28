"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceEnemy,
  enemiesInRange,
  applyDamage,
  waveConfig,
  canPlaceTower,
  isPathCell,
  sellRefund,
  TOWER_DEFS,
  STARTING_GOLD,
  STARTING_LIVES,
  W,
  H,
  CELL,
  COLS,
  ROWS,
  PATH_PX,
  type Tower,
  type Enemy,
  type Projectile,
  type TowerKind,
} from "@/lib/towerdef";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

type Status = "idle" | "playing" | "over";

const PROJ_SPEED = 360; // px per second

export function TowerDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── game state in refs (no re-renders) ───────────────────────────────────
  const towersRef     = useRef<Tower[]>([]);
  const enemiesRef    = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const goldRef       = useRef(STARTING_GOLD);
  const livesRef      = useRef(STARTING_LIVES);
  const waveRef       = useRef(0);
  const waveActiveRef = useRef(false);
  const spawnCountRef = useRef(0);
  const spawnTotalRef = useRef(0);
  const nextSpawnRef  = useRef(0); // rAF ts when to spawn next
  const statusRef     = useRef<Status>("idle");
  const selectedRef   = useRef<TowerKind>("basic");
  const sellModeRef   = useRef(false);
  const prevTimeRef   = useRef(0);
  const rafRef        = useRef(0);
  const nextEIdRef    = useRef(1);
  const nextPIdRef    = useRef(1);
  const nextTIdRef    = useRef(1);
  const hoverRef      = useRef({ col: -1, row: -1 });

  // ── React state (HUD only) ────────────────────────────────────────────────
  const [gold,       setGold      ] = useState(STARTING_GOLD);
  const [lives,      setLives     ] = useState(STARTING_LIVES);
  const [wave,       setWave      ] = useState(0);
  const [status,     setStatus    ] = useState<Status>("idle");
  const [waveActive, setWaveActive] = useState(false);
  const [selKind,    setSelKind   ] = useState<TowerKind>("basic");
  const [sellMode,   setSellMode  ] = useState(false);

  // ── draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = "#0a0f0a";
    ctx.fillRect(0, 0, W, H);

    // Grid cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = isPathCell(c, r) ? "#6b4c36" : "#172817";
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, H);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(W, r * CELL);
      ctx.stroke();
    }

    // Entry / exit labels
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#4ade80";
    ctx.fillText("IN", PATH_PX[0][0], PATH_PX[0][1] - CELL);
    ctx.fillStyle = "#f87171";
    ctx.fillText("OUT", PATH_PX[PATH_PX.length - 1][0], PATH_PX[PATH_PX.length - 1][1] + CELL);

    // Hover highlight + range preview
    const hov = hoverRef.current;
    if (statusRef.current === "playing" && hov.col >= 0 && hov.col < COLS && hov.row >= 0 && hov.row < ROWS) {
      if (sellModeRef.current) {
        // Sell mode: red tint on towers that can be sold
        const hasTower = towersRef.current.some((t) => t.col === hov.col && t.row === hov.row);
        if (hasTower) {
          ctx.fillStyle = "rgba(248,113,113,0.35)";
          ctx.fillRect(hov.col * CELL, hov.row * CELL, CELL, CELL);
        }
      } else {
        const state = { towers: towersRef.current, gold: goldRef.current, selectedTowerKind: selectedRef.current };
        const canPlace = canPlaceTower(state, hov.col, hov.row);
        if (!isPathCell(hov.col, hov.row)) {
          ctx.fillStyle = canPlace ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)";
          ctx.fillRect(hov.col * CELL, hov.row * CELL, CELL, CELL);
        }
        if (canPlace) {
          const def = TOWER_DEFS[selectedRef.current];
          const cx = hov.col * CELL + CELL / 2;
          const cy = hov.row * CELL + CELL / 2;
          ctx.strokeStyle = `${def.color}44`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, def.range, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Towers
    for (const tower of towersRef.current) {
      const def = TOWER_DEFS[tower.kind];
      const cx = tower.col * CELL + CELL / 2;
      const cy = tower.row * CELL + CELL / 2;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.roundRect(tower.col * CELL + 3, tower.row * CELL + 3, CELL - 6, CELL - 6, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(tower.col * CELL + 3, tower.row * CELL + CELL - 9, CELL - 6, 6);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.label[0], cx, cy - 2);
    }

    // Projectiles
    for (const proj of projectilesRef.current) {
      ctx.fillStyle = proj.isSplash ? "#f87171" : "#fbbf24";
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.isSplash ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const enemy of enemiesRef.current) {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + 10, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // HP bar background
      const bW = 22;
      const bX = enemy.x - bW / 2;
      const bY = enemy.y - 17;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(bX, bY, bW, 4);
      // HP bar fill
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#fbbf24" : "#f87171";
      ctx.fillRect(bX, bY, bW * ratio, 4);
    }

    // Idle overlay
    if (statusRef.current === "idle") {
      ctx.fillStyle = "rgba(5,6,13,0.78)";
      ctx.fillRect(0, H / 2 - 64, W, 128);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#eef1f8";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("🏰  Tower Defense", W / 2, H / 2 - 22);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#9aa0b8";
      ctx.fillText("Click canvas to start · place towers on green cells", W / 2, H / 2 + 6);
      ctx.fillText("then press Start Wave to send the enemies", W / 2, H / 2 + 26);
    }
  }, []);

  // ── update (called per frame while playing) ───────────────────────────────
  const updateGame = useCallback((ts: number, dt: number) => {
    // 1. Spawn enemies
    if (
      waveActiveRef.current &&
      spawnCountRef.current < spawnTotalRef.current &&
      ts >= nextSpawnRef.current
    ) {
      const cfg = waveConfig(waveRef.current);
      const [sx, sy] = PATH_PX[0];
      const newEnemy: Enemy = {
        id: nextEIdRef.current++,
        x: sx,
        y: sy,
        hp: cfg.hp,
        maxHp: cfg.hp,
        speed: cfg.speed,
        pathIndex: 1,
        reward: cfg.reward,
        dead: false,
        reachedEnd: false,
      };
      enemiesRef.current = [...enemiesRef.current, newEnemy];
      spawnCountRef.current += 1;
      nextSpawnRef.current = ts + 1100; // 1.1s between spawns
    }

    // 2. Advance all enemies
    enemiesRef.current = enemiesRef.current.map((e) => advanceEnemy(e, dt));

    // 3. Remove reached-end + dead enemies (from previous frame damage)
    let livesLost = 0;
    let goldGained = 0;
    enemiesRef.current = enemiesRef.current.filter((e) => {
      if (e.reachedEnd) { livesLost++; return false; }
      if (e.dead) { goldGained += e.reward; return false; }
      return true;
    });
    if (livesLost > 0) {
      livesRef.current = Math.max(0, livesRef.current - livesLost);
      setLives(livesRef.current);
    }
    if (goldGained > 0) {
      goldRef.current += goldGained;
      setGold(goldRef.current);
    }

    // 4. Tower firing
    towersRef.current = towersRef.current.map((tower) => {
      const def = TOWER_DEFS[tower.kind];
      const interval = 1000 / def.fireRate;
      if (ts - tower.lastFired < interval) return tower;
      const inRange = enemiesInRange(tower, enemiesRef.current);
      if (inRange.length === 0) return tower;
      const target = inRange[0];
      const projX = tower.col * CELL + CELL / 2;
      const projY = tower.row * CELL + CELL / 2;
      const newProj: Projectile = {
        id: nextPIdRef.current++,
        x: projX,
        y: projY,
        tx: target.x,
        ty: target.y,
        speed: PROJ_SPEED,
        damage: def.damage,
        targetEnemyId: target.id,
        isSplash: def.splashRadius > 0,
        splashRadius: def.splashRadius,
      };
      projectilesRef.current = [...projectilesRef.current, newProj];
      return { ...tower, lastFired: ts };
    });

    // 5. Advance projectiles; deal damage on arrival
    const survived: Projectile[] = [];
    for (const proj of projectilesRef.current) {
      const dx = proj.tx - proj.x;
      const dy = proj.ty - proj.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const move = proj.speed * dt;
      if (d <= move + 1) {
        // Arrived — deal damage
        if (proj.isSplash) {
          enemiesRef.current = enemiesRef.current.map((e) => {
            if (e.dead || e.reachedEnd) return e;
            const ex = e.x - proj.tx;
            const ey = e.y - proj.ty;
            return Math.sqrt(ex * ex + ey * ey) <= proj.splashRadius
              ? applyDamage(e, proj.damage)
              : e;
          });
        } else {
          enemiesRef.current = enemiesRef.current.map((e) =>
            e.id === proj.targetEnemyId && !e.dead
              ? applyDamage(e, proj.damage)
              : e,
          );
        }
        // Projectile consumed — don't keep
      } else {
        const ratio = move / d;
        survived.push({ ...proj, x: proj.x + dx * ratio, y: proj.y + dy * ratio });
      }
    }
    projectilesRef.current = survived;

    // 6. Remove enemies killed by projectiles this frame
    let goldGained2 = 0;
    enemiesRef.current = enemiesRef.current.filter((e) => {
      if (e.dead) { goldGained2 += e.reward; return false; }
      return true;
    });
    if (goldGained2 > 0) {
      goldRef.current += goldGained2;
      setGold(goldRef.current);
    }

    // 7. Check wave complete
    if (
      waveActiveRef.current &&
      spawnCountRef.current >= spawnTotalRef.current &&
      enemiesRef.current.length === 0
    ) {
      waveActiveRef.current = false;
      setWaveActive(false);
    }

    // 8. Check game over
    if (livesRef.current <= 0) {
      statusRef.current = "over";
      setStatus("over");
    }
  }, []);

  // ── RAF loop ─────────────────────────────────────────────────────────────
  const loop = useCallback(
    (ts: number) => {
      if (prevTimeRef.current === 0) prevTimeRef.current = ts;
      const dt = Math.min((ts - prevTimeRef.current) / 1000, 0.05);
      prevTimeRef.current = ts;

      if (statusRef.current === "playing") {
        updateGame(ts, dt);
      }

      draw();

      if (statusRef.current !== "over") {
        rafRef.current = requestAnimationFrame(loop);
      }
    },
    [draw, updateGame],
  );

  // ── start wave ────────────────────────────────────────────────────────────
  const startWave = useCallback(() => {
    if (statusRef.current !== "playing" || waveActiveRef.current) return;
    const nextWave = waveRef.current + 1;
    waveRef.current = nextWave;
    const cfg = waveConfig(nextWave);
    spawnCountRef.current = 0;
    spawnTotalRef.current = cfg.count;
    nextSpawnRef.current = performance.now();
    waveActiveRef.current = true;
    setWave(nextWave);
    setWaveActive(true);
  }, []);

  // ── new game ──────────────────────────────────────────────────────────────
  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    towersRef.current     = [];
    enemiesRef.current    = [];
    projectilesRef.current = [];
    goldRef.current       = STARTING_GOLD;
    livesRef.current      = STARTING_LIVES;
    waveRef.current       = 0;
    waveActiveRef.current = false;
    spawnCountRef.current = 0;
    spawnTotalRef.current = 0;
    nextEIdRef.current    = 1;
    nextPIdRef.current    = 1;
    nextTIdRef.current    = 1;
    prevTimeRef.current   = 0;
    statusRef.current     = "playing";
    setGold(STARTING_GOLD);
    setLives(STARTING_LIVES);
    setWave(0);
    setWaveActive(false);
    setStatus("playing");
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ── canvas click (place/sell tower or start game) ─────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (statusRef.current !== "playing") {
        newGame();
        return;
      }
      const cv = canvasRef.current!;
      const rect = cv.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / CELL);
      const row = Math.floor((e.clientY - rect.top) / CELL);

      if (sellModeRef.current) {
        // Sell mode: remove a tower and refund gold
        const towerIdx = towersRef.current.findIndex((t) => t.col === col && t.row === row);
        if (towerIdx >= 0) {
          const tower = towersRef.current[towerIdx];
          towersRef.current = towersRef.current.filter((_, i) => i !== towerIdx);
          goldRef.current += sellRefund(tower);
          setGold(goldRef.current);
        }
        return;
      }

      const state = { towers: towersRef.current, gold: goldRef.current, selectedTowerKind: selectedRef.current };
      if (canPlaceTower(state, col, row)) {
        const def = TOWER_DEFS[selectedRef.current];
        const tower: Tower = {
          id: nextTIdRef.current++,
          kind: selectedRef.current,
          col,
          row,
          lastFired: 0,
        };
        towersRef.current = [...towersRef.current, tower];
        goldRef.current -= def.cost;
        setGold(goldRef.current);
      }
    },
    [newGame],
  );

  // ── hover (range preview) ─────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current!;
    const rect = cv.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL);
    const row = Math.floor((e.clientY - rect.top) / CELL);
    hoverRef.current = { col, row };
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = { col: -1, row: -1 };
  }, []);

  // ── tower selection ───────────────────────────────────────────────────────
  const selectKind = useCallback((kind: TowerKind) => {
    selectedRef.current = kind;
    setSelKind(kind);
    sellModeRef.current = false;
    setSellMode(false);
  }, []);

  // ── sell mode toggle ──────────────────────────────────────────────────────
  const toggleSellMode = useCallback(() => {
    const next = !sellModeRef.current;
    sellModeRef.current = next;
    setSellMode(next);
  }, []);

  // ── mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width  = W * dpr;
    cv.height = H * dpr;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs (e.g. the leaderboard name field).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (statusRef.current === "idle" || statusRef.current === "over") {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); newGame(); }
        return;
      }
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          startWave();
          break;
        case "1": selectKind("basic");  break;
        case "2": selectKind("sniper"); break;
        case "3": selectKind("splash"); break;
        case "4":
        case "s": toggleSellMode();    break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newGame, startWave, selectKind, toggleSellMode]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const kindDefs = Object.values(TOWER_DEFS);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "Click cell",  desc: "Place selected tower" },
          { key: "1 / 2 / 3",  desc: "Select tower type" },
          { key: "S / 4",       desc: "Toggle sell mode" },
          { key: "Space",       desc: "Start next wave" },
          { key: "Enter",       desc: "Start / restart" },
        ]}
        tips={[
          "Build towers before starting each wave",
          "Sniper hits hard from far away — great on long straights",
          "Splash towers clear groups — place near path bends",
          "Kill enemies to earn gold for more towers",
        ]}
      />

      <div className="td-root">
        {/* HUD bar */}
        <div className="td-bar">
          <span className="td-stat" aria-live="polite">💰 {gold}</span>
          <span className="td-stat" aria-live="polite">❤️ {lives}</span>
          <span className="td-stat" aria-live="polite">🌊 Wave {wave}</span>
          {status === "playing" && !waveActive && (
            <button className="btn" onClick={startWave}>
              Start Wave {wave + 1}
            </button>
          )}
          {status === "playing" && waveActive && (
            <span className="td-stat td-stat--dim">Wave in progress…</span>
          )}
          <button className="btn ghost" onClick={newGame}>New</button>
        </div>

        {/* Canvas */}
        <div className="td-stage">
          <canvas
            ref={canvasRef}
            className="td-canvas"
            role="img"
            aria-label="Tower Defense — click a green cell to place the selected tower, choose tower types with keys 1, 2 and 3 (S to sell), then press Space or the Start Wave button to send enemies. Stop them reaching the exit. Pointer and keyboard."
            style={{ width: W, height: H }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {status === "over" && (
            <div className="td-overlay" role="alert">
              <div className="td-overlay-title">Game Over</div>
              <div className="td-overlay-sub">Survived {wave} wave{wave !== 1 ? "s" : ""}</div>
              <button className="btn" onClick={newGame}>Play Again</button>
            </div>
          )}
        </div>

        {/* Tower selector */}
        <div className="td-toolbar">
          {kindDefs.map((def) => (
            <button
              key={def.kind}
              className={`td-tower-btn${!sellMode && selKind === def.kind ? " active" : ""}`}
              style={{ "--td-tower-color": def.color } as React.CSSProperties}
              onClick={() => selectKind(def.kind)}
              title={`${def.label} — ${def.cost}g, range ${def.range}px, ${def.damage} dmg @ ${def.fireRate}/s`}
            >
              <span className="td-tower-icon" />
              <span className="td-tower-name">{def.label}</span>
              <span className="td-tower-cost">{def.cost}g</span>
            </button>
          ))}
          <button
            className={`td-tower-btn${sellMode ? " active" : ""}`}
            style={{ "--td-tower-color": "#e53e3e" } as React.CSSProperties}
            onClick={toggleSellMode}
            title="Sell mode — click a placed tower to sell it for 60% of its cost (S / 4)"
          >
            <span className="td-tower-icon" />
            <span className="td-tower-name">Sell</span>
            <span className="td-tower-cost">60%</span>
          </button>
        </div>

        <div className="td-hint">
          Click a green cell to place · Space to start wave · 1/2/3 to select tower · S to sell
        </div>
      </div>

      <GameLeaderboard
        game="towerdef"
        value={wave}
        over={status === "over"}
        title="Tower Defense"
      />
    </div>
  );
}
