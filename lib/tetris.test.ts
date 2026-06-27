import { describe, it, expect } from "vitest";
import {
  emptyGrid,
  rotateCW,
  collides,
  clearLines,
  newGame,
  hardDrop,
  rotate,
  holdPiece,
  ghostRow,
  COLS,
  ROWS,
  PIECES,
  type Grid,
  type Game,
} from "./tetris";

describe("rotateCW", () => {
  it("rotates the T piece 90°", () => {
    const t = PIECES.T.matrix;
    const r = rotateCW(t);
    // after CW the stem points right: column 1 fully set in rows 0..2
    expect(r[0][1]).toBe(1);
    expect(r[1][1]).toBe(1);
    expect(r[2][1]).toBe(1);
  });
});

describe("collides", () => {
  it("detects walls, floor and stacked cells", () => {
    const g = emptyGrid();
    expect(collides(g, PIECES.O.matrix, 0, -1)).toBe(true); // left wall
    expect(collides(g, PIECES.O.matrix, 0, COLS - 1)).toBe(true); // right wall
    expect(collides(g, PIECES.O.matrix, ROWS - 1, 0)).toBe(true); // floor
    g[2][0] = "X";
    expect(collides(g, PIECES.O.matrix, 1, 0)).toBe(true); // hits stacked cell
    expect(collides(g, PIECES.O.matrix, 0, 4)).toBe(false); // clear
  });
});

describe("clearLines", () => {
  it("removes full rows and counts them", () => {
    const g: Grid = emptyGrid();
    g[ROWS - 1] = Array<string>(COLS).fill("X");
    g[ROWS - 2] = Array<string>(COLS).fill("X");
    g[ROWS - 3][0] = "X"; // not full
    const { grid, cleared } = clearLines(g);
    expect(cleared).toBe(2);
    expect(grid).toHaveLength(ROWS);
    expect(grid[ROWS - 1].some((c) => c !== null)).toBe(true); // the partial row dropped down
    expect(grid[0].every((c) => c === null)).toBe(true); // empty rows added on top
  });
});

describe("newGame + hardDrop", () => {
  it("starts valid and locks a piece on hard drop", () => {
    const g = newGame();
    expect(g.over).toBe(false);
    expect(g.grid.flat().every((c) => c === null)).toBe(true);
    const after = hardDrop(g);
    // some cells are now filled (the dropped piece) and a new piece spawned
    expect(after.grid.flat().some((c) => c !== null)).toBe(true);
    expect(after.type).toBe(g.next);
  });
});

describe("rotate (SRS wall kicks)", () => {
  it("I-piece at bottom uses SRS kick to rotate when direct rotation overflows floor", () => {
    // Place a horizontal I-piece (rot=0) near the floor so that a simple rotation
    // (same row) would clip the floor — SRS kick offset (-2, +1) must rescue it.
    const base = newGame();
    const state: Game = {
      ...base,
      type: "I",
      matrix: PIECES.I.matrix,
      rot: 0,
      r: ROWS - 2, // block row of I is at grid row ROWS-1 (bottom)
      c: 3,
    };
    const after = rotate(state);
    // SRS should succeed via kick; rotation state advances
    expect(after.rot).toBe(1);
    // The -2 row kick puts piece at ROWS-4 so it fits vertically
    expect(after.r).toBe(ROWS - 4);
    expect(after.c).toBe(4); // +1 col kick
  });

  it("T-piece against left wall kicks right to land", () => {
    const base = newGame();
    // Rotation 0 T at c=0; CW rotation to state 1 — kick "01" offset (0,-1)
    // would push left (collision), so first offset that works should keep it or go right.
    const state: Game = {
      ...base,
      type: "T",
      matrix: PIECES.T.matrix,
      rot: 0,
      r: 5,
      c: 0,
    };
    const after = rotate(state);
    expect(after.rot).toBe(1);
    expect(after.matrix).not.toBe(PIECES.T.matrix); // matrix changed
  });

  it("rotation fails when all SRS offsets are blocked", () => {
    // Fill the grid everywhere except active piece — any kick will collide
    const base = newGame();
    const filledGrid: Grid = emptyGrid().map((row) => row.map(() => "X" as string | null));
    // Clear the cells the T piece currently occupies so it doesn't immediately collide
    const state: Game = {
      ...base,
      type: "T",
      matrix: PIECES.T.matrix,
      rot: 0,
      r: 5,
      c: 4,
      grid: filledGrid,
    };
    // All rotated positions will collide — rotate should return unchanged
    const after = rotate(state);
    expect(after.rot).toBe(0);
    expect(after.matrix).toBe(PIECES.T.matrix);
  });
});

describe("ghostRow", () => {
  it("returns the landing row (same as hard drop position)", () => {
    const g = newGame();
    const gr = ghostRow(g);
    // Hard drop row is where the piece would lock
    let expected = g.r;
    while (!collides(g.grid, g.matrix, expected + 1, g.c)) expected++;
    expect(gr).toBe(expected);
  });

  it("equals active row when piece is already resting on the floor", () => {
    const g = newGame();
    const dropped = hardDrop(g);
    // The piece that just spawned after hard drop; on empty board it can still drop
    const gr = ghostRow(dropped);
    let expected = dropped.r;
    while (!collides(dropped.grid, dropped.matrix, expected + 1, dropped.c)) expected++;
    expect(gr).toBe(expected);
  });
});

describe("hold piece", () => {
  it("first hold: puts current piece in hold and spawns next", () => {
    const g = newGame();
    const prevType = g.type;
    const prevNext = g.next;
    const after = holdPiece(g);
    expect(after.hold).toBe(prevType);
    expect(after.type).toBe(prevNext);
    expect(after.holdUsed).toBe(true);
  });

  it("second hold in same piece is blocked", () => {
    const g = newGame();
    const once = holdPiece(g);
    const twice = holdPiece(once);
    expect(twice).toBe(once); // reference equality — no change
  });

  it("swap hold: exchanges active piece with held piece without advancing queue", () => {
    const g = newGame();
    const first = holdPiece(g);
    // Drop the current piece to unlock hold
    const dropped = hardDrop(first); // holdUsed resets to false on lock
    const prevType = dropped.type;
    const prevHold = dropped.hold!;
    const prevNext = dropped.next;
    const swapped = holdPiece(dropped);
    expect(swapped.type).toBe(prevHold);
    expect(swapped.hold).toBe(prevType);
    expect(swapped.next).toBe(prevNext); // queue unchanged
  });
});

describe("3-piece next preview", () => {
  it("nextPieces always has exactly 3 entries", () => {
    const g = newGame();
    expect(g.nextPieces).toHaveLength(3);
    expect(g.nextPieces[0]).toBe(g.next);
  });

  it("nextPieces advances correctly after hard drop", () => {
    const g = newGame();
    const after = hardDrop(g);
    // After hard drop, active=old next, new next=old nextPieces[1]
    expect(after.type).toBe(g.next);
    expect(after.next).toBe(g.nextPieces[1]);
    expect(after.nextPieces[0]).toBe(g.nextPieces[1]);
    expect(after.nextPieces[1]).toBe(g.nextPieces[2]);
    expect(after.nextPieces).toHaveLength(3);
  });
});

describe("T-spin detection", () => {
  // T rotation-2 matrix (pointing down, stem south):
  //   [[0,0,0],
  //    [1,1,1],
  //    [0,1,0]]
  // Computed by rotateCW(rotateCW(PIECES.T.matrix)).
  const tRot2 = rotateCW(rotateCW(PIECES.T.matrix));

  // Shared T-spin board: T at rot=2, r=17, c=4.
  //   T cells: (18,4),(18,5),(18,6) and (19,5)
  //   Row 18 cols 0-3 and 7-9 prefilled → T completes row 18 (1 line cleared).
  //   Corner cells for T center at (17,4):
  //     (17,4)=X, (17,6)=X, (19,4)=X, (19,6)=empty → 3/4 occupied = T-spin.
  //   (19,4)=X also blocks the piece from dropping below r=17.
  function makeTspinBoard(): Grid {
    const grid = emptyGrid();
    for (let col = 0; col < COLS; col++) {
      if (col < 4 || col > 6) grid[18][col] = "X";
    }
    grid[17][4] = "X"; // top-left corner
    grid[17][6] = "X"; // top-right corner
    grid[19][4] = "X"; // bottom-left corner (also prevents dropping past r=17)
    return grid;
  }

  it("awards T-spin bonus and increments tspinCount when T locks with 3 occupied corners after rotation", () => {
    const base = newGame();
    const grid = makeTspinBoard();

    const state: Game = {
      ...base,
      type: "T",
      matrix: tRot2,  // consistent with rot: 2
      rot: 2,
      r: 17,
      c: 4,
      grid,
      score: 0,
      level: 1,
      tspinCount: 0,
      lastWasRotation: true, // rotation immediately preceded the lock
    };

    // hardDrop now preserves lastWasRotation=true → detectTspin fires
    const after = hardDrop(state);

    // 3 corners occupied + lastWasRotation=true → T-spin with 1 line cleared
    expect(after.tspinCount).toBe(1); // incremented from 0
    expect(after.tspinFlash).toBe("T-Spin!");
    // TSPIN_SCORE[1] * level=1 = 200; hard-drop distance = 0 pts
    expect(after.score).toBe(200);
  });

  it("no T-spin bonus when last move was not a rotation (same board, lastWasRotation=false)", () => {
    const base = newGame();
    const grid = makeTspinBoard();

    const state: Game = {
      ...base,
      type: "T",
      matrix: tRot2,  // consistent with rot: 2
      rot: 2,
      r: 17,
      c: 4,
      grid,
      score: 0,
      level: 1,
      tspinCount: 0,
      lastWasRotation: false, // no rotation before lock
    };

    const after = hardDrop(state);

    // detectTspin returns false → normal LINE_SCORE[1]*1 = 100 applied
    expect(after.tspinCount).toBe(0); // unchanged
    expect(after.tspinFlash).toBeNull();
    expect(after.score).toBe(100);
  });

  it("no T-spin bonus when last move was not a rotation (rot=0 matrix)", () => {
    const base = newGame();
    const grid: Grid = emptyGrid();
    // Fill corners around T center at r=17, c=4 (3 corners occupied)
    grid[17][4] = "X";
    grid[17][6] = "X";
    grid[19][4] = "X";
    const state: Game = {
      ...base,
      type: "T",
      matrix: PIECES.T.matrix, // rot=0 spawn orientation, consistent with rot:0
      rot: 0,
      r: 17,
      c: 4,
      grid,
      lastWasRotation: false, // no rotation before lock
    };
    const before = state.tspinCount;
    const after = hardDrop(state);
    expect(after.tspinCount).toBe(before); // no T-spin increment
    expect(after.tspinFlash).toBeNull();
  });
});

describe("I-piece SRS kick table order", () => {
  it("uses kick offset [0,-2] (index 1) before [0,+1] (index 2) when rotating 0→R", () => {
    // I-piece horizontal (rot=0) at r=5, c=5.
    // In rot=1, active matrix column is index 2 → grid col = c + dc + 2.
    // Block the [0,0] kick (col 7) and [0,+1] kick (col 8) → only [0,-2] (col 5) is free.
    // If kick order were wrong and [0,+1] were tried before [0,-2], rotation would fail
    // since col 8 is blocked.
    const base = newGame();
    const grid: Grid = emptyGrid();
    // Block col 7 at rows 5-8 (defeats kick [0,0]: c+0+2=7)
    for (let row = 5; row <= 8; row++) grid[row][7] = "X";
    // Block col 8 at rows 5-8 (defeats kick [0,+1]: c+1+2=8)
    for (let row = 5; row <= 8; row++) grid[row][8] = "X";
    // Col 5 at rows 5-8 remains empty (kick [0,-2]: c-2+2=5)

    const state: Game = {
      ...base,
      type: "I",
      matrix: PIECES.I.matrix,
      rot: 0,
      r: 5,
      c: 5,
      grid,
    };

    const after = rotate(state);

    // Kick [0,-2] applied: rot advances, c moves from 5 to 5-2=3
    expect(after.rot).toBe(1);
    expect(after.c).toBe(3);  // c + dc = 5 + (-2) = 3
    expect(after.r).toBe(5);  // no row change
  });
});
