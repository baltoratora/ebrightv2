import { describe, it, expect } from "vitest";
import { placeFleet, fire, allSunk, aiChooseShot, SIZE, type Board } from "./battleship";

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
