import { describe, it, expect } from "vitest";
import { parseLevel, move, isSolved, LEVELS } from "./sokoban";

// Level 1: "#####\n#@$.#\n#####"
// Row 0: walls (0,0)–(0,4)
// Row 1: wall(1,0) · player(1,1) · crate(1,2) · target(1,3) · wall(1,4)
// Row 2: walls (2,0)–(2,4)

describe("parseLevel", () => {
  const src = "#####\n#@$.#\n#####";
  const level = parseLevel(src);

  it("populates walls correctly", () => {
    expect(level.walls[0][0]).toBe(true);
    expect(level.walls[0][4]).toBe(true);
    expect(level.walls[1][0]).toBe(true);
    expect(level.walls[1][4]).toBe(true);
    expect(level.walls[1][1]).toBe(false); // player cell is not a wall
    expect(level.walls[1][2]).toBe(false); // crate cell is not a wall
    expect(level.walls[1][3]).toBe(false); // target cell is not a wall
  });

  it("populates targets correctly", () => {
    expect(level.targets[1][3]).toBe(true); // '.' is a target
    expect(level.targets[1][1]).toBe(false);
    expect(level.targets[1][2]).toBe(false);
    expect(level.targets[0][0]).toBe(false);
  });

  it("populates crates correctly", () => {
    expect(level.crates).toHaveLength(1);
    expect(level.crates[0]).toEqual({ r: 1, c: 2 });
  });

  it("populates player position correctly", () => {
    expect(level.player).toEqual({ r: 1, c: 1 });
  });

  it("sets width and height correctly", () => {
    expect(level.w).toBe(5);
    expect(level.h).toBe(3);
  });

  it("parses crate-on-target (*) and player-on-target (+) correctly", () => {
    const lvl = parseLevel("#####\n#+*.#\n#####");
    // '+' → player-on-target at (1,1): player=(1,1), targets[1][1]=true
    // '*' → crate-on-target at (1,2): crates=[{r:1,c:2}], targets[1][2]=true
    // '.' → target at (1,3)
    expect(lvl.player).toEqual({ r: 1, c: 1 });
    expect(lvl.targets[1][1]).toBe(true);
    expect(lvl.crates).toHaveLength(1);
    expect(lvl.crates[0]).toEqual({ r: 1, c: 2 });
    expect(lvl.targets[1][2]).toBe(true);
    expect(lvl.targets[1][3]).toBe(true);
  });

  it("all 8 LEVELS parse without error", () => {
    for (const src of LEVELS) {
      expect(() => parseLevel(src)).not.toThrow();
    }
  });
});

describe("move", () => {
  it("move into wall returns moved:false", () => {
    const level = parseLevel("#####\n#@$.#\n#####");
    // Player at (1,1), wall above at (0,1)
    const { moved } = move(level, "up");
    expect(moved).toBe(false);
  });

  it("move into wall on the left returns moved:false", () => {
    const level = parseLevel("#####\n#@$.#\n#####");
    // Wall at (1,0) to the left of player (1,1)
    const { moved } = move(level, "left");
    expect(moved).toBe(false);
  });

  it("plain move to empty cell returns moved:true and updates player", () => {
    // L2: "######\n#@   #\n#    #\n# $  #\n# .  #\n######"
    // Player at (1,1), empty cells to the right
    const level = parseLevel("######\n#@   #\n#    #\n# $  #\n# .  #\n######");
    const { moved, level: next } = move(level, "right");
    expect(moved).toBe(true);
    expect(next.player).toEqual({ r: 1, c: 2 });
  });

  it("move pushes crate to empty cell, updates both positions", () => {
    // L1: player(1,1) → right → pushes crate from (1,2) to (1,3)
    const level = parseLevel("#####\n#@$.#\n#####");
    const { moved, level: next } = move(level, "right");
    expect(moved).toBe(true);
    expect(next.player).toEqual({ r: 1, c: 2 });
    expect(next.crates).toHaveLength(1);
    expect(next.crates[0]).toEqual({ r: 1, c: 3 });
  });

  it("move blocked when crate would hit a wall", () => {
    // After one right move in L1, crate is at (1,3). Another right would push
    // crate to (1,4) which is a wall → blocked.
    const level = parseLevel("#####\n#@$.#\n#####");
    const { level: lv2 } = move(level, "right"); // crate now at (1,3)
    const { moved } = move(lv2, "right");         // crate would hit (1,4)=wall
    expect(moved).toBe(false);
  });

  it("move blocked when crate-behind-crate", () => {
    // "#######\n#@$$  #\n#######"
    // Player(1,1), crate1(1,2), crate2(1,3), empty(1,4), empty(1,5)
    // Moving right: crate1 would move to (1,3) where crate2 is → blocked
    const level = parseLevel("#######\n#@$$  #\n#######");
    const { moved } = move(level, "right");
    expect(moved).toBe(false);
  });

  it("original level is not mutated by move", () => {
    const level = parseLevel("#####\n#@$.#\n#####");
    const origPlayer = { ...level.player };
    const origCrate = { ...level.crates[0] };
    move(level, "right");
    expect(level.player).toEqual(origPlayer);
    expect(level.crates[0]).toEqual(origCrate);
  });
});

describe("isSolved", () => {
  it("returns false when no crates on targets", () => {
    const level = parseLevel("#####\n#@$.#\n#####");
    // Crate at (1,2), target at (1,3) — not placed
    expect(isSolved(level)).toBe(false);
  });

  it("returns true when all crates are on targets", () => {
    // Solve L1 in one move
    const level = parseLevel("#####\n#@$.#\n#####");
    const { level: solved } = move(level, "right");
    // Crate moved to (1,3) which is the target
    expect(isSolved(solved)).toBe(true);
  });

  it("returns false when only some crates are on targets (multi-crate)", () => {
    // L5: 2 crates at (2,2) and (4,4), targets at (2,3) and (3,4)
    const level = parseLevel(
      "########\n#      #\n#@$.   #\n#   .  #\n#   $  #\n#      #\n########",
    );
    // Push crate1 to its target: move right once
    const { level: l2 } = move(level, "right");
    // crate1 now at (2,3) on target, but crate2 still at (4,4) not on any target
    expect(isSolved(l2)).toBe(false);
  });

  it("returns true for * (crate-on-target) initial state", () => {
    // A level where crate starts on target
    const level = parseLevel("#####\n#@*  #\n#####");
    // crate at (1,2) on target[1][2]=true — already solved!
    expect(isSolved(level)).toBe(true);
  });
});
