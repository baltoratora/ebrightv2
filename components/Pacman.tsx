"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseMaze,
  MAZE_SRC,
  COLS,
  ROWS,
  tileKey,
  canMove,
  nextTile,
  chooseGhostDir,
  ghostTarget,
  eatPellet,
  isLevelComplete,
  oppositeDir,
  GHOST_EAT_SCORES,
  type Tile,
  type Dir,
  type GhostName,
  type GhostMode,
} from "@/lib/pacman";
import { GameLeaderboard } from "@/components/GameLeaderboard";
import { GameInfo } from "@/components/GameInfo";

// ── Constants ─────────────────────────────────────────────────────────────────
const CELL = 16; // pixels per tile
const W = COLS * CELL; // 448
const H = ROWS * CELL; // 464

const GHOST_NAMES: GhostName[] = ["blinky", "pinky", "inky", "clyde"];

const GHOST_COLORS: Record<GhostName, string> = {
  blinky: "#ff0000",
  pinky:  "#ffb8ff",
  inky:   "#00ffff",
  clyde:  "#ffb852",
};

const SCATTER_CORNERS: Record<GhostName, Tile> = {
  blinky: { row: 0,       col: COLS - 1 },
  pinky:  { row: 0,       col: 0        },
  inky:   { row: ROWS - 1, col: COLS - 1 },
  clyde:  { row: ROWS - 1, col: 0       },
};

// Speed in tiles/second
const PAC_SPEED_BASE  = 7.5;
const GHOST_SPEED_BASE = 6.5;
const FRIGHTENED_DURATION = 8000; // ms

type Status = "idle" | "playing" | "dying" | "levelclear" | "over";

interface Ghost {
  name: GhostName;
  tile: Tile;
  dir: Dir;
  mode: GhostMode;
  px: number; // pixel x (centre)
  py: number; // pixel y (centre)
  frightTimer: number; // ms remaining in frightened
  respawnTimer: number; // ms until ghost respawns after being eaten
  eaten: boolean;
}

// ── tile ↔ pixel helpers ──────────────────────────────────────────────────────
function tilePx(t: Tile): { px: number; py: number } {
  return { px: t.col * CELL + CELL / 2, py: t.row * CELL + CELL / 2 };
}

function pxTile(px: number, py: number): Tile {
  return { row: Math.floor(py / CELL), col: Math.floor(px / CELL) };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function Pacman() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── persistent maze data (never mutated — reset by parseMaze) ────────────
  const mazeRef = useRef(parseMaze(MAZE_SRC));

  // ── game state in refs (no re-renders) ───────────────────────────────────
  const statusRef       = useRef<Status>("idle");
  const scoreRef        = useRef(0);
  const livesRef        = useRef(3);
  const levelRef        = useRef(1);
  const pelletsRef      = useRef(new Set<string>());
  const powerPelletsRef = useRef(new Set<string>());
  const pacTileRef      = useRef<Tile>({ row: 27, col: 1 });
  const pacPxRef        = useRef({ px: 0, py: 0 });
  const pacDirRef       = useRef<Dir>("none");
  const pacQueueRef     = useRef<Dir>("none");
  const ghostsRef       = useRef<Ghost[]>([]);
  const ghostEatComboRef = useRef(0); // how many ghosts eaten in this power-up
  const dyingTimerRef   = useRef(0);
  const levelClearTimerRef = useRef(0);
  const prevTimeRef     = useRef(0);
  const rafRef          = useRef(0);
  const pacSpeedRef     = useRef(PAC_SPEED_BASE);
  const ghostSpeedRef   = useRef(GHOST_SPEED_BASE);

  // ── React state (HUD only) ────────────────────────────────────────────────
  const [score,  setScore ] = useState(0);
  const [lives,  setLives ] = useState(3);
  const [status, setStatus] = useState<Status>("idle");
  const [level,  setLevel ] = useState(1);

  // ── init / reset helpers ──────────────────────────────────────────────────
  // Reset Pac-Man and the ghosts to their spawn positions WITHOUT touching the
  // pellet state. Used on respawn-after-death so eaten pellets stay eaten.
  const resetActors = useCallback((lvl: number) => {
    const parsed = mazeRef.current;

    const spawnTile = parsed.pacSpawn;
    pacTileRef.current = { ...spawnTile };
    const sp = tilePx(spawnTile);
    pacPxRef.current = { px: sp.px, py: sp.py };
    pacDirRef.current = "none";
    pacQueueRef.current = "none";

    pacSpeedRef.current = PAC_SPEED_BASE + (lvl - 1) * 0.5;
    ghostSpeedRef.current = GHOST_SPEED_BASE + (lvl - 1) * 0.4;

    // Init ghosts from ghost spawn tiles — use first 4 unique positions
    const spawns = parsed.ghostSpawns.slice(0, 4);
    while (spawns.length < 4) spawns.push(parsed.ghostSpawns[0] ?? { row: 11, col: 13 });

    ghostsRef.current = GHOST_NAMES.map((name, i) => {
      const tile = spawns[i % spawns.length];
      const { px, py } = tilePx(tile);
      return {
        name,
        tile: { ...tile },
        dir: "left" as Dir,
        mode: "scatter" as GhostMode,
        px,
        py,
        frightTimer: 0,
        respawnTimer: 0,
        eaten: false,
      };
    });

    ghostEatComboRef.current = 0;
  }, []);

  // Full level (re)build: regenerate the maze + pellet sets, then place actors.
  // Use only for new games and level-clear transitions — NOT on death-respawn.
  const initLevel = useCallback((lvl: number) => {
    const parsed = parseMaze(MAZE_SRC);
    mazeRef.current = parsed;
    pelletsRef.current = new Set(parsed.pellets);
    powerPelletsRef.current = new Set(parsed.powerPellets);
    resetActors(lvl);
  }, [resetActors]);

  const newGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    prevTimeRef.current = 0;
    dyingTimerRef.current = 0;
    levelClearTimerRef.current = 0;
    initLevel(1);
    setScore(0);
    setLives(3);
    setLevel(1);
    statusRef.current = "playing";
    setStatus("playing");
    rafRef.current = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── drawing ───────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const walls = mazeRef.current.walls;

    // Background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Walls
    ctx.fillStyle = "#1a1aff";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (walls[r]?.[c]) {
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
    }

    // Wall highlights (inner border)
    ctx.strokeStyle = "#4444ff";
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (walls[r]?.[c]) {
          ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // Pellets
    ctx.fillStyle = "#ffb8ae";
    for (const key of pelletsRef.current) {
      const [r, c] = key.split(",").map(Number);
      ctx.beginPath();
      ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Power pellets (blinking)
    const blinkOn = Math.floor(Date.now() / 300) % 2 === 0;
    if (blinkOn) {
      ctx.fillStyle = "#ffb8ae";
      for (const key of powerPelletsRef.current) {
        const [r, c] = key.split(",").map(Number);
        ctx.beginPath();
        ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pac-Man
    if (statusRef.current !== "idle") {
      const { px, py } = pacPxRef.current;
      const dir = pacDirRef.current;
      const dying = statusRef.current === "dying";

      ctx.save();
      ctx.translate(px, py);

      // Mouth angle based on direction
      let startAngle = 0.25;
      if (dir === "left")  startAngle = Math.PI + 0.25;
      else if (dir === "up")    startAngle = -Math.PI / 2 + 0.25;
      else if (dir === "down")  startAngle = Math.PI / 2 + 0.25;

      if (dying) {
        const t = Math.min(1, (Date.now() - dyingTimerRef.current) / 700);
        ctx.globalAlpha = 1 - t * 0.8;
        startAngle = Math.PI * t;
      }

      const mouthAngle = dying ? 0 : 0.25 + Math.sin(Date.now() / 80) * 0.2;

      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, CELL / 2 - 1, startAngle + mouthAngle, startAngle + Math.PI * 2 - mouthAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Ghosts
    for (const g of ghostsRef.current) {
      if (g.eaten) continue;
      ctx.save();
      ctx.translate(g.px, g.py);

      const frightened = g.mode === "frightened";
      const flashSoon = frightened && g.frightTimer < 2000 && Math.floor(Date.now() / 250) % 2 === 0;
      const color = frightened
        ? (flashSoon ? "#ffffff" : "#0000ff")
        : GHOST_COLORS[g.name];

      const r = CELL / 2 - 1;

      // Ghost body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -2, r, Math.PI, 0);
      // Skirt
      ctx.lineTo(r, r - 2);
      for (let s = 0; s < 3; s++) {
        ctx.arc(r - (r * 2 / 3) * (s + 0.5), r - 2, r / 3, 0, Math.PI);
      }
      ctx.lineTo(-r, r - 2);
      ctx.closePath();
      ctx.fill();

      // Eyes (not shown when frightened)
      if (!frightened) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(-3, -3, 3, 4, 0, 0, Math.PI * 2);
        ctx.ellipse( 3, -3, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#00f";
        ctx.beginPath();
        ctx.arc(-3, -3, 1.5, 0, Math.PI * 2);
        ctx.arc( 3, -3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Frightened face
        ctx.fillStyle = "#ffb8ae";
        ctx.beginPath();
        ctx.arc(-3, -1, 2, 0, Math.PI * 2);
        ctx.arc( 3, -1, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Idle overlay
    if (statusRef.current === "idle") {
      ctx.fillStyle = "rgba(5,6,13,0.78)";
      ctx.fillRect(0, H / 2 - 60, W, 120);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("👻  Pac-Man", W / 2, H / 2 - 18);
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#9aa0b8";
      ctx.fillText("Arrow keys / WASD to move", W / 2, H / 2 + 10);
      ctx.fillText("Space or tap to start", W / 2, H / 2 + 28);
    }

    // Level clear overlay
    if (statusRef.current === "levelclear") {
      ctx.fillStyle = "rgba(5,6,13,0.78)";
      ctx.fillRect(0, H / 2 - 40, W, 80);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`Level ${levelRef.current} Clear!`, W / 2, H / 2);
    }
  }, []);

  // ── movement helpers ──────────────────────────────────────────────────────
  const movePac = useCallback((dt: number) => {
    const walls = mazeRef.current.walls;
    const speed = pacSpeedRef.current * CELL * dt;
    let { px, py } = pacPxRef.current;
    let dir = pacDirRef.current;
    const queue = pacQueueRef.current;

    // Try queued turn first
    const curTile = pxTile(px, py);

    // Check if near tile centre (can turn)
    const cPx = curTile.col * CELL + CELL / 2;
    const cPy = curTile.row * CELL + CELL / 2;
    const nearCentre = Math.abs(px - cPx) < speed + 1 && Math.abs(py - cPy) < speed + 1;

    if (nearCentre && queue !== "none" && canMove(walls, curTile, queue)) {
      // Snap to centre and turn
      px = cPx;
      py = cPy;
      dir = queue;
      pacQueueRef.current = "none";
      pacDirRef.current = dir;
    }

    if (dir === "none") {
      pacPxRef.current = { px, py };
      return;
    }

    // Can we continue in current direction?
    const nextT = nextTile(curTile, dir);
    const blocked = walls[nextT.row]?.[nextT.col];

    // Distance to tile centre
    const distToCentre = Math.abs(px - cPx) + Math.abs(py - cPy);

    if (blocked) {
      // Wall ahead: coast the rest of the way to this tile's centre, then stop.
      // Never freeze mid-tile — Pac-Man must reach the centre so a queued turn
      // at this junction can register (otherwise he gets stuck in corners).
      if (distToCentre <= speed) {
        px = cPx;
        py = cPy;
      } else {
        if (dir === "left")  px -= speed;
        if (dir === "right") px += speed;
        if (dir === "up")    py -= speed;
        if (dir === "down")  py += speed;
      }
      pacPxRef.current = { px, py };
      pacTileRef.current = pxTile(px, py);
      return;
    }

    // Open ahead: advance.
    if (dir === "left")  px -= speed;
    if (dir === "right") px += speed;
    if (dir === "up")    py -= speed;
    if (dir === "down")  py += speed;

    // Tunnel wrap
    if (px < -CELL / 2)   px = W + CELL / 2;
    if (px > W + CELL / 2) px = -CELL / 2;

    pacPxRef.current = { px, py };
    pacTileRef.current = pxTile(px, py);
  }, []);

  const moveGhost = useCallback((g: Ghost, dt: number) => {
    const walls = mazeRef.current.walls;
    const speed = ghostSpeedRef.current * CELL * dt * (g.mode === "frightened" ? 0.5 : 1);

    const cPx = g.tile.col * CELL + CELL / 2;
    const cPy = g.tile.row * CELL + CELL / 2;
    const distToCentre = Math.abs(g.px - cPx) + Math.abs(g.py - cPy);

    // At/near tile centre: choose next direction
    if (distToCentre <= speed + 1) {
      // Snap to centre
      g.px = cPx;
      g.py = cPy;

      const blinky = ghostsRef.current.find((gh) => gh.name === "blinky")!;
      const target = ghostTarget(
        g.name,
        pacTileRef.current,
        pacDirRef.current,
        blinky.tile,
        g.tile,
        SCATTER_CORNERS[g.name],
        g.mode,
      );

      const newDir = chooseGhostDir(
        walls,
        g.tile,
        g.dir,
        target,
        g.mode === "frightened",
        g.mode === "frightened" ? Math.random() : undefined,
      );

      g.dir = newDir;

      // Advance one step
      const nextT = nextTile(g.tile, g.dir);
      if (!walls[nextT.row]?.[nextT.col]) {
        g.tile = nextT;
      }
    }

    // Move towards tile centre
    const tCx = g.tile.col * CELL + CELL / 2;
    const tCy = g.tile.row * CELL + CELL / 2;

    const dx = tCx - g.px;
    const dy = tCy - g.py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const move = Math.min(dist, speed);
      g.px += (dx / dist) * move;
      g.py += (dy / dist) * move;
    }

    // Tunnel wrap
    if (g.px < -CELL / 2)   { g.px = W + CELL / 2; g.tile = pxTile(g.px, g.py); }
    if (g.px > W + CELL / 2) { g.px = -CELL / 2;   g.tile = pxTile(g.px, g.py); }
  }, []);

  // ── game loop ─────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    if (prevTimeRef.current === 0) prevTimeRef.current = ts;
    const raw = (ts - prevTimeRef.current) / 1000;
    const dt  = Math.min(raw, 0.05);
    prevTimeRef.current = ts;

    const st = statusRef.current;

    if (st === "dying") {
      if (Date.now() - dyingTimerRef.current > 900) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          statusRef.current = "over";
          setStatus("over");
          draw();
          return;
        }
        // Respawn Pac-Man and reset ghosts — keep eaten pellets eaten
        resetActors(levelRef.current);
        statusRef.current = "playing";
        setStatus("playing");
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (st === "levelclear") {
      if (Date.now() - levelClearTimerRef.current > 2000) {
        levelRef.current += 1;
        setLevel(levelRef.current);
        initLevel(levelRef.current);
        statusRef.current = "playing";
        setStatus("playing");
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (st === "playing") {
      // Move Pac-Man
      movePac(dt);

      // Eat pellet/power pellet
      const pacTile = pacTileRef.current;
      const eatResult = eatPellet(
        pacTile,
        pelletsRef.current,
        powerPelletsRef.current,
      );
      if (eatResult.score > 0) {
        scoreRef.current += eatResult.score;
        setScore(scoreRef.current);
      }
      if (eatResult.atePowerPellet) {
        // Make all ghosts frightened
        ghostEatComboRef.current = 0;
        for (const g of ghostsRef.current) {
          if (!g.eaten) {
            g.mode = "frightened";
            g.frightTimer = FRIGHTENED_DURATION;
            g.dir = oppositeDir(g.dir);
          }
        }
      }

      // Move ghosts, update frightened timers
      for (const g of ghostsRef.current) {
        if (g.eaten) {
          g.respawnTimer -= dt * 1000;
          if (g.respawnTimer <= 0) {
            g.eaten = false;
            const sp = mazeRef.current.ghostSpawns[0] ?? { row: 11, col: 13 };
            g.tile = { ...sp };
            const { px, py } = tilePx(sp);
            g.px = px;
            g.py = py;
            g.mode = "scatter";
            g.frightTimer = 0;
          }
          continue;
        }

        if (g.mode === "frightened") {
          g.frightTimer -= dt * 1000;
          if (g.frightTimer <= 0) {
            g.mode = "chase";
            g.frightTimer = 0;
          }
        }

        moveGhost(g, dt);
      }

      // Collision detection
      const { px: ppx, py: ppy } = pacPxRef.current;
      for (const g of ghostsRef.current) {
        if (g.eaten) continue;
        const dx = g.px - ppx;
        const dy = g.py - ppy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CELL - 2) {
          if (g.mode === "frightened") {
            // Eat ghost
            g.eaten = true;
            g.respawnTimer = 3000;
            const comboIdx = Math.min(ghostEatComboRef.current, GHOST_EAT_SCORES.length - 1);
            scoreRef.current += GHOST_EAT_SCORES[comboIdx];
            ghostEatComboRef.current += 1;
            setScore(scoreRef.current);
          } else {
            // Pac-Man dies
            statusRef.current = "dying";
            setStatus("dying");
            dyingTimerRef.current = Date.now();
          }
        }
      }

      // Level complete
      if (isLevelComplete(pelletsRef.current, powerPelletsRef.current)) {
        statusRef.current = "levelclear";
        setStatus("levelclear");
        levelClearTimerRef.current = Date.now();
      }
    }

    draw();
    if (statusRef.current !== "over") {
      rafRef.current = requestAnimationFrame(loop);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, movePac, moveGhost, initLevel, resetActors]);

  // ── mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width  = W * dpr;
    cv.height = H * dpr;

    // Init maze so idle screen shows pellets
    initLevel(1);
    pelletsRef.current = new Set(mazeRef.current.pellets);
    powerPelletsRef.current = new Set(mazeRef.current.powerPellets);

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
      if (statusRef.current !== "playing") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          newGame();
        }
        return;
      }
      switch (e.key) {
        case "ArrowUp":    case "w": case "W": e.preventDefault(); pacQueueRef.current = "up";    break;
        case "ArrowDown":  case "s": case "S": e.preventDefault(); pacQueueRef.current = "down";  break;
        case "ArrowLeft":  case "a": case "A": e.preventDefault(); pacQueueRef.current = "left";  break;
        case "ArrowRight": case "d": case "D": e.preventDefault(); pacQueueRef.current = "right"; break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newGame]);

  const queueDir = useCallback((d: Dir) => {
    if (statusRef.current === "playing") pacQueueRef.current = d;
    else newGame();
  }, [newGame]);

  return (
    <div className="game-layout">
      <GameInfo
        controls={[
          { key: "↑ ↓ ← →", desc: "Move Pac-Man" },
          { key: "WASD",      desc: "Move (alternate)" },
          { key: "Space",     desc: "Start / restart" },
        ]}
        tips={[
          "Eat power pellets to turn ghosts blue — then eat them!",
          "Each ghost has a unique personality — learn the patterns",
          "Eat multiple ghosts in one power-up for bonus points",
        ]}
      />

      <div className="pac-root">
        <div className="pac-bar">
          <span className="pac-stat" aria-live="polite">
            Score {score} · Lv {level} · {"❤️".repeat(Math.max(0, lives))}
            {status === "over" ? " · Game Over" : ""}
          </span>
          <button className="btn ghost" onClick={newGame}>New</button>
        </div>

        <div className="pac-stage">
          <canvas
            ref={canvasRef}
            className="pac-canvas"
            role="img"
            aria-label="Pac-Man — use the arrow keys, WASD, or the on-screen D-pad to move through the maze, eat every pellet and avoid the ghosts. Eat a power pellet to turn ghosts blue and chase them. Press Space or tap to start."
            style={{ width: W, height: H }}
            onClick={() => {
              if (statusRef.current !== "playing") newGame();
            }}
          />
          {status === "over" && (
            <div className="pac-overlay">
              <div className="pac-overlay-title">Game Over</div>
              <div className="pac-overlay-sub">Final score: {score}</div>
              <button className="btn" onClick={newGame}>Play Again</button>
            </div>
          )}
        </div>

        {/* D-pad for mobile */}
        <div className="pac-dpad" aria-label="D-pad controls">
          <button className="pac-dpad-btn" style={{ gridArea: "up" }}    onClick={() => queueDir("up")}    aria-label="Move up">▲</button>
          <button className="pac-dpad-btn" style={{ gridArea: "left" }}  onClick={() => queueDir("left")}  aria-label="Move left">◀</button>
          <div style={{ gridArea: "center" }} />
          <button className="pac-dpad-btn" style={{ gridArea: "right" }} onClick={() => queueDir("right")} aria-label="Move right">▶</button>
          <button className="pac-dpad-btn" style={{ gridArea: "down" }}  onClick={() => queueDir("down")}  aria-label="Move down">▼</button>
        </div>

        <div className="pac-hint">Arrow keys / WASD · Space to start</div>
      </div>

      <GameLeaderboard game="pacman" value={score} over={status === "over"} title="Pac-Man" />
    </div>
  );
}
