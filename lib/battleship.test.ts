import { describe, it, expect } from "vitest";
import {
  placeFleet,
  emptyBoard,
  allPlaced,
  tryPlaceShip,
  fire,
  allSunk,
  aiChooseShot,
  aiEasyShot,
  aiHardShot,
  SIZE,
  type Board,
} from "./battleship";

describe("placeFleet", () => {
  it("places 5 ships, 17 cells, no overlap, in bounds", () => {
    const b = placeFleet();
    expect(b.ships).toHaveLength(5);
    const total = b.ships.reduce((a, s) => a + s.size, 0);
    expect(total).toBe(17);
    let occupied = 0;
    const seen = new Set<string>();
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (b.grid[r][c] !== -1) {
          occupied++;
          expect(seen.has(`${r},${c}`)).toBe(false);
          seen.add(`${r},${c}`);
        }
    expect(occupied).toBe(17);
  });
});

describe("fire", () => {
  it("reports hit/miss/sunk and ignores repeats", () => {
    const b = placeFleet();
    const ship = b.ships[0];
    const [r, c] = ship.cells[0];
    const first = fire(b, r, c)!;
    expect(first.result).toBe("hit");
    expect(fire(b, r, c)).toBeNull(); // can't fire twice

    // a guaranteed miss: find an empty cell
    let miss: [number, number] | null = null;
    for (let rr = 0; rr < SIZE && !miss; rr++)
      for (let cc = 0; cc < SIZE && !miss; cc++)
        if (b.grid[rr][cc] === -1) miss = [rr, cc];
    expect(fire(b, miss![0], miss![1])!.result).toBe("miss");

    // sink the first ship
    let sunk: string | null = null;
    for (const [rr, cc] of ship.cells) {
      const res = fire(b, rr, cc);
      if (res?.sunk) sunk = res.sunk;
    }
    expect(sunk).toBe(ship.name);
  });
});

describe("allSunk", () => {
  it("is true only after every ship is destroyed", () => {
    const b = placeFleet();
    expect(allSunk(b)).toBe(false);
    for (const s of b.ships) for (const [r, c] of s.cells) fire(b, r, c);
    expect(allSunk(b)).toBe(true);
  });
});

describe("aiChooseShot", () => {
  it("fires a queued target first when it's unshot", () => {
    const b = placeFleet();
    const mem = { queue: [[4, 4]] as [number, number][] };
    expect(aiChooseShot(b.shots, mem)).toEqual([4, 4]);
  });
  it("always returns an unshot cell", () => {
    const b = placeFleet();
    // shoot everything except one cell
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!(r === 9 && c === 9)) fire(b, r, c);
    expect(aiChooseShot(b.shots, { queue: [] })).toEqual([9, 9]);
  });
});

describe("emptyBoard / allPlaced", () => {
  it("emptyBoard has 5 ships with no cells placed", () => {
    const b = emptyBoard();
    expect(b.ships).toHaveLength(5);
    expect(b.ships.every((s) => s.cells.length === 0)).toBe(true);
    expect(allPlaced(b)).toBe(false);
  });
  it("allPlaced is true after placeFleet", () => {
    expect(allPlaced(placeFleet())).toBe(true);
  });
});

describe("tryPlaceShip", () => {
  it("places Destroyer horizontally and returns true", () => {
    const b = emptyBoard();
    const ok = tryPlaceShip(b, 4, 0, 0, true); // Destroyer(2) at row0,col0 H
    expect(ok).toBe(true);
    expect(b.grid[0][0]).toBe(4);
    expect(b.grid[0][1]).toBe(4);
    expect(b.ships[4].cells).toHaveLength(2);
  });
  it("rejects out-of-bounds placement", () => {
    const b = emptyBoard();
    expect(tryPlaceShip(b, 0, 0, 9, true)).toBe(false); // Carrier(5) from col9 H → OOB
  });
  it("rejects overlapping placements", () => {
    const b = emptyBoard();
    tryPlaceShip(b, 4, 0, 0, true); // Destroyer at (0,0)-(0,1)
    expect(tryPlaceShip(b, 3, 0, 0, false)).toBe(false); // Submarine(3) at col0 overlaps
  });
  it("re-placing the same ship clears its old cells", () => {
    const b = emptyBoard();
    tryPlaceShip(b, 4, 0, 0, true); // Destroyer at (0,0)-(0,1)
    tryPlaceShip(b, 4, 5, 5, false); // move Destroyer to (5,5)-(6,5)
    expect(b.grid[0][0]).toBe(-1);
    expect(b.grid[5][5]).toBe(4);
    expect(b.grid[6][5]).toBe(4);
  });
  it("allPlaced is true after all 5 ships placed", () => {
    const b = emptyBoard();
    tryPlaceShip(b, 0, 0, 0, true); // Carrier(5)
    tryPlaceShip(b, 1, 1, 0, true); // Battleship(4)
    tryPlaceShip(b, 2, 2, 0, true); // Cruiser(3)
    tryPlaceShip(b, 3, 3, 0, true); // Submarine(3)
    tryPlaceShip(b, 4, 4, 0, true); // Destroyer(2)
    expect(allPlaced(b)).toBe(true);
  });
});

describe("aiEasyShot", () => {
  it("returns an unshot cell", () => {
    const b = placeFleet();
    const [r, c] = aiEasyShot(b.shots);
    expect(b.shots[r][c]).toBeNull();
  });
  it("targets the only remaining cell", () => {
    const b = placeFleet();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!(r === 3 && c === 7)) fire(b, r, c);
    expect(aiEasyShot(b.shots)).toEqual([3, 7]);
  });
});

describe("aiHardShot", () => {
  it("returns an unshot cell", () => {
    const b = placeFleet();
    const [r, c] = aiHardShot(b);
    expect(b.shots[r][c]).toBeNull();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(SIZE);
    expect(c).toBeLessThan(SIZE);
  });
  it("targets the only remaining cell", () => {
    const b = placeFleet();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!(r === 9 && c === 9)) fire(b, r, c);
    expect(aiHardShot(b)).toEqual([9, 9]);
  });
});
