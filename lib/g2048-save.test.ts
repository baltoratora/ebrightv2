import { expect, it } from "vitest";
import { read2048Save } from "./g2048-save";

const save = { grid: [[2, 4, 8, 16], [0, 0, 2, 4], [0, 0, 0, 0], [0, 0, 0, 0]], score: 20, best: 40, over: false, won: false, winSeen: false };
it("recovers a valid 2048 round", () => { expect(read2048Save(save)).toEqual(save); });
it("rejects invalid board dimensions, tile values and metadata", () => {
  expect(read2048Save({ ...save, grid: [[2]] })).toBeNull();
  expect(read2048Save({ ...save, grid: [[3, 0, 0, 0], ...save.grid.slice(1)] })).toBeNull();
  expect(read2048Save({ ...save, score: -1 })).toBeNull();
  expect(read2048Save({ ...save, won: "yes" })).toBeNull();
});
