import { describe, it, expect } from "vitest";
import {
  parseMaze,
  MAZE_SRC,
  COLS,
  ROWS,
  tileKey,
  canMove,
  nextTile,
  blinkyTarget,
  pinkyTarget,
  inkyTarget,
  clydeTarget,
  chooseGhostDir,
  eatPellet,
  isLevelComplete,
  tunnelPxShift,
} from "./pacman";

// ── parseMaze ─────────────────────────────────────────────────────────────────

describe("parseMaze", () => {
  const maze = parseMaze(MAZE_SRC);

  it("produces a walls grid with ROWS rows", () => {
    expect(maze.walls).toHaveLength(ROWS);
  });

  it("each row has COLS columns", () => {
    for (const row of maze.walls) {
      expect(row).toHaveLength(COLS);
    }
  });

  it("corner tiles are walls", () => {
    expect(maze.walls[0][0]).toBe(true);
    expect(maze.walls[0][COLS - 1]).toBe(true);
  });

  it("collects pellets (.) as pellets", () => {
    expect(maze.pellets.size).toBeGreaterThan(100);
  });

  it("collects power pellets (o)", () => {
    expect(maze.powerPellets.size).toBeGreaterThanOrEqual(4);
  });

  it("collects ghost spawn tiles (G)", () => {
    expect(maze.ghostSpawns.length).toBeGreaterThanOrEqual(1);
  });

  it("finds the Pac-Man spawn (P)", () => {
    expect(maze.pacSpawn).toBeDefined();
    // P is on row 27
    expect(maze.pacSpawn.row).toBe(27);
  });

  it("pellet tiles are not walls", () => {
    for (const key of maze.pellets) {
      const [r, c] = key.split(",").map(Number);
      expect(maze.walls[r][c]).toBe(false);
    }
  });

  it("power-pellet tiles are not walls", () => {
    for (const key of maze.powerPellets) {
      const [r, c] = key.split(",").map(Number);
      expect(maze.walls[r][c]).toBe(false);
    }
  });
});

// ── canMove ───────────────────────────────────────────────────────────────────

describe("canMove", () => {
  const { walls } = parseMaze(MAZE_SRC);

  it("cannot move into a wall tile", () => {
    // row 0 col 0 is a wall; moving right from (0,0) would go to (0,1) which is also wall
    // Use a known open tile next to a wall
    // row 1, col 1 is '.'; moving up goes to row 0 col 1 which is '#'
    expect(canMove(walls, { row: 1, col: 1 }, "up")).toBe(false);
  });

  it("can move into an open tile", () => {
    // row 1 col 1 moving right → (1,2) should be open
    expect(canMove(walls, { row: 1, col: 1 }, "right")).toBe(true);
  });

  it("dir=none always returns true", () => {
    expect(canMove(walls, { row: 0, col: 0 }, "none")).toBe(true);
  });
});

// ── nextTile tunnel wraparound ────────────────────────────────────────────────

describe("nextTile", () => {
  it("wraps col from -1 to COLS-1", () => {
    const t = nextTile({ row: 13, col: 0 }, "left");
    expect(t.col).toBe(COLS - 1);
  });

  it("wraps col from COLS to 0", () => {
    const t = nextTile({ row: 13, col: COLS - 1 }, "right");
    expect(t.col).toBe(0);
  });

  it("moves up normally", () => {
    const t = nextTile({ row: 5, col: 5 }, "up");
    expect(t).toEqual({ row: 4, col: 5 });
  });
});

// ── Ghost targeting functions ─────────────────────────────────────────────────

describe("blinkyTarget", () => {
  it("returns exactly Pac-Man's tile", () => {
    const pac = { row: 10, col: 14 };
    expect(blinkyTarget(pac)).toEqual(pac);
  });
});

describe("pinkyTarget", () => {
  it("targets 4 tiles ahead of Pac-Man moving right", () => {
    const pac = { row: 10, col: 10 };
    const t = pinkyTarget(pac, "right");
    expect(t).toEqual({ row: 10, col: 14 });
  });

  it("targets 4 tiles above Pac-Man moving up", () => {
    const pac = { row: 10, col: 10 };
    const t = pinkyTarget(pac, "up");
    expect(t).toEqual({ row: 6, col: 10 });
  });
});

describe("inkyTarget", () => {
  it("doubles vector from Blinky to 2-ahead pivot", () => {
    // Pac at (10,10) moving right → pivot = (10,12)
    // Blinky at (10,8) → vector (2,4) → target (12,16)
    const pac = { row: 10, col: 10 };
    const blinky = { row: 10, col: 8 };
    const t = inkyTarget(pac, "right", blinky);
    expect(t).toEqual({ row: 10, col: 16 });
  });
});

describe("clydeTarget", () => {
  it("chases Pac-Man when distance > 8", () => {
    const ghost = { row: 0, col: 0 };
    const pac = { row: 15, col: 15 };
    const corner = { row: 28, col: 0 };
    expect(clydeTarget(ghost, pac, corner)).toEqual(pac);
  });

  it("scatters to corner when distance <= 8", () => {
    const ghost = { row: 10, col: 10 };
    const pac = { row: 12, col: 12 };
    const corner = { row: 28, col: 0 };
    expect(clydeTarget(ghost, pac, corner)).toEqual(corner);
  });
});

// ── chooseGhostDir ────────────────────────────────────────────────────────────

describe("chooseGhostDir", () => {
  const { walls } = parseMaze(MAZE_SRC);

  it("picks direction minimising distance to target", () => {
    // Ghost at row=18 col=13 (open corridor area), target to the right
    // Find an open tile in the middle area
    const ghostTile = { row: 18, col: 1 };
    const targetTile = { row: 18, col: 26 };
    // Should prefer "right" since target is far to the right
    const dir = chooseGhostDir(walls, ghostTile, "up", targetTile);
    expect(dir).toBe("right");
  });

  it("does not reverse direction", () => {
    const ghostTile = { row: 18, col: 5 };
    const targetTile = { row: 18, col: 1 }; // target to the left
    // Moving right, so cannot reverse (left)
    const dir = chooseGhostDir(walls, ghostTile, "right", targetTile);
    expect(dir).not.toBe("left");
  });

  it("picks a legal direction when frightened", () => {
    const ghostTile = { row: 18, col: 5 };
    const targetTile = { row: 0, col: 0 };
    const dir = chooseGhostDir(walls, ghostTile, "right", targetTile, true, 0.5);
    expect(["up", "down", "left", "right"]).toContain(dir);
    expect(dir).not.toBe("left"); // still can't reverse
  });
});

// ── eatPellet ─────────────────────────────────────────────────────────────────

describe("eatPellet", () => {
  it("eating a pellet reduces pellet count by 1 and adds 10 score", () => {
    const { pellets, powerPellets } = parseMaze(MAZE_SRC);
    const firstPellet = [...pellets][0];
    const [r, c] = firstPellet.split(",").map(Number);
    const initialCount = pellets.size;

    const result = eatPellet({ row: r, col: c }, pellets, powerPellets);
    expect(result.atePellet).toBe(true);
    expect(result.score).toBe(10);
    expect(pellets.size).toBe(initialCount - 1);
  });

  it("eating a power pellet adds 50 score", () => {
    const { pellets, powerPellets } = parseMaze(MAZE_SRC);
    const firstPower = [...powerPellets][0];
    const [r, c] = firstPower.split(",").map(Number);

    const result = eatPellet({ row: r, col: c }, pellets, powerPellets);
    expect(result.atePowerPellet).toBe(true);
    expect(result.score).toBe(50);
  });

  it("eating empty tile returns 0 score", () => {
    const pellets = new Set<string>();
    const powerPellets = new Set<string>();
    const result = eatPellet({ row: 0, col: 0 }, pellets, powerPellets);
    expect(result.score).toBe(0);
    expect(result.atePellet).toBe(false);
    expect(result.atePowerPellet).toBe(false);
  });
});

// ── isLevelComplete ───────────────────────────────────────────────────────────

describe("isLevelComplete", () => {
  it("returns false when pellets remain", () => {
    const { pellets, powerPellets } = parseMaze(MAZE_SRC);
    expect(isLevelComplete(pellets, powerPellets)).toBe(false);
  });

  it("returns true when all pellets eaten", () => {
    const p = new Set<string>();
    const pp = new Set<string>();
    expect(isLevelComplete(p, pp)).toBe(true);
  });

  it("returns false when only power pellets remain", () => {
    const p = new Set<string>();
    const pp = new Set(["1,1"]);
    expect(isLevelComplete(p, pp)).toBe(false);
  });
});

// ── tunnelPxShift ─────────────────────────────────────────────────────────────
// When a ghost's logical tile wraps across the horizontal tunnel, its pixel-x
// must jump to the matching edge so the ghost wraps instead of sliding across
// the whole maze (and through walls).

describe("tunnelPxShift", () => {
  const W = COLS * 16; // mazeWidthPx, CELL = 16

  it("pushes px forward a full maze width when wrapping off the LEFT edge (col 0 -> COLS-1)", () => {
    expect(tunnelPxShift(0, COLS - 1, W)).toBe(W);
  });

  it("pulls px back a full maze width when wrapping off the RIGHT edge (COLS-1 -> 0)", () => {
    expect(tunnelPxShift(COLS - 1, 0, W)).toBe(-W);
  });

  it("does not shift on a normal adjacent step", () => {
    expect(tunnelPxShift(5, 6, W)).toBe(0);
    expect(tunnelPxShift(6, 5, W)).toBe(0);
    expect(tunnelPxShift(5, 5, W)).toBe(0);
  });
});
